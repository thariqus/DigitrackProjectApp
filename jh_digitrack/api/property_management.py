import frappe
from frappe import _
from frappe.utils import cint

ROLE_PRIORITY = [
    "module_admin",
    "cfo",
    "md",
    "admin_hod",
    "division_gm",
    "property_dept",
    "licensing",
]

WORKFLOW_TRANSITIONS = {
    "submit": {
        "Draft": {
            "roles": {"licensing", "module_admin", "Administrator"},
            "next_state": "Pending_GM_Review",
        },
    },
    "approve": {
        "Pending_GM_Review": {
            "roles": {"division_gm", "module_admin", "Administrator"},
            "next_state": "Pending_Cheque_Details",
        },
        "Pending_Cheque_Details": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Pending_Admin_HOD",
        },
        "Pending_Admin_HOD": {
            "roles": {"admin_hod", "module_admin", "Administrator"},
            "next_state": None,
        },
        "Pending_CFO": {
            "roles": {"cfo", "module_admin", "Administrator"},
            "next_state": "Pending_Property_PO",
        },
        "Pending_MD": {
            "roles": {"md", "module_admin", "Administrator"},
            "next_state": "Pending_Property_PO",
        },
        "Pending_Property_PO": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Pending_MIRO",
        },
        "Pending_MIRO": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Completed",
        },
    },
    "reject": {
        "Pending_GM_Review": {
            "roles": {"division_gm", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
        "Pending_Cheque_Details": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
        "Pending_Admin_HOD": {
            "roles": {"admin_hod", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
        "Pending_CFO": {
            "roles": {"cfo", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
        "Pending_MD": {
            "roles": {"md", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
    },
}


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

    # Shared organization-role mappings from JH Digitrack Settings (Single).
    cfo_user = frappe.db.get_single_value("JH Digitrack Settings", "cfo_user")
    md_user = frappe.db.get_single_value("JH Digitrack Settings", "md_user")
    admin_hod_user = frappe.db.get_single_value("JH Digitrack Settings", "admin_hod_user")

    matches = set()

    if "JH Digitrack Admin" in user_roles:
        matches.add("module_admin")
    if user == cfo_user:
        matches.add("cfo")
    if user == md_user:
        matches.add("md")
    if user == admin_hod_user:
        matches.add("admin_hod")
    if "JH Property Dept" in user_roles:
        matches.add("property_dept")

    if is_new:
        for role in ROLE_PRIORITY:
            if role in matches:
                return {"role": role}

        frappe.throw(_("You are not allowed to access property renewal workflow."))

    if not renewal_id:
        frappe.throw(_("renewal_id is required when is_new is false"))

    renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    division = renewal.division
    if not division and renewal.property:
        division = frappe.db.get_value("JH Property Master", renewal.property, "division_used")

    if division:
        division_gm_user = frappe.db.get_value("JH Division Master", division, "division_gm")
        if user == division_gm_user:
            matches.add("division_gm")

    if renewal.owner == user:
        matches.add("licensing")

    for role in ROLE_PRIORITY:
        if role in matches:
            return {"role": role}

    frappe.throw(_("You are not allowed to access property renewal workflow."))


def _get_next_state_for_admin_hod(renewal):
    if renewal.rent_change_percent is None:
        renewal.calculate_rent_change_percent()

    if renewal.rent_change_percent <= 5:
        return "Pending_CFO"

    return "Pending_MD"


@frappe.whitelist(methods=["POST"])
def apply_workflow_action(renewal_id: str, action: str):
    if not renewal_id:
        frappe.throw(_("renewal_id is required"))

    action = (action or "").strip().lower()
    if action not in WORKFLOW_TRANSITIONS:
        frappe.throw(_("Unsupported workflow action: {0}").format(action))

    renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    current_state = renewal.workflow_state or "Draft"
    role = whoami(renewal_id=renewal_id, is_new=False).get("role")

    transition = WORKFLOW_TRANSITIONS[action].get(current_state)
    if not transition:
        frappe.throw(
            _("Action {0} is not allowed when workflow state is {1}.").format(action, current_state)
        )

    if role not in transition["roles"]:
        frappe.throw(
            _("Role {0} is not allowed to {1} a renewal in state {2}.").format(
                role, action, current_state
            )
        )

    next_state = transition["next_state"]
    if current_state == "Pending_Admin_HOD" and action == "approve":
        next_state = _get_next_state_for_admin_hod(renewal)

    renewal.workflow_state = next_state
    renewal.save(ignore_permissions=True)

    return {
        "name": renewal.name,
        "role": role,
        "previous_state": current_state,
        "workflow_state": renewal.workflow_state,
    }
