"""
Individual email log list + manual resend, backing the Email Dashboard's
list view. Complements email_stats.py's aggregate numbers with per-email detail.

Any logged-in user can call these - both are scoped to their own sends
(sender == frappe.session.user), never another user's.

"date" is when the row was queued (its creation time), not when it was
actually sent - use "sent_at" for that. There's no dedicated sent-at field on
Scheduled Emails, so "sent_at" is approximated from the row's `modified`
timestamp, which is only ever touched once, when flush_pending_emails() or
resend_email() flips status to "1" - it's null until then.

A "0" row that's older than one full flush cycle (flush_pending_emails runs
every 10 minutes - see email_gateway.py / hooks.py) has already been retried
and is still stuck, so it's shown as "Failed" here and gets a manual Resend
action. A "0" row still within that window is shown as "Pending" - it just
hasn't hit its first scheduled send attempt yet. See helpers/email.py for the
shared Sent/Pending/Failed classification (also used by email_stats.py).
"""

import frappe
from frappe import _
from frappe.utils import cint, now_datetime

from jh_digitrack.api.helpers.email import NO_EMAIL_PLACEHOLDER, get_display_status, resolve_group_sender


@frappe.whitelist(methods=["GET"])
def get_email_list(limit=50, offset=0, status=None):
    """
    List individual emails, most recent first, each with a computed display
    status of "Sent", "Pending", or "Failed" (see module docstring).
    """
    limit = cint(limit) or 50
    offset = cint(offset) or 0

    rows = frappe.get_all(
        "Scheduled Emails",
        filters={"sender": frappe.session.user},
        fields=["name", "parent", "to", "cc", "subject", "sender", "status", "creation", "modified"],
        order_by="creation desc",
        limit_page_length=limit,
        limit_start=offset,
    )
    if not rows:
        return []

    parent_names = list({row.parent for row in rows if row.parent})
    parents = frappe.get_all(
        "JH Emails",
        filters={"name": ["in", parent_names]},
        fields=["name", "source_document"],
    )
    parent_by_name = {p.name: p for p in parents}

    now = now_datetime()
    result = []
    for row in rows:
        parent = parent_by_name.get(row.parent)
        display_status = get_display_status(row.status, row.creation, now)
        result.append({
            "name": row.name,
            "to": row.to,
            "cc": row.cc,
            "subject": row.subject,
            "sender": row.sender,
            "source_document": parent.source_document if parent else None,
            "date": str(row.creation) if row.creation else None,
            "sent_at": str(row.modified) if display_status == "Sent" and row.modified else None,
            "status": display_status,
            "can_resend": display_status != "Sent" and row.to != NO_EMAIL_PLACEHOLDER,
        })

    if status:
        result = [r for r in result if r["status"] == status]

    return result


@frappe.whitelist(methods=["POST"])
def resend_email(row_name):
    """Manually retry a single stuck/failed email right now."""
    row = frappe.get_doc("Scheduled Emails", row_name)
    if row.sender != frappe.session.user:
        frappe.throw(_("You can only resend emails you sent."), frappe.PermissionError)
    if str(row.status) == "1":
        return {"status": "Failure", "message": "This email was already sent."}
    if row.to == NO_EMAIL_PLACEHOLDER:
        return {"status": "Failure", "message": "This recipient has no email address on file. Cannot resend."}

    recipients = [address.strip() for address in (row.to or "").split(",") if address.strip()]
    if not recipients:
        return {"status": "Failure", "message": "No valid recipient on this email."}

    try:
        frappe.sendmail(
            sender=resolve_group_sender(row.group_id),
            expose_recipients="header",
            recipients=recipients,
            subject=row.subject,
            message=row.body,
            now=True,
        )
    except Exception:
        frappe.log_error(message=frappe.get_traceback(), title="Error resending email")
        return {"status": "Failure", "message": "Resend failed. Check the mail server / recipient address."}

    frappe.db.set_value("Scheduled Emails", row.name, "status", "1")

    return {"status": "success", "message": "Email resent."}
