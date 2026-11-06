"""
J-Reflect review notifications.

When a rating is submitted and the evaluation moves to the next reviewer
(functional manager or skip-level manager), a row is queued in
"PMS Review Email Queue" instead of emailing straight away. A scheduler job
(every 4 hours, see hooks.py) sends the pending rows grouped by reviewer, so a
functional manager who is next for many employees gets one email listing all
of them instead of one email per employee.

Subject and body come from the shared "JH Email Template" (one per review
stage, see EMAIL_TEMPLATES), never from code. Every send goes through
helpers.email.send_notification_email, so it is logged to JH Emails and shows
on the Email Dashboard.
"""

from collections import defaultdict

import frappe
from frappe.utils import escape_html, get_url, now_datetime

from jh_digitrack.api.helpers.email import render_email_template, send_notification_email

QUEUE_DOCTYPE = "PMS Review Email Queue"
SOURCE_DOCUMENT = "J-Reflect Review Notification"
REVIEW_PAGE = "/PMS/functionalorskiplevelyearlysubmission"
DIGITRACK_PAGE = "/jh-digitrack"

# Review stage -> PMS Employees fields holding that reviewer's code and email
REVIEWER_FIELDS = {
    "Functional Manager Review": ("functional_manager_code", "functional_manager_email"),
    "Skip Level Manager Review": ("skip_level_manager_code", "skip_level_manager_email"),
}

# Review stage -> JH Email Template name
EMAIL_TEMPLATES = {
    "Functional Manager Review": "J-Reflect Functional Manager Review",
    "Skip Level Manager Review": "J-Reflect Skip Level Manager Review",
}


def _full_name(employee_code):
    if not employee_code:
        return None
    return frappe.db.get_value("JH User Master", employee_code, "full_name")


def _current_reviewer(employee_code, review_stage):
    """(code, email) of whoever reviews this employee at this stage, from PMS Employees."""
    code_field, email_field = REVIEWER_FIELDS[review_stage]
    reviewer = frappe.db.get_value("PMS Employees", employee_code, [code_field, email_field], as_dict=True) or {}
    return reviewer.get(code_field), reviewer.get(email_field)


def _skip_pending(goal_assessment, remarks):
    """Skip every still-pending row for this evaluation (a later stage has taken over)."""
    for name in frappe.get_all(
        QUEUE_DOCTYPE, filters={"goal_assessment": goal_assessment, "email_status": "Pending"}, pluck="name"
    ):
        frappe.db.set_value(QUEUE_DOCTYPE, name, {"email_status": "Skipped", "remarks": remarks})


def queue_review_notification(goal_assessment, next_status):
    """
    Called right after a rating submission has moved the evaluation to
    next_status. Older pending rows for the same evaluation are skipped (e.g.
    the reporting manager's submit queued a mail to the functional manager,
    but the functional manager already submitted before the scheduler ran, so
    only the skip-level manager still needs to hear about it). If next_status
    is a manager review stage, a new row is queued for that reviewer.

    Never raises: the rating is already saved, and a notification problem must
    not turn that into an error for the person submitting.
    """
    try:
        doc = frappe.db.get_value(
            "Goal Assessment", goal_assessment, ["name", "employee_code", "employee_name", "year"], as_dict=True
        )
        if not doc:
            return

        _skip_pending(doc.name, f"Superseded: evaluation moved to {next_status} before the email was sent.")

        if next_status not in REVIEWER_FIELDS:
            frappe.db.commit()
            return

        employee = frappe.db.get_value(
            "PMS Employees", doc.employee_code, ["full_name", "manager_code"], as_dict=True
        ) or frappe._dict()
        receiver_code, receiver_email = _current_reviewer(doc.employee_code, next_status)

        frappe.get_doc({
            "doctype": QUEUE_DOCTYPE,
            "goal_assessment": doc.name,
            "year": doc.year,
            "employee_code": doc.employee_code,
            "employee_name": doc.employee_name or employee.full_name,
            "reporting_manager_code": employee.manager_code,
            "reporting_manager_name": _full_name(employee.manager_code),
            "submitted_by": frappe.session.user,
            "review_stage": next_status,
            "receiver_code": receiver_code,
            "receiver_name": _full_name(receiver_code),
            "receiver_email": receiver_email,
            "email_status": "Pending",
            "created_on": now_datetime(),
        }).insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), f"J-Reflect review notification queue failed ({goal_assessment})")


