import frappe


def execute():
    users = frappe.db.get_list(
        "User",
        filters=[
            ["Has Role", "role", "=", "JH Digitrack Member"],
            ["Has Role", "role", "!=", "JH Travel Workflow User"],
        ],
    )

    if len(users) == 0:
        print("No users to add Travel Workflow User role to")
        return

    print(f"Adding Travel Workflow User role to {len(users)} users")
    for user in users:
        user = frappe.get_doc("User", user.name)
        user.append("roles", {"role": "JH Travel Workflow User"})
        user.save()
        frappe.db.commit()
