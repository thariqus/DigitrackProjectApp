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

    <h3>{{ table_heading }}</h3>
    <table>
        {% for row in rows %}
        <tr>
            <th>{{ row[0] }}</th>
            <td>{{ row[1] }}</td>
        </tr>
        {% endfor %}
    </table>

    {% if note %}
    <p>{{ note }}</p>
    {% else %}
    <p>Please log in to <a href="{{ url }}/jh-digitrack">JH DigiTrack</a> to take action.</p>
    {% endif %}
    <p class="footer">This is an automated message. This email inbox is not actively monitored.</p>
</body>
</html>
"""


def get_workflow_assigned_label(renewal, business_used=None, property_type=None):
    """One-line 'Retail rent renewal 01.01.2026-31.12.2026' summary used in the subject."""
    business_used = business_used or ""
    property_type = property_type if property_type is not None else (renewal.property_type or "")
    label = " ".join(part for part in (business_used, property_type) if part)
    renewal_from = frappe.utils.getdate(renewal.renewal_from).strftime("%d.%m.%Y") if renewal.renewal_from else ""
    renewal_to = frappe.utils.getdate(renewal.renewal_to).strftime("%d.%m.%Y") if renewal.renewal_to else ""
    return f"{label} rent renewal {renewal_from}-{renewal_to}".strip()


def generate_property_notification_email(type, context):
    """
    Generate an HTML email for property automation notifications.

    Parameters:
    - type (str): "pre_renewal" | "tat_reminder" | "tat_deadline" | "tat_escalation" | "workflow_assigned"
    - context (dict): Data dict — keys vary by type (see callers in property_notifications.py)

    Returns:
    - str: Rendered HTML string
    """
    url = frappe.utils.get_url()
    header = ""
    rows = []
    table_heading = "Details"
    note = ""

    if type == "pre_renewal":
        table_heading = "Property Details"
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
        table_heading = "Renewal Details"
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

    elif type == "workflow_assigned":
        table_heading = "Renewal Details"
        renewal = context["renewal"]
        actor = context.get("actor") or "—"
        action = context.get("action") or "updated"
        business_used = context.get("business_used") or ""
        property_type_label = context.get("property_type_label") or renewal.property_type or ""
        property_name = context.get("property_name") or renewal.property or "—"
        label = " ".join(part for part in (business_used, property_type_label) if part)
        renewal_from = frappe.utils.getdate(renewal.renewal_from).strftime("%d.%m.%Y") if renewal.renewal_from else "—"
        renewal_to = frappe.utils.getdate(renewal.renewal_to).strftime("%d.%m.%Y") if renewal.renewal_to else "—"
        header = (
            f"Renewal <strong>{renewal.name}</strong> has been {action}d by <strong>{actor}</strong> "
            f"and is now awaiting your action."
        )
        rows = [
            ("Renewal", renewal.name),
            ("Property", property_name),
            ("Type", label or "—"),
            ("Renewal Period", f"{renewal_from} - {renewal_to}"),
            ("Current Rent", frappe.utils.fmt_money(renewal.current_rent) if renewal.current_rent else "—"),
            ("Proposed Rent", frappe.utils.fmt_money(renewal.proposed_rent) if renewal.proposed_rent else "—"),
        ]

    elif type == "renewal_completed":
        table_heading = "Renewal Details"
        renewal = context["renewal"]
        property_name = context.get("property_name") or renewal.property or "—"
        renewal_from = frappe.utils.getdate(renewal.renewal_from).strftime("%d.%m.%Y") if renewal.renewal_from else "—"
        renewal_to = frappe.utils.getdate(renewal.renewal_to).strftime("%d.%m.%Y") if renewal.renewal_to else "—"
        header = (
            f"Renewal <strong>{renewal.name}</strong> for property <strong>{property_name}</strong> "
            f"has completed the MIRO stage and the property is now <strong>renewed</strong>."
        )
        rows = [
            ("Renewal", renewal.name),
            ("Property", property_name),
            ("Division", renewal.division or "—"),
            ("Location", renewal.location or "—"),
            ("Landlord", renewal.landlord or "—"),
            ("Renewal Period", f"{renewal_from} - {renewal_to}"),
            ("Current Rent", frappe.utils.fmt_money(renewal.current_rent) if renewal.current_rent else "—"),
            ("Proposed Rent", frappe.utils.fmt_money(renewal.proposed_rent) if renewal.proposed_rent else "—"),
            (
                "Rent Change",
                f"{frappe.utils.fmt_money(renewal.rent_change)} ({frappe.utils.flt(renewal.rent_change_percent):.2f}%)"
                if renewal.rent_change is not None else "—",
            ),
            ("Additional Charges", frappe.utils.fmt_money(renewal.additional_charges) if renewal.additional_charges else "—"),
            ("Payment Schedule", renewal.payment_schedule or "—"),
            ("PO Number", renewal.po_number or "—"),
            (
                "MIRO Number(s)",
                ", ".join(row.miro_number for row in (renewal.table_gfwd or []) if row.miro_number) or "—",
            ),
            ("Remarks", renewal.remarks or "—"),
        ]

        for row in renewal.table_xqmr or []:
            if row.label:
                rows.append((row.label, frappe.utils.fmt_money(row.amount) if row.amount else "—"))

        note = (
            f'For the supporting documents and the renewed contract, please log in to '
            f'<a href="{url}/jh-digitrack">JH DigiTrack</a>.'
        )

        for idx, row in enumerate(renewal.cheque_details or [], start=1):
            rows.append((
                f"Cheque {idx}",
                f"{row.cheque_type or '—'} · {frappe.utils.fmt_money(row.cheque_amount) if row.cheque_amount else '—'} "
                f"· {row.cheque_date or '—'} · Payee: {row.payee or '—'}",
            ))

    elif type == "tat_escalation":
        table_heading = "Renewal Details"
        renewal = context["renewal"]
        config = context["config"]
        assignee_display = context.get("assignee_display", "—")
        days_overdue = context.get("days_overdue", 0)
        header = (
            f"Renewal <strong>{renewal.name}</strong> has exceeded its TAT deadline "
            f"by <strong>{days_overdue} day(s)</strong> and requires your attention."
        )
        rows = [
            ("Renewal", renewal.name),
            ("Property", renewal.property or "—"),
            ("Stalled At", renewal.workflow_state),
            ("Assigned To", assignee_display),
            ("TAT Allowed", f"{config.tat_days} day(s)"),
            ("Days Overdue", str(days_overdue)),
        ]

    return Template(TEMPLATE_STR).render(header=header, rows=rows, url=url, table_heading=table_heading, note=note)