def _still_valid(row):
    """
    Re-check a pending row just before sending. Returns a skip reason, or None
    if it should still be sent. If the reviewer for the stage changed in PMS
    Employees since the row was queued, the row is re-pointed at the current
    reviewer instead of being dropped.
    """
    status, docstatus = frappe.db.get_value("Goal Assessment", row.goal_assessment, ["status", "docstatus"]) or (None, None)
    if status is None:
        return "Goal Assessment no longer exists."
    if docstatus != 0 or status != row.review_stage:
        return f"Evaluation is no longer at {row.review_stage} (current status: {status})."

    code, email = _current_reviewer(row.employee_code, row.review_stage)
    if email and email != row.receiver_email:
        row.update({
            "receiver_code": code,
            "receiver_name": _full_name(code),
            "receiver_email": email,
            "remarks": f"Reviewer changed from {row.receiver_email} to {email} before sending.",
        })
        frappe.db.set_value(QUEUE_DOCTYPE, row.name, {
            "receiver_code": row.receiver_code,
            "receiver_name": row.receiver_name,
            "receiver_email": row.receiver_email,
            "remarks": row.remarks,
        })
    return None


def send_pending_review_emails():
    """
    Scheduler entry point (every 4 hours). Sends one email per reviewer per
    review stage, listing every employee waiting on them. Rows whose
    evaluation has already moved on are marked Skipped, not sent.
    """
    rows = frappe.get_all(
        QUEUE_DOCTYPE,
        filters={"email_status": "Pending"},
        fields=[
            "name", "goal_assessment", "year", "employee_code", "employee_name",
            "reporting_manager_code", "reporting_manager_name", "submitted_by",
            "review_stage", "receiver_code", "receiver_name", "receiver_email", "created_on",
        ],
        order_by="created_on asc",
    )
    if not rows:
        return

    groups = defaultdict(list)
    for row in rows:
        reason = _still_valid(row)
        if reason:
            frappe.db.set_value(QUEUE_DOCTYPE, row.name, {"email_status": "Skipped", "remarks": reason})
            continue
        groups[((row.receiver_email or "").strip().lower(), row.review_stage)].append(row)
    frappe.db.commit()

    for (receiver_email, review_stage), group in groups.items():
        _send_group(group, EMAIL_TEMPLATES[review_stage])


def _send_group(group, template_name):
    first = group[0]
    # Values come from HR master data; escape them since the template is rendered as HTML.
    context = {
        "receiver_name": escape_html(first.receiver_name or "Manager"),
        "receiver_email": first.receiver_email,
        "review_stage": first.review_stage,
        "review_url": get_url(REVIEW_PAGE),
        "digitrack_url": get_url(DIGITRACK_PAGE),
        "employee_count": len(group),
        "employees": [
            {
                "employee_code": escape_html(row.employee_code or ""),
                "employee_name": escape_html(row.employee_name or ""),
                "year": escape_html(row.year or ""),
                "reporting_manager_code": escape_html(row.reporting_manager_code or ""),
                "reporting_manager_name": escape_html(row.reporting_manager_name or ""),
                "submitted_by": escape_html(row.submitted_by or ""),
                "submitted_on": frappe.utils.format_datetime(row.created_on),
            }
            for row in group
        ],
    }
    names = [row.name for row in group]

    # A missing/disabled or broken template leaves the rows Pending, so they go
    # out on a later run once the template is fixed (the cause is in Error Log).
    try:
        rendered = render_email_template(template_name, context)
    except Exception:
        frappe.log_error(frappe.get_traceback(), f"Email template error ({template_name})")
        return
    if not rendered:
        return
    subject, message = rendered

    sent = send_notification_email(
        source_document=SOURCE_DOCUMENT,
        recipients=first.receiver_email,
        subject=subject,
        message=message,
    )

    values = (
        {"email_status": "Sent", "sent_on": now_datetime()}
        if sent
        else {"email_status": "Failed", "remarks": "Send failed - see JH Emails / Error Log; resend from the Email Dashboard."}
    )
    for name in names:
        frappe.db.set_value(QUEUE_DOCTYPE, name, values)
    frappe.db.commit()
