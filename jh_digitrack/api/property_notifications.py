"""
Property Automation Notifications

Single scheduler entry point that processes:
1. Pre-renewal reminders (properties approaching renewal date with no active renewal)
2. Workflow step TAT reminders, deadline alerts, and escalation notifications
"""

import frappe
from frappe.utils import today, date_diff, getdate
from jh_digitrack.api.helpers.property_email import generate_property_notification_email
from jh_digitrack.api.property_management import _get_property_approvers_list


def process_property_notifications():
    """Main scheduler entry point. Runs daily at 07:00."""
    settings = frappe.get_single("JH Digitrack Settings")

    if settings.enable_property_renewal_reminders:
        _process_pre_renewal_reminders(settings)

    if settings.enable_workflow_tat:
        _process_workflow_tat(settings)


PRE_RENEWAL_ROLES = ["JH Licensing Team", "JH Property Department"]


def _process_pre_renewal_reminders(settings):
    """
    Check Property Master records for upcoming renewal dates.
    Send configurable tiered notifications if no active renewal exists.
    """
    today_date = getdate(today())

    reminder_rules = sorted(
        settings.property_renewal_reminders,
        key=lambda r: r.days_before,
        reverse=True,
    )

    if not reminder_rules:
        return

    max_days = reminder_rules[0].days_before

    properties = frappe.get_all(
        "JH Property Master",
        filters=[
            ["renewal_date", "is", "set"],
            ["renewal_date", ">=", today_date],
        ],
        fields=[
            "name", "property_name", "renewal_date", "division_used",
            "current_rent", "landlord", "location", "last_renewal_reminder",
        ],
    )

    for prop in properties:
        days_until_renewal = date_diff(prop.renewal_date, today_date)

        if days_until_renewal > max_days:
            continue

        active_renewal = frappe.db.exists(
            "JH Property Rental Renewal",
            {"property": prop.name, "workflow_state": ["not in", ["Completed", "Withdrawn"]]},
        )

        if active_renewal:
            continue

        matched_rule = None
        for rule in reminder_rules:
            if days_until_renewal <= rule.days_before:
                matched_rule = rule
            else:
                break

        if not matched_rule:
            continue

        dedup_key = str(matched_rule.days_before)
        if prop.last_renewal_reminder == dedup_key:
            continue

        recipients = _get_pre_renewal_recipients(prop, matched_rule.include_escalation)
        sent = _send_pre_renewal_notification(prop, matched_rule, recipients, days_until_renewal)

        if sent:
            frappe.db.set_value(
                "JH Property Master", prop.name,
                "last_renewal_reminder", dedup_key,
                update_modified=False,
            )


def _get_pre_renewal_recipients(property_doc, include_escalation=False):
    """
    Base: all users with JH Licensing Team or JH Property Department roles.
    If include_escalation: also add the property's Approver 1 and Approver 2.
    """
    users = frappe.get_all(
        "Has Role",
        filters={"role": ["in", PRE_RENEWAL_ROLES], "parenttype": "User"},
        pluck="parent",
        distinct=True,
    )

    if include_escalation:
        for approver in _get_property_approvers_list(property_doc.name):
            if approver and approver not in users:
                users.append(approver)

    return users


def _send_pre_renewal_notification(prop, rule, recipients, days_until_renewal):
    if not recipients:
        return False

    urgency = "Urgent: " if rule.include_escalation else ""
    subject = f"{urgency}Property Renewal Due in {days_until_renewal} Days - {prop.property_name or prop.name}"
    message = generate_property_notification_email(
        type="pre_renewal",
        context={
            "prop": prop,
            "days_until_renewal": days_until_renewal,
            "include_escalation": rule.include_escalation,
        },
    )

    try:
        frappe.sendmail(
            expose_recipients="header",
            recipients=recipients,
            subject=subject,
            message=message,
        )
        return True
    except Exception:
        frappe.logger().error(frappe.get_traceback())
        return False


