"""
Outbound email gateway for external systems to trigger emails through DigiTrack.

Two versions are live side by side:

- send_email() — the original, deployed endpoint. A separate external
  application already calls this in production with its existing
  password-based contract. Left byte-for-byte as originally shipped: do NOT
  change its signature, auth, or behavior — that would break that caller
  with no warning. It stays live only until every caller has migrated to v2,
  at which point it can be retired.
- send_email_v2() — the endpoint all new work goes into (proper API-key +
  role auth, cc, group_id, attachments, rate limiting, async queued
  delivery). New integrations should use this one; existing callers migrate
  to it on their own schedule, not by this endpoint being changed under them.

send_email_v2() only validates and queues the email into JH Emails (status
"0"); it does not send inline. Actual delivery happens in
flush_pending_emails(), a scheduled job (registered in hooks.py, every 10
minutes) that sends every gateway row still pending. This keeps the caller's
request fast regardless of mail-server latency, instead of blocking on live
SMTP delivery. send_email() (v1) sends inline, synchronously, as it always
has.

group_id (v2 only) picks the outgoing Email Account: it's looked up in Email
Sending Configuration (group_id -> Email Account) at send time, so e.g. a
"sales" caller's mail visibly comes from Sales' own account instead of
DigiTrack's default. Omit it to fall back to DigiTrack's default outgoing
Email Account. A group_id with no matching configuration is rejected outright
(see send_email_v2()) rather than silently falling back, so a caller's typo
doesn't result in mail going out from the wrong account.
"""

import base64
import hmac
import json
import os

import frappe
from frappe import _
from frappe.utils import add_days, now_datetime, sanitize_html, time_diff_in_seconds, validate_email_address
from frappe.utils.password import get_decrypted_password
from frappe.query_builder import DocType
from frappe.rate_limiter import rate_limit
from frappe.utils.file_manager import save_file

from jh_digitrack.api.helpers.email import resolve_group_sender

MAX_RECIPIENTS = 20
MAX_SUBJECT_LENGTH = 200
MAX_ATTACHMENTS = 5
MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024  # 20 MB across all attachments in one send
SOURCE_DOCUMENT = "Email Gateway"
EMAIL_LOG_RETENTION_DAYS = 30
STUCK_FAILURE_AFTER_HOURS = 48
FLUSH_BATCH_SIZE = 500


# TEMPORARY — allow_guest is enabled and the role check below is disabled ONLY
# for local Postman testing. This must be reverted (allow_guest=False and the
# role check restored) before this touches any shared/deployed environment —
# as-is, anyone who can reach this URL can send email through it, no auth.
#
# NOTE: this is v1, kept exactly as originally shipped and already deployed —
# a separate external application depends on this exact contract. Do not
# "fix" or extend it here; all new work goes into send_email_v2() below.
@frappe.whitelist(allow_guest=True, methods=["POST"])
def send_email(to, subject, body, password, sender):
    """
    Send an email on behalf of an authorized external integration.

    Params:
    - to (str): recipient address, or multiple addresses separated by commas
    - subject (str): email subject line
    - body (str): email body (HTML allowed; sanitized before sending)
    - password (str): shared password, must match JH Digitrack Settings > Password
    - sender (str): email id of the person/system triggering this send, recorded in JH Emails
    """
    # if "JH Email Integration" not in frappe.get_roles(frappe.session.user):
    #     frappe.throw(_("Not permitted to use the email gateway."), frappe.PermissionError)

    stored_password = get_decrypted_password(
        "JH Digitrack Settings", "JH Digitrack Settings", fieldname="password", raise_exception=False
    )
    if not stored_password or not hmac.compare_digest(password or "", stored_password):
        return {"status": "Failure", "message": "Password is not correct."}

    if not to or not subject or not body or not sender:
        return {"status": "Failure", "message": "to, subject, body and sender are all required."}

    recipients = [address.strip() for address in to.split(",") if address.strip()]
    if not recipients:
        return{"status": "Failure", "message": "At least one recipient is required."}
    if len(recipients) > MAX_RECIPIENTS:
        frappe.throw(_("Cannot send to more than {0} recipients in a single request.").format(MAX_RECIPIENTS))
    for address in recipients:
        validate_email_address(address, throw=True)
    validate_email_address(sender, throw=True)

    subject = subject.strip()[:MAX_SUBJECT_LENGTH]
    body = sanitize_html(body)

    email_doc = frappe.new_doc("JH Emails")
    email_doc.source_document = "Email Gateway"
    email_doc.date = frappe.utils.now()
    row = email_doc.append("emails", {
        "to": to,
        "subject": subject,
        "body": body,
        "sender": sender,
        "status": "0",
    })
    email_doc.insert(ignore_permissions=True)
    frappe.db.commit()

    try:
        frappe.sendmail(
            recipients=recipients,
            subject=subject,
            message=body,
            now=True,
        )
    except Exception:
        frappe.log_error(message=frappe.get_traceback(), title="Error sending email in email_gateway")
        return {"status": "Failure", "message": "Email could not be sent.", "recipients": recipients}

    row.status = "1"
    email_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "success", "message": "Email sent.", "recipients": recipients}


