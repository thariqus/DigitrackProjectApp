import frappe


def execute():
    users = frappe.db.get_list(
        "User",
        filters=[
            ["Has Role", "role", "=", "JH Digitrack Member"],
        ],
    )

    for user in users:
        frappe.db.set_value("User", user.name, "default_app", "jh_digitrack")
        frappe.db.commit()
