import frappe

def populate_user_manual(doc, method):
    if not doc.user_manual:
        return

    try:
        navbar_settings = frappe.get_doc("Navbar Settings")

        found = False
        for row in navbar_settings.help_dropdown:
            if row.item_label == "User Manual":
                row.route = doc.user_manual
                found = True
                break

        if found:
            navbar_settings.save(ignore_permissions=True)
            frappe.db.commit()

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error updating Navbar Settings")