@frappe.whitelist(methods=["POST"])
@rate_limit(limit=60, seconds=60)
def send_email_v2(to, subject, body, sender, cc=None, group_id=None, attachments=None):
    """
    Queue an email for delivery on behalf of an authorized external
    integration. Delivery happens on the next flush_pending_emails run, not
    inline in this request.

    Callers authenticate with a Frappe API key/secret belonging to a
    dedicated integration user that holds the "JH Email Integration" role.
    The sender address is never caller-controlled — only recipient(s),
    cc(s), subject and body are accepted from the caller. Which outgoing
    Email Account the mail actually goes out from is chosen via group_id,
    never by a raw address the caller supplies, so a caller can't spoof an
    arbitrary From.

    Params:
    - to (str): recipient address, or multiple addresses separated by commas.
      Must be bare addresses ("a@x.com,b@x.com") - a display name containing
      a comma ("Doe, John <j@d.com>") will be split into garbage tokens.
    - subject (str): email subject line
    - body (str): email body (HTML allowed; sanitized before sending)
    - sender (str): email id of the person/system triggering this send, recorded in JH Emails
    - cc (str, optional): cc address, or multiple addresses separated by commas. Same bare-address constraint as `to`.
    - group_id (str, optional): selects the outgoing Email Account via Email
      Sending Configuration; falls back to the default outgoing Email
      Account if omitted
    - attachments (list[dict], optional): up to MAX_ATTACHMENTS files, each
      {"filename": "invoice.pdf", "content": "<base64>"}. May also be passed
      as a JSON-encoded string. Files are stored as private Frappe File docs
      attached to the JH Emails log and validated the same way as any other
      upload (extension whitelist + magic-byte check, see
      jh_digitrack.api.helpers.file_validation) before being queued.
    """
    if "JH Email Integration" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Not permitted to use the email gateway."), frappe.PermissionError)

    if not to or not subject or not body or not sender:
        return {"status": "Failure", "message": "to, subject, body and sender are all required."}

    recipients = [address.strip() for address in to.split(",") if address.strip()]
    if not recipients:
        return {"status": "Failure", "message": "At least one recipient is required."}
    if len(recipients) > MAX_RECIPIENTS:
        frappe.throw(_("Cannot send to more than {0} recipients in a single request.").format(MAX_RECIPIENTS))
    for address in recipients:
        validate_email_address(address, throw=True)
    validate_email_address(sender, throw=True)

    cc_recipients = [address.strip() for address in cc.split(",") if address.strip()] if cc else []
    if len(cc_recipients) > MAX_RECIPIENTS:
        frappe.throw(_("Cannot cc more than {0} recipients in a single request.").format(MAX_RECIPIENTS))
    for address in cc_recipients:
        validate_email_address(address, throw=True)

    if group_id and not frappe.db.exists("Email Sending Configuration", {"group_id": group_id}):
        frappe.throw(_("No Email Sending Configuration found for group_id {0}.").format(group_id))

    parsed_attachments = _parse_attachments(attachments)

    subject = subject.strip()[:MAX_SUBJECT_LENGTH]
    body = sanitize_html(body)

    email_doc = frappe.new_doc("JH Emails")
    email_doc.source_document = SOURCE_DOCUMENT
    email_doc.date = frappe.utils.now()
    row = email_doc.append("emails", {
        "to": to,
        "cc": ", ".join(cc_recipients),
        "group_id": group_id,
        "subject": subject,
        "body": body,
        "sender": sender,
        "status": "0",
    })
    email_doc.insert(ignore_permissions=True)

    if parsed_attachments:
        file_ids = []
        for filename, content in parsed_attachments:
            file_doc = save_file(filename, content, "JH Emails", email_doc.name, is_private=1)
            file_ids.append(file_doc.name)
        row.attachments = json.dumps(file_ids)
        email_doc.save(ignore_permissions=True)

    return {
        "status": "success",
        "message": "Email queued for delivery.",
        "recipients": recipients,
        "cc": cc_recipients,
        "group_id": group_id,
        "attachments": len(parsed_attachments),
    }


