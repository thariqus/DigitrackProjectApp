import frappe

@frappe.whitelist()
def get_logged_in_user_details():
    if frappe.session.user == "Guest":
        frappe.throw("Unauthorized", frappe.PermissionError)

    user = frappe.session.user

    data = frappe.get_all(
        "JH User Master",
        filters={"email": user},
        fields=["name", "full_name", "email","private_message","private_message_expiry","url"],
        limit=1
    )

    return data[0] if data else {}
