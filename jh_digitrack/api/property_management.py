import frappe


PROPERTY_AUTOMATION_ROLE = "Property Automation"


@frappe.whitelist(methods=["GET"])
def has_property_automation_role():
    if frappe.session.user == "Guest":
        frappe.throw("Unauthorized", frappe.PermissionError)

    has_access = PROPERTY_AUTOMATION_ROLE in frappe.get_roles(frappe.session.user)
    return {"message": {"has_access": has_access}}
