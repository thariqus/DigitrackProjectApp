import frappe


def execute():
    users = frappe.db.get_list(
        "User",
        filters=[
            ["Has Role", "role", "=", "JH Digitrack Member"],
            ["Has Role", "role", "!=", "Inbox User"],
        ],
    )

    if len(users) == 0:
        print("No users to add Inbox User role to")
        return

    print(f"Adding Inbox User role to {len(users)} users")
    for user in users:
        user = frappe.get_doc("User", user.name)
        user.append("roles", {"role": "Inbox User"})
        user.save()
        frappe.db.commit()
