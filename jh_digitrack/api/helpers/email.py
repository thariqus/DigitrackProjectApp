"""
Shared helper for sending an internally-generated notification email and
logging it to JH Emails.

For internal callers only (tasks, property notifications, etc.) that build
their own trusted HTML via the app's own templates. External-input paths
(e.g. jh_digitrack.api.email_gateway) must still validate/sanitize their own
input before sending - this helper does not do that on their behalf.
"""

import frappe
from frappe.utils import time_diff_in_seconds

# Scheduled Emails stores status "0" (not yet sent), "1" (sent), or "2"
# (gateway gave up retrying - see STUCK_FAILURE_AFTER_HOURS in
# email_gateway.py). A "0" row older than one full flush cycle
# (flush_pending_emails runs every 10 minutes - see email_gateway.py /
# hooks.py) has already been retried and is still stuck, so callers display
# it as "Failed" even before it's old enough to be flipped to "2" - e.g. a
# row queued outside the gateway's own retry cycle (helpers.send_notification_email
# failures) stays at "0" forever and is never flipped to "2" by anything. A
# "0" row still within that window is genuinely "Pending".
STUCK_AFTER_SECONDS = 15 * 60

# Written to a Scheduled Emails row's "to" field by send_notification_email()
# when it's called with no valid recipient address at all (e.g. an Employee
# ID login with no email on their User record). email_log.resend_email()
# checks for this literal value to avoid attempting a pointless send against
# it - there's no real address behind it.
NO_EMAIL_PLACEHOLDER = "No Email Found to Send"

# Shared subject/body templates for every module, so email text lives in data
# (editable from the desk) instead of in code. Looked up by template name.
EMAIL_TEMPLATE_DOCTYPE = "JH Email Template"


def get_display_status(raw_status, creation, now):
    """Shared Sent/Pending/Failed classification for a Scheduled Emails row.

    Used by both the per-email list (email_log.py) and the dashboard
    aggregate stats (email_stats.py) so the two views never disagree about
    which sends are "Failed".
    """
    if str(raw_status) == "1":
        return "Sent"
    if str(raw_status) == "2":
        return "Failed"
    if time_diff_in_seconds(now, creation) > STUCK_AFTER_SECONDS:
        return "Failed"
    return "Pending"


def resolve_group_sender(group_id):
    """
    Resolve a caller-supplied group_id to the outgoing Email Account address
    configured for it in Email Sending Configuration (e.g. so a "sales" send
    goes out from Sales' own account instead of DigiTrack's default).

    Returns None if no group_id was given, or none of its records match -
    pass the result straight to frappe.sendmail(sender=...), which falls
    back to the default outgoing Email Account whenever sender is falsy.
    """
    if not group_id:
        return None

    email_account = frappe.db.get_value("Email Sending Configuration", {"group_id": group_id}, "email")
    if not email_account:
        return None

    # default_sender formats as "Account Name <email_id>" - matches what
    # frappe.sendmail() itself falls back to when no sender is given at all,
    # so a group-routed send looks the same as a normal one, just from a
    # different account.
    return frappe.get_cached_doc("Email Account", email_account).default_sender


def send_notification_email(source_document, recipients, subject, message, cc=None, sender=None):
    """
    Send an email and log it to JH Emails. Never raises - logs the traceback
    and returns False on failure, so a mail-server hiccup doesn't take down
    the caller.

    Params:
    - source_document (str): recorded on the JH Emails log for traceability
    - recipients (str | list[str]): primary recipient(s)
    - subject (str)
    - message (str): HTML body (already trusted/generated internally)
    - cc (str | list[str], optional): cc recipient(s). Sent, but not persisted
      on the JH Emails log row (the Scheduled Emails child table has no cc field)
    - sender (str, optional): recorded on the log; defaults to the session user

    Returns True on success, False on failure. Still logs to JH Emails (as an
    immediate "Failed" row, "to" showing "No Email Found to Send") when the
    recipient has no email at all - e.g. an Employee ID login with no email
    on their User record - instead of silently returning with no trace, since
    the sender still needs to see the attempt on their own Email Dashboard.
    """
    recipient_list = recipients if isinstance(recipients, list) else [recipients]
    recipient_list = [r for r in recipient_list if r]

    cc_list = None
    if cc:
        cc_list = cc if isinstance(cc, list) else [cc]
        cc_list = [c for c in cc_list if c]

    sender = sender or frappe.session.user

    email_doc = frappe.new_doc("JH Emails")
    email_doc.source_document = source_document
    email_doc.date = frappe.utils.now()
    row = email_doc.append("emails", {
        "to": ", ".join(recipient_list) if recipient_list else NO_EMAIL_PLACEHOLDER,
        "subject": subject,
        "body": message,
        "sender": sender,
        # No valid recipient - go straight to the terminal "Failed" status
        # (never "0"/Pending) since there's no address to ever retry against.
        "status": "0" if recipient_list else "2",
    })
    email_doc.insert(ignore_permissions=True)
    frappe.db.commit()

    if not recipient_list:
        return False

    try:
        frappe.sendmail(
            expose_recipients="header",
            recipients=recipient_list,
            cc=cc_list,
            subject=subject,
            message=message,
        )
    except Exception:
        frappe.log_error(message=frappe.get_traceback(), title=f"Error sending email ({source_document})")
        return False

    row.status = "1"
    email_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return True


def render_email_template(template_name, context):
    """
    Render a JH Email Template's subject and body with the given context.

    Returns (subject, message), or None if the template doesn't exist or is
    disabled (an Error Log entry is written so it doesn't go unnoticed).
    Raises if the template's Jinja is broken, so the caller can decide whether
    to retry later.

    Templates are rendered without autoescaping: escape any value that came
    from user input (frappe.utils.escape_html) before putting it in context.
    """
    template = frappe.db.get_value(
        EMAIL_TEMPLATE_DOCTYPE, {"name": template_name, "enabled": 1}, ["subject", "body"], as_dict=True
    )
    if not template:
        frappe.log_error(
            f"{EMAIL_TEMPLATE_DOCTYPE} '{template_name}' is missing or disabled; email not sent.",
            "Email template missing",
        )
        return None

    return (
        frappe.render_template(template.subject, context).strip(),
        frappe.render_template(template.body, context),
    )


def send_template_email(template_name, context, source_document, recipients, cc=None, sender=None):
    """
    Render a JH Email Template and send it through send_notification_email
    (so it's logged to JH Emails like every other notification). Never
    raises - returns False if the template is missing/disabled/broken or the
    send fails, True on success.
    """
    try:
        rendered = render_email_template(template_name, context)
    except Exception:
        frappe.log_error(frappe.get_traceback(), f"Email template error ({template_name})")
        return False
    if not rendered:
        return False

    subject, message = rendered
    return send_notification_email(source_document, recipients, subject, message, cc=cc, sender=sender)