def _parse_attachments(attachments):
    """
    Validate and decode the caller-supplied attachments list into
    (filename, raw_bytes) tuples. Accepts either an already-parsed list or a
    JSON-encoded string (form-encoded POST bodies can't carry real lists).

    Per-file type/signature validation happens later, automatically, via the
    File doctype's before_insert hook (jh_digitrack.api.helpers.file_validation)
    when eac
    ment is saved - this function only enforces count/size
    limits and decodes the base64 payload.
    """
    if not attachments:
        return []

    if isinstance(attachments, str):
        try:
            attachments = json.loads(attachments)
        except ValueError:
            frappe.throw(_("attachments must be a JSON-encoded list of {filename, content} objects."))

    if not isinstance(attachments, list):
        frappe.throw(_("attachments must be a list of {filename, content} objects."))

    if len(attachments) > MAX_ATTACHMENTS:
        frappe.throw(_("Cannot attach more than {0} files in a single request.").format(MAX_ATTACHMENTS))

    parsed = []
    total_size = 0
    for entry in attachments:
        if not isinstance(entry, dict) or not entry.get("filename") or not entry.get("content"):
            frappe.throw(_("Each attachment requires a filename and base64-encoded content."))

        filename = os.path.basename(frappe.utils.strip(entry["filename"]))
        if not filename:
            frappe.throw(_("Attachment filename cannot be empty."))
        try:
            content = base64.b64decode(entry["content"], validate=True)
        except Exception:
            frappe.throw(_("Attachment {0} does not contain valid base64 content.").format(filename))

        total_size += len(content)
        if total_size > MAX_TOTAL_ATTACHMENT_SIZE:
            frappe.throw(
                _("Total attachment size cannot exceed {0} MB.").format(MAX_TOTAL_ATTACHMENT_SIZE // (1024 * 1024))
            )

        parsed.append((filename, content))

    return parsed


def flush_pending_emails():
    """
    Scheduler entry point (every 10 minutes). Sends up to FLUSH_BATCH_SIZE
    gateway emails still queued at status "0" and flips each to "1" on
    success (any remainder past the batch size waits for the next run,
    instead of one tick pulling and IN-matching against the full backlog). A
    row that fails to send stays at "0" and is retried on the next run -
    unless it's already been stuck at "0" for STUCK_FAILURE_AFTER_HOURS (a
    permanently bad recipient or oversized attachment isn't going to start
    working on retry #300), in which case it's given up on and flipped to the
    terminal status "2" instead. A "2" row can still be retried manually via
    email_log.resend_email().

    Only send_email_v2() queues through this path - v1's send_email() sends
    inline and only ever briefly touches status "0" mid-request, so this job
    naturally leaves it alone (except for retrying a v1 send that failed
    inline and was left stuck at "0", which is a harmless bonus, not
    something this job specifically targets).

    Joins straight to JH Emails for the source_document filter (and pins
    parenttype) instead of pulling every gateway parent name into Python
    first and IN-matching Scheduled Emails against that list, which doesn't
    scale once the parent table has more than a few thousand rows.
    """
    ScheduledEmails = DocType("Scheduled Emails")
    JHEmails = DocType("JH Emails")

    pending = (
        frappe.qb.from_(ScheduledEmails)
        .join(JHEmails)
        .on(JHEmails.name == ScheduledEmails.parent)
        .select(
            ScheduledEmails.name,
            ScheduledEmails.to,
            ScheduledEmails.cc,
            ScheduledEmails.subject,
            ScheduledEmails.body,
            ScheduledEmails.group_id,
            ScheduledEmails.attachments,
            ScheduledEmails.creation,
        )
        .where(
            (ScheduledEmails.status == "0")
            & (ScheduledEmails.parenttype == "JH Emails")
            & (JHEmails.source_document == SOURCE_DOCUMENT)
        )
        .limit(FLUSH_BATCH_SIZE)
    ).run(as_dict=True)
    if not pending:
        return

    now = now_datetime()
    for row in pending:
        if time_diff_in_seconds(now, row.creation) > STUCK_FAILURE_AFTER_HOURS * 3600:
            frappe.db.set_value("Scheduled Emails", row.name, "status", "2")
            frappe.db.commit()
            continue

        try:
            file_ids = json.loads(row.attachments) if row.attachments else []
            frappe.sendmail(
                sender=resolve_group_sender(row.group_id),
                expose_recipients="header",
                recipients=[address.strip() for address in row.to.split(",") if address.strip()],
                cc=[address.strip() for address in row.cc.split(",") if address.strip()] if row.cc else None,
                subject=row.subject,
                message=row.body,
                attachments=[{"fid": fid} for fid in file_ids] or None,
                now=True,
            )
            frappe.db.set_value("Scheduled Emails", row.name, "status", "1")
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            frappe.log_error(message=frappe.get_traceback(), title="Error flushing pending email in email_gateway")


def purge_old_emails():
    """
    Scheduler entry point (daily). Deletes JH Emails log entries older than
    EMAIL_LOG_RETENTION_DAYS, regardless of source_document, so the Email List
    doesn't grow unbounded. Child Scheduled Emails rows are removed
    automatically along with their parent.

    By this age, every gateway-sourced row has long since been flipped to a
    terminal status ("1" Sent or "2" Failed - see STUCK_FAILURE_AFTER_HOURS
    above), so those are discarded quietly. A row still stuck at "0" here
    was queued outside the gateway's own retry/give-up cycle (e.g. via
    helpers.send_notification_email, which never revisits a failed send) and
    genuinely never resolved - it's logged before being discarded too, so a
    send that silently never happened doesn't vanish with zero trace.
    """
    cutoff = add_days(now_datetime(), -EMAIL_LOG_RETENTION_DAYS)
    old_parents = frappe.get_all("JH Emails", filters={"creation": ["<", cutoff]}, pluck="name")
    if not old_parents:
        return

    unresolved = frappe.get_all(
        "Scheduled Emails",
        filters={"parent": ["in", old_parents], "status": "0"},
        fields=["parent", "name", "to", "subject"],
    )
    if unresolved:
        frappe.log_error(
            message="\n".join(f"{row.parent}/{row.name}: to={row.to!r} subject={row.subject!r}" for row in unresolved),
            title=f"Purging {len(unresolved)} email log row(s) still unresolved after {EMAIL_LOG_RETENTION_DAYS} days",
        )

    for name in old_parents:
        frappe.delete_doc("JH Emails", name, force=1, ignore_permissions=True)

    frappe.db.commit()