def _process_workflow_tat(settings):
    """
    Check active renewals for step TAT breaches.
    Send reminder / deadline / escalation notifications.
    """
    today_date = getdate(today())

    tat_config = {row.workflow_state: row for row in settings.property_workflow_tat}

    active_renewals = frappe.get_all(
        "JH Property Rental Renewal",
        filters={
            "workflow_state": ["not in", ["Draft", "Completed", "Withdrawn"]],
        },
        fields=["name", "workflow_state", "step_entered_on", "property", "last_tat_notification", "enable_escalation_notifications"],
    )

    for renewal in active_renewals:
        config = tat_config.get(renewal.workflow_state)
        if not config or not renewal.step_entered_on:
            continue

        step_start = getdate(renewal.step_entered_on)
        days_in_step = date_diff(today_date, step_start)

        # Use >= so a catch-up run after scheduler downtime still fires the
        # most severe notification that applies. Priority: escalation > deadline > reminder.
        # Skip tiers where the config value is 0 or None (field left empty = tier not wanted).
        if config.escalate_days_after and days_in_step >= (config.tat_days + config.escalate_days_after):
            notification_type = "escalation"
        elif days_in_step >= config.tat_days:
            notification_type = "deadline"
        elif config.remind_days_before and days_in_step >= (config.tat_days - config.remind_days_before):
            notification_type = "reminder"
        else:
            continue

        dedup_key = f"{notification_type}:{today()}"
        if renewal.last_tat_notification == dedup_key:
            continue

        assignee = _resolve_step_assignee(renewal)

        if notification_type == "escalation" and not renewal.enable_escalation_notifications:
            continue

        if notification_type in ("reminder", "deadline"):
            sent = _send_tat_notification(renewal, assignee, notification_type, config)
        else:
            sent = _send_tat_escalation(renewal, assignee, config, days_in_step)

        if sent:
            frappe.db.set_value(
                "JH Property Rental Renewal", renewal.name,
                "last_tat_notification", dedup_key,
                update_modified=False,
            )


def _resolve_step_assignee(renewal):
    """
    Resolve the user(s) assigned to the current workflow step.
    Returns a single email string or a list of email strings.
    """
    state = renewal.workflow_state
    settings = frappe.get_single("JH Digitrack Settings")

    if state.startswith("Pending Approver "):
        approvers = _get_property_approvers_list(renewal.property)
        idx = int(state.split("Pending Approver ")[1]) - 1
        return approvers[idx] if 0 <= idx < len(approvers) else None

    settings_map = {
        "Pending Admin HOD": settings.admin_hod_user,
        "Pending FC":        settings.fc_user,
        "Pending CFO":       settings.cfo_user,
        "Pending MD":        settings.md_user,
    }
    if state in settings_map:
        return settings_map[state]

    role_map = {
        "Draft":                  "JH Property Department",
        "Pending Cheque Details": "JH Property Department",
        "Pending Property PO":    "JH Property Department",
        "Pending MIRO":           "JH GL Team",
    }
    role = role_map.get(state)
    if role:
        return frappe.get_all(
            "Has Role",
            filters={"role": role, "parenttype": "User"},
            pluck="parent",
        )

    return None


def _get_escalation_recipient(renewal):
    """
    Get the escalation recipient based on the workflow hierarchy.
    Approver chains escalate to the next approver if one exists, then Admin HOD.
    Post-approval operational steps (Cheque Details, PO, MIRO) escalate to Admin HOD.
    """
    state = renewal.workflow_state
    settings = frappe.get_single("JH Digitrack Settings")

    if state.startswith("Pending Approver "):
        approvers = _get_property_approvers_list(renewal.property)
        idx = int(state.split("Pending Approver ")[1]) - 1
        next_approver = approvers[idx + 1] if 0 <= idx + 1 < len(approvers) else None
        return next_approver or settings.admin_hod_user

    ESCALATION_MAP = {
        "Pending Admin HOD":      settings.fc_user,
        "Pending FC":             settings.cfo_user,
        "Pending CFO":            settings.md_user,
        "Pending MD":             None,
        "Pending Cheque Details": settings.admin_hod_user,
        "Pending Property PO":    settings.admin_hod_user,
        "Pending MIRO":           settings.md_user,
    }

    return ESCALATION_MAP.get(state)


def _send_tat_notification(renewal, assignee, notification_type, config):
    if not assignee:
        return False

    recipients = assignee if isinstance(assignee, list) else [assignee]
    label = "Reminder" if notification_type == "reminder" else "Deadline"
    subject = f"TAT {label} - {renewal.name}"
    message = generate_property_notification_email(
        type=f"tat_{notification_type}",
        context={"renewal": renewal, "config": config},
    )

    try:
        frappe.sendmail(
            expose_recipients="header",
            recipients=recipients,
            subject=subject,
            message=message,
        )
        return True
    except Exception:
        frappe.logger().error(frappe.get_traceback())
        return False


def _send_tat_escalation(renewal, assignee, config, days_in_step):
    escalation_recipient = _get_escalation_recipient(renewal)
    if not escalation_recipient:
        return False

    recipients = escalation_recipient if isinstance(escalation_recipient, list) else [escalation_recipient]
    assignee_display = ", ".join(assignee) if isinstance(assignee, list) else (assignee or "—")
    subject = f"TAT Escalation - {renewal.name}"
    message = generate_property_notification_email(
        type="tat_escalation",
        context={
            "renewal": renewal,
            "config": config,
            "assignee_display": assignee_display,
            "days_overdue": days_in_step - config.tat_days,
        },
    )

    try:
        frappe.sendmail(
            expose_recipients="header",
            recipients=recipients,
            subject=subject,
            message=message,
        )
        return True
    except Exception:
        frappe.logger().error(frappe.get_traceback())
        return False
