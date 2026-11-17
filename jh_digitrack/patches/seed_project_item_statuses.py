import frappe


def execute():
    """Seed the configurable Project Item status master once, preserving edits."""
    statuses = [
        ("Open", 1, "Open"),
        ("Dev", 2, "Open"),
        ("Dev Testing", 3, "Open"),
        ("App Testing", 4, "Open"),
        ("UAT", 5, "Open"),
        ("Go Live - Monitoring", 6, "Open"),
        ("Closed", 7, "Closed"),
        ("Cancelled", 8, "Closed"),
        ("Reopen", 9, "Open"),
    ]
    for status_name, number, workflow_state in statuses:
        if frappe.db.exists("JH Project Item Status", status_name):
            continue
        # These are app configuration defaults, not user-owned records.
        frappe.get_doc({
            "doctype": "JH Project Item Status",
            "status_name": status_name,
            "status_number": number,
            "workflow_state": workflow_state,
        }).insert(ignore_permissions=True)
