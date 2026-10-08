"""
Travel Request notifications.

Sends through the shared helpers.email.send_notification_email, so every send
is logged to JH Emails and shows up on the Email Dashboard like other modules.
"""

import frappe
from jinja2 import Template
from markupsafe import Markup

from jh_digitrack.api.helpers.email import send_notification_email

SOURCE_DOCUMENT = "Travel Request - Manager Approval"

# autoescape: description and other values are typed by the requester
TEMPLATE = Template(
    """
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; font-size: 14px; color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; vertical-align: top; }
        th { background-color: #f5f5f5; font-weight: bold; width: 30%; }
        .footer { color: #888; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <p>Dear {{ manager_name }},</p>
    <p><strong>{{ requester_name }}</strong> has submitted a travel request that is waiting for your approval.</p>

    <h3>Travel Request Details</h3>
    <table>
        {% for label, value in rows %}
        <tr>
            <th>{{ label }}</th>
            <td style="white-space: pre-line;">{{ value }}</td>
        </tr>
        {% endfor %}
    </table>

    <p>Please <a href="{{ url }}">open the travel request</a> to approve or deny it.</p>
    <p class="footer">This is an automated message. This email inbox is not actively monitored.</p>
</body>
</html>
""",
    autoescape=True,
)


def _format_date(value):
    return frappe.utils.getdate(value).strftime("%d %b %Y") if value else ""


def _user_email(jh_user):
    """Email for a JH User Master record; falls back to its linked Frappe user id."""
    return jh_user.email or jh_user.user if jh_user else None


def notify_reporting_manager(travel_request):
    """
    Email the requester's reporting manager that a new travel request needs
    their approval. Enqueued from JHTravelRequest.after_insert once the
    request is committed. Only requests still at "Approval Pending" wait on
    the manager (urgent and credit-card-holder requests skip that stage).
    """
    doc = frappe.get_doc("JH Travel Request", travel_request)
    if doc.request_status != "Approval Pending":
        return False

    requester = frappe.db.get_value(
        "JH User Master", doc.requested_by, ["full_name", "email", "user", "reporting_manager"], as_dict=True
    )
    manager = (
        frappe.db.get_value("JH User Master", requester.reporting_manager, ["full_name", "email", "user"], as_dict=True)
        if requester and requester.reporting_manager
        else None
    )

    requester_name = (requester and requester.full_name) or doc.requested_by
    rows = [
        ("Request No", doc.name),
        ("Requested By", requester_name),
        ("Request Type", doc.request_type),
        ("From", doc.from_city),
        ("To", doc.to_city),
        ("Travel Date", _format_date(doc.travel_date)),
    ]
    if doc.round_trip:
        rows.append(("Return Date", _format_date(doc.return_date)))
    if doc.preferred_flight or doc.other_preffered_flight:
        rows.append(("Preferred Flight", doc.preferred_flight or doc.other_preffered_flight))
    if doc.description:
        # Already sanitized in JHTravelRequest.validate; escaping again would double-encode it
        rows.append(("Description", Markup(doc.description)))

    message = TEMPLATE.render(
        manager_name=(manager and manager.full_name) or "Manager",
        requester_name=requester_name,
        rows=[(label, value) for label, value in rows if value],
        url=frappe.utils.get_url_to_form("JH Travel Request", doc.name),
    )

    # A missing manager/email still goes through the helper, which logs it as a
    # failed send on the Email Dashboard instead of dropping it silently.
    return send_notification_email(
        source_document=SOURCE_DOCUMENT,
        recipients=_user_email(manager),
        subject=f"Travel Request {doc.name} from {requester_name} - Approval Required",
        message=message,
        sender=_user_email(requester),
    )
