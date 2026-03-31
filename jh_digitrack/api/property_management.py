import frappe
from frappe import _


@frappe.whitelist(methods=["GET"])
def has_property_automation_role(email=None):
    if not email:
        frappe.throw(_("Email is required"))

    if frappe.session.user == "Administrator" or email == "Administrator":
        return {"message": {"has_access": True}}

    allowed_roles = {
        "JH Property Dept",
        "JH Digitrack Admin",
        "JH Credit Card Holder",
    }

    user_roles = set(frappe.get_roles(email))
    has_access = bool(user_roles.intersection(allowed_roles))

    return {"message": {"has_access": has_access}}
