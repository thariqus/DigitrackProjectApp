"""
Aggregated send statistics for the Email Dashboard, computed from the real
JH Emails / Scheduled Emails log (not any live mail-server query).

Any logged-in user can call this - it's scoped to their own sends (sender ==
frappe.session.user), not a global view. A user who has never sent anything
gets has_sent_emails=False instead of a stats payload full of zeros.

"Failed" here uses the same stuck-after-15-minutes classification as
email_log.py (see helpers/email.py) so the dashboard summary and the per-email
list never disagree on what counts as a failure.
"""

import frappe
from frappe.utils import add_days, getdate, now_datetime, today

from jh_digitrack.api.helpers.email import get_display_status


@frappe.whitelist(methods=["GET"])
def get_email_dashboard_stats():
    current_user = frappe.session.user

    if not frappe.db.exists("Scheduled Emails", {"sender": current_user}):
        return {"has_sent_emails": False}

    end_date = getdate(today())
    start_date = add_days(end_date, -29)
    previous_start = add_days(start_date, -30)
    previous_end = add_days(start_date, -1)

    parents = frappe.get_all(
        "JH Emails",
        filters={"date": ["between", [previous_start, end_date]]},
        fields=["name", "date"],
    )
    parent_date_by_name = {p.name: getdate(p.date) for p in parents if p.date}

    rows = []
    if parent_date_by_name:
        rows = frappe.get_all(
            "Scheduled Emails",
            filters={"parent": ["in", list(parent_date_by_name.keys())], "sender": current_user},
            fields=["parent", "status", "creation"],
        )

    now = now_datetime()
    daily_counts = {add_days(start_date, i): 0 for i in range(30)}
    current_sent = current_pending = current_failed = 0
    previous_sent = previous_pending = previous_failed = 0

    for row in rows:
        row_date = parent_date_by_name.get(row.parent)
        if not row_date:
            continue
        display_status = get_display_status(row.status, row.creation, now)

        if start_date <= row_date <= end_date:
            if display_status == "Sent":
                current_sent += 1
                daily_counts[row_date] += 1
            elif display_status == "Failed":
                current_failed += 1
            else:
                current_pending += 1
        elif previous_start <= row_date <= previous_end:
            if display_status == "Sent":
                previous_sent += 1
            elif display_status == "Failed":
                previous_failed += 1
            else:
                previous_pending += 1

    current_total = current_sent + current_pending + current_failed
    previous_total = previous_sent + previous_pending + previous_failed
    success_rate = (current_sent / current_total * 100) if current_total else 0
    previous_success_rate = (previous_sent / previous_total * 100) if previous_total else 0

    return {
        "has_sent_emails": True,
        "stat_tiles": [
            {
                "label": "Success",
                "value": current_sent,
                "delta": _percent_delta_label(current_sent, previous_sent),
                "delta_good": current_sent >= previous_sent,
            },
            {
                "label": "Failure",
                "value": current_failed,
                "delta": _percent_delta_label(current_failed, previous_failed),
                "delta_good": current_failed <= previous_failed,
            },
            {
                "label": "Success rate",
                "value": f"{success_rate:.1f}%",
                "delta": _point_delta_label(success_rate, previous_success_rate),
                "delta_good": success_rate >= previous_success_rate,
            },
        ],
        "daily_sent": [
            {"day": d.strftime("%d %b"), "date": str(d), "count": daily_counts[d]}
            for d in sorted(daily_counts)
        ],
        "status_breakdown": [
            {"key": "sent", "label": "Sent", "value": current_sent},
            {"key": "pending", "label": "Pending", "value": current_pending},
            {"key": "failed", "label": "Failed", "value": current_failed},
        ],
    }


def _percent_delta_label(current, previous):
    if not previous:
        return "No data for last month" if not current else "New this month"
    delta = ((current - previous) / previous) * 100
    sign = "+" if delta >= 0 else ""
    return f"{sign}{delta:.0f}% vs last month"


def _point_delta_label(current, previous):
    delta = current - previous
    sign = "+" if delta >= 0 else ""
    return f"{sign}{delta:.1f}pt vs last month"
