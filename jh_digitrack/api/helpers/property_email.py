"""
HTML email generator for property automation notifications.
Covers pre-renewal reminders and workflow TAT alerts.
"""

import frappe
from jinja2 import Template


TEMPLATE_STR = """
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; font-size: 14px; color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .footer { color: #888; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <p>Dear Team,</p>
    <p>{{ header }}</p>

    <table>
        {% for row in rows %}
        <tr>
            <th>{{ row[0] }}</th>
            <td>{{ row[1] }}</td>
        </tr>
        {% endfor %}
    </table>

    <p>Please log in to <a href="{{ url }}/jh-digitrack">JH DigiTrack</a> to take action.</p>
    <p class="footer">This is an automated message. This email inbox is not actively monitored.</p>
</body>
</html>
"""


def generate_property_notification_email(type, context):
    """
    Generate an HTML email for property automation notifications.

    Parameters:
    - type (str): "pre_renewal" | "tat_reminder" | "tat_deadline" | "tat_escalation"
    - context (dict): Data dict — keys vary by type (see callers in property_notifications.py)

    Returns:
    - str: Rendered HTML string
    """
    url = frappe.utils.get_url()
    header = ""
    rows = []

    if type == "pre_renewal":
        prop = context["prop"]
        days_until_renewal = context["days_until_renewal"]
        urgency = "Urgent: " if context.get("include_escalation") else ""
        header = (
            f"{urgency}The following property is approaching its renewal date "
            f"and <strong>no renewal has been initiated yet</strong>."
        )
        rows = [
            ("Property", prop.property_name or prop.name),
            ("Renewal Date", str(prop.renewal_date)),
            ("Days Remaining", str(days_until_renewal)),
            ("Location", prop.location or "—"),
            ("Landlord", prop.landlord or "—"),
            ("Current Rent", frappe.utils.fmt_money(prop.current_rent) if prop.current_rent else "—"),
        ]

    elif type in ("tat_reminder", "tat_deadline"):
        renewal = context["renewal"]
        config = context["config"]
        if type == "tat_reminder":
            header = (
                f"Action required on Renewal <strong>{renewal.name}</strong>. "
                f"You have <strong>{config.remind_days_before} day(s)</strong> remaining before the TAT deadline."
            )
        else:
            header = (
                f"The TAT deadline has been reached for Renewal <strong>{renewal.name}</strong>. "
                f"<strong>Please act immediately.</strong>"
            )
        rows = [
            ("Renewal", renewal.name),
            ("Property", renewal.property or "—"),
            ("Current Step", renewal.workflow_state),
            ("TAT Allowed", f"{config.tat_days} day(s)"),
        ]

    elif type == "tat_escalation":
        renewal = context["renewal"]
        config = context["config"]
        assignee_display = context.get("assignee_display", "—")
        header = (
            f"Renewal <strong>{renewal.name}</strong> has exceeded its TAT deadline "
            f"by <strong>{config.escalate_days_after} day(s)</strong> and requires your attention."
        )
        rows = [
            ("Renewal", renewal.name),
            ("Property", renewal.property or "—"),
            ("Stalled At", renewal.workflow_state),
            ("Assigned To", assignee_display),
            ("TAT Allowed", f"{config.tat_days} day(s)"),
            ("Days Overdue", str(config.escalate_days_after)),
        ]

    return Template(TEMPLATE_STR).render(header=header, rows=rows, url=url)
