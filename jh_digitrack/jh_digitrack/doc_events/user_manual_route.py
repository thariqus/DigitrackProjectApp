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

# @frappe.whitelist()
# def update_user_manual_in_navbar():
#     try:
#         user_manual_link = frappe.db.get_single_value("JH Digitrack Settings", "test")
#         if not user_manual_link:
#             return {"status": "failed", "message": "No User Manual link found in JH Digitrack Settings"}

#         navbar_settings = frappe.get_doc("Navbar Settings")
#         found = False

#         for row in navbar_settings.help_dropdown:
#             if row.item_label == "User Manual":
#                 row.route = user_manual_link
#                 found = True
#                 break

#         if not found:
#             navbar_settings.append("help_dropdown", {
#                 "item_label": "User Manual",
#                 "item_type": "Route",
#                 "route": user_manual_link
#             })

#         navbar_settings.save(ignore_permissions=True)
#         frappe.db.commit()

#         return {"status": "success", "message": user_manual_link}

#     except Exception as e:
#         frappe.log_error(frappe.get_traceback(), "Error updating Navbar Settings")
#         return {"status": "failed", "message": str(e)}

