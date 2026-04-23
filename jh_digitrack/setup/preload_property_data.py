import frappe


def preload_property_renewal_reminders():
    settings = frappe.get_single("JH Digitrack Settings")

    if settings.property_renewal_reminders:
        return

    defaults = [
        {"days_before": 90, "include_escalation": 0},
        {"days_before": 60, "include_escalation": 0},
        {"days_before": 30, "include_escalation": 1},
    ]

    for row in defaults:
        settings.append("property_renewal_reminders", row)

    settings.save(ignore_permissions=True)
    frappe.db.commit()


def preload_property_workflow_tat():
    settings = frappe.get_single("JH Digitrack Settings")

    if settings.property_workflow_tat:
        return

    defaults = [
        {"workflow_state": "Pending Approver 1",     "tat_days": 5, "reminder_days": 2, "escalation_days": 1},
        {"workflow_state": "Pending Approver 2",     "tat_days": 5, "reminder_days": 2, "escalation_days": 1},
        {"workflow_state": "Pending CFO",            "tat_days": 5, "reminder_days": 2, "escalation_days": 1},
        {"workflow_state": "Pending MD",             "tat_days": 5, "reminder_days": 2, "escalation_days": 1},
        {"workflow_state": "Pending Cheque Details", "tat_days": 3, "reminder_days": 1, "escalation_days": 1},
        {"workflow_state": "Pending Property PO",    "tat_days": 3, "reminder_days": 1, "escalation_days": 1},
        {"workflow_state": "Pending MIRO",           "tat_days": 3, "reminder_days": 1, "escalation_days": 1},
    ]

    for row in defaults:
        settings.append("property_workflow_tat", row)

    settings.save(ignore_permissions=True)
    frappe.db.commit()
