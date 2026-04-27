"""
Property Automation Notifications

Single scheduler entry point that processes:
1. Pre-renewal reminders (properties approaching renewal date with no active renewal)
2. Workflow step TAT reminders, deadline alerts, and escalation notifications
"""

import frappe
from frappe.utils import today, date_diff, getdate
from jh_digitrack.api.helpers.property_email import generate_property_notification_email


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
        filters={"renewal_date": ["is", "set"]},
        fields=[
            "name", "property_name", "renewal_date", "division_used",
            "current_rent", "landlord", "location", "last_renewal_reminder",
        ],
    )

    for prop in properties:
        days_until_renewal = date_diff(prop.renewal_date, today_date)

        if days_until_renewal < 0 or days_until_renewal > max_days:
            continue

        active_renewal = frappe.db.exists(
            "JH Property Rental Renewal",
            {"property": prop.name, "workflow_state": ["not in", ["Completed", "Rejected"]]},
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
        _send_pre_renewal_notification(prop, matched_rule, recipients, days_until_renewal)

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
        approvers = frappe.db.get_value(
            "JH Property Master", property_doc.name,
            ["approver_1", "approver_2"],
        ) or (None, None)

        for approver in approvers:
            if approver and approver not in users:
                users.append(approver)

    return users


def _send_pre_renewal_notification(prop, rule, recipients, days_until_renewal):
    if not recipients:
        return

    urgency = "Urgent: " if rule.include_escalation else ""
    subject = f"DigiTrack: {urgency}Property Renewal Due in {days_until_renewal} Days - {prop.property_name or prop.name}"
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
    except Exception:
        frappe.logger().error(frappe.get_traceback())


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
            "workflow_state": ["not in", ["Draft", "Completed", "Rejected"]],
        },
        fields=["name", "workflow_state", "step_entered_on", "property", "last_tat_notification", "enable_escalation_notifications"],
    )

    for renewal in active_renewals:
        config = tat_config.get(renewal.workflow_state)
        if not config or not renewal.step_entered_on:
            continue

        step_start = getdate(renewal.step_entered_on)
        days_in_step = date_diff(today_date, step_start)

        remind_on = config.tat_days - config.remind_days_before
        escalate_on = config.tat_days + config.escalate_days_after

        if days_in_step == remind_on:
            notification_type = "reminder"
        elif days_in_step == config.tat_days:
            notification_type = "deadline"
        elif days_in_step == escalate_on:
            notification_type = "escalation"
        else:
            continue

        dedup_key = f"{notification_type}:{today()}"
        if renewal.last_tat_notification == dedup_key:
            continue

        assignee = _resolve_step_assignee(renewal)

        if notification_type == "escalation" and not renewal.enable_escalation_notifications:
            continue

        if notification_type in ("reminder", "deadline"):
            _send_tat_notification(renewal, assignee, notification_type, config)
        else:
            _send_tat_escalation(renewal, assignee, config)

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
    property_doc = frappe.get_doc("JH Property Master", renewal.property)

    STEP_TO_ASSIGNEE = {
        "Pending Approver 1": property_doc.approver_1,
        "Pending Approver 2": property_doc.approver_2,
        "Pending CFO":        settings.cfo_user,
        "Pending MD":         settings.md_user,
    }

    assignee = STEP_TO_ASSIGNEE.get(state)
    if assignee:
        return assignee

    STEP_TO_ROLE = {
        "Pending Cheque Details": "JH Property Department",
        "Pending Property PO":    "JH Property Department",
        "Pending MIRO":           "JH GL Team",
    }

    role = STEP_TO_ROLE.get(state)
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
    Post-CFO/MD operational steps (Cheque Details, PO, MIRO) escalate to MD
    since CFO has already approved by that point.
    """
    state = renewal.workflow_state
    settings = frappe.get_single("JH Digitrack Settings")
    property_doc = frappe.get_doc("JH Property Master", renewal.property)

    ESCALATION_MAP = {
        "Pending Approver 1":     property_doc.approver_2,
        "Pending Approver 2":     settings.cfo_user,
        "Pending CFO":            settings.md_user,
        "Pending MD":             None,  
        "Pending Cheque Details": settings.md_user,  
        "Pending Property PO":    settings.md_user,  
        "Pending MIRO":           settings.md_user,  
    }

    return ESCALATION_MAP.get(state)


def _send_tat_notification(renewal, assignee, notification_type, config):
    if not assignee:
        return

    recipients = assignee if isinstance(assignee, list) else [assignee]
    label = "Reminder" if notification_type == "reminder" else "Deadline"
    subject = f"DigiTrack: TAT {label} - {renewal.name}"
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
    except Exception:
        frappe.logger().error(frappe.get_traceback())


def _send_tat_escalation(renewal, assignee, config):
    escalation_recipient = _get_escalation_recipient(renewal)
    if not escalation_recipient:
        return

    recipients = escalation_recipient if isinstance(escalation_recipient, list) else [escalation_recipient]
    assignee_display = ", ".join(assignee) if isinstance(assignee, list) else (assignee or "—")
    subject = f"DigiTrack: TAT Escalation - {renewal.name}"
    message = generate_property_notification_email(
        type="tat_escalation",
        context={
            "renewal": renewal,
            "config": config,
            "assignee_display": assignee_display,
        },
    )

    try:
        frappe.sendmail(
            expose_recipients="header",
            recipients=recipients,
            subject=subject,
            message=message,
        )
    except Exception:
        frappe.logger().error(frappe.get_traceback())
