import frappe
from frappe import _
from frappe.utils import cint


@frappe.whitelist(methods=["GET"])
def has_property_automation_role(email=None):
    if not email:
        frappe.throw(_("Email is required"))

    if frappe.session.user == "Administrator" or email == "Administrator":
        return {"message": {"has_access": True}}

    allowed_roles = {
        "JH Property Dept",
        "JH Digitrack Admin",
        
    }

    user_roles = set(frappe.get_roles(email))
    has_access = bool(user_roles.intersection(allowed_roles))

    return {"message": {"has_access": has_access}}


@frappe.whitelist(methods=["GET"])
def whoami(renewal_id: str = None, is_new: bool = False):
    user = frappe.session.user
    if user == "Administrator":
        return {"role": "Administrator"}

    is_new = bool(cint(is_new))
    user_roles = set(frappe.get_roles(user))
    has_property_access = bool(user_roles.intersection({"JH Property Dept", "JH Digitrack Admin"}))
    if not has_property_access:
        frappe.throw(_("You are not allowed to access property renewal workflow."))

    # Shared organization-role mappings from JH Digitrack Settings (Single).
    cfo_user = frappe.db.get_single_value("JH Digitrack Settings", "cfo")
    md_user = frappe.db.get_single_value("JH Digitrack Settings", "md")
    admin_hod_user = frappe.db.get_single_value("JH Digitrack Settings", "admin_hod")

    if is_new:
        if user == admin_hod_user:
            return {"role": "admin_hod"}
        if user == cfo_user:
            return {"role": "cfo"}
        if user == md_user:
            return {"role": "md"}
        return {"role": "renewal_owner"}

    if not renewal_id:
        frappe.throw(_("renewal_id is required when is_new is false"))

    renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    division = renewal.division
    if not division and renewal.property:
        division = frappe.db.get_value("JH Property Master", renewal.property, "division_used")

    division_gm_user = None
    if division:
        division_gm_user = frappe.db.get_value("JH Division Master", division, "division_gm")

    if user == division_gm_user:
        return {"role": "gm"}
    if user == admin_hod_user:
        return {"role": "admin_hod"}
    if user == cfo_user:
        return {"role": "cfo"}
    if user == md_user:
        return {"role": "md"}
    if renewal.owner == user:
        return {"role": "renewal_owner"}
    if "JH Digitrack Admin" in user_roles:
        return {"role": "module_admin"}

    return {"role": "property_dept_user"}
