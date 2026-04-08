import frappe
from frappe import _
from frappe.utils import cint, flt

PROPERTY_ACCESS_ROLES = {
    "JH Property Department",
    "JH GL Team",
    "JH Digitrack Admin",
}

ROLE_PRIORITY = [
    "module_admin",
    "cfo",
    "md",
    "approver_1",
    "approver_2",
    "property_dept",
    "gl_team",
    "licensing",
]

WORKFLOW_TRANSITIONS = {
    "submit": {
        "Draft": {
            "roles": {"licensing", "module_admin", "Administrator"},
            "next_state": "Pending Approver 1",
        },
    },

    "approve": {
        "Pending Approver 1": {
            "roles": {"approver_1", "module_admin", "Administrator"},
            "next_state": "Pending Approver 2",
        },

        "Pending Approver 2": {
            "roles": {"approver_2", "module_admin", "Administrator"},
            "next_state": "Pending Cheque Details",
        },

        "Pending Cheque Details": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Pending CFO",
        },

        "Pending CFO": {
            "roles": {"cfo", "module_admin", "Administrator"},
            "next_state": None,  # handled dynamically
        },

        "Pending MD": {
            "roles": {"md", "module_admin", "Administrator"},
            "next_state": "Pending Property PO",
        },

        "Pending Property PO": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Pending MIRO",
        },

        "Pending MIRO": {
            "roles": {"gl_team", "module_admin", "Administrator"},
            "next_state": "Completed",
        },
    },

    "reject": {
        "Pending Approver 1": {"roles": {"approver_1"}, "next_state": "Rejected"},
        "Pending Approver 2": {"roles": {"approver_2"}, "next_state": "Rejected"},
        "Pending CFO": {"roles": {"cfo"}, "next_state": "Rejected"},
        "Pending MD": {"roles": {"md"}, "next_state": "Rejected"},
    },
}


@frappe.whitelist(allow_guest=True, methods=["GET"])
def has_property_automation_role(email=None):
    try:
        if not email:
            frappe.throw(_("Email is required"))

        user = email

        if user == "Administrator":
            return {"has_access": True}

        user_roles = set(frappe.get_roles(user))
        settings = frappe.get_single("JH Digitrack Settings")

        has_access = (
            "JH Property Department" in user_roles
            or "JH GL Team" in user_roles
            or "JH Licensing Team" in user_roles
            or user == settings.cfo_user
            or user == settings.md_user
        )

        return {"has_access": has_access}

    except frappe.ValidationError as e:
        # Known validation errors (like missing email)
        return {
            "has_access": False,
            "error": str(e)
        }

    except Exception as e:
        # Unexpected errors
        frappe.log_error(frappe.get_traceback(), "has_property_automation_role Error")

        return {
            "has_access": False,
            "error": "Something went wrong. Please contact administrator."
        }


@frappe.whitelist(allow_guest=True,methods=["GET"])
def get_logged_in_property_user():
    user = frappe.session.user
    user_roles = set(frappe.get_roles(user))
    settings = frappe.get_single("JH Digitrack Settings")  

    return {
        "message": {
            "user": user,
            "has_property_access": (
                user == "Administrator"
                or "JH Property Department" in user_roles
                or "JH GL Team" in user_roles
                or "JH Licensing Team" in user_roles
                or user == settings.cfo_user
                or user == settings.md_user
            ),
            "has_property_dept_role": (
                user == "Administrator"
                or "JH Property Department" in user_roles
            ),
            "has_gl_team_role": (
                user == "Administrator"
                or "JH GL Team" in user_roles
            ),
            "roles": sorted(user_roles),
        }
    }


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

    matches = set()

    if "JH Digitrack Admin" in user_roles:
        matches.add("module_admin")
    if user == cfo_user:
        matches.add("cfo")
    if user == md_user:
        matches.add("md")
    if "JH Property Department" in user_roles:
        matches.add("property_dept")
    if "JH GL Team" in user_roles:
        matches.add("gl_team")
    if "JH Licensing Team" in user_roles:
        matches.add("licensing")

    if is_new:
        for role in ROLE_PRIORITY:
            if role in matches:
                return {"role": role}

        frappe.throw(_("You are not allowed to access property renewal workflow."))

    if not renewal_id:
        frappe.throw(_("renewal_id is required when is_new is false"))

    renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)

    if renewal.property:
        property_doc = frappe.get_doc("JH Property Master", renewal.property)

        if user == property_doc.approver_1:
            matches.add("approver_1")

        if user == property_doc.approver_2:
            matches.add("approver_2")

    
    for role in ROLE_PRIORITY:
        if role in matches:
            return {"role": role}

    frappe.throw(_("You are not allowed to access property renewal workflow."))




def notify_md(renewal):
    settings = frappe.get_single("JH Digitrack Settings")

    if not settings.md_user:
        return  # no MD configured

    frappe.sendmail(
        recipients=[settings.md_user],
        subject="Rental Renewal Approved (No MD Approval Required)",
        message=f"""
        Rental Renewal <b>{renewal.name}</b> has been approved by CFO.<br><br>
        Rent change is ≤ 5%, so MD approval is not required.<br><br>
        This is for your information.
        """
    )


def update_property_master_renewal_date(renewal):
    if renewal.workflow_state != "Completed" or not renewal.property or not renewal.renewal_to:
        return

    frappe.db.set_value("JH Property Master", renewal.property, "renewal_date", renewal.renewal_to)


@frappe.whitelist(methods=["GET"])
def get_division_gm(division: str = None, property: str = None, renewal_id: str = None):
    if not any([division, property, renewal_id]):
        frappe.throw(_("One of division, property, or renewal_id is required"))

    resolved_division = division

    if not resolved_division and property:
        resolved_division = frappe.db.get_value("JH Property Master", property, "division_used")

    if not resolved_division and renewal_id:
        renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
        resolved_division = renewal.division

        if not resolved_division and renewal.property:
            resolved_division = frappe.db.get_value(
                "JH Property Master", renewal.property, "division_used"
            )

    if not resolved_division:
        frappe.throw(_("Division could not be resolved"))

    gm_user = frappe.db.get_value("JH Division Master", resolved_division, "division_gm")

    return {
        "message": {
            "division": resolved_division,
            "gm_user": gm_user,
        }
    }


@frappe.whitelist(methods=["GET"])
def calculate_rent_change_percent(current_rent=None, proposed_rent=None):
    current_rent = flt(current_rent)
    proposed_rent = flt(proposed_rent)

    if not current_rent:
        return {
            
                "rent_change_percent": 0,
            }

    rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100

    return {
        
            "rent_change_percent": rent_change_percent,
        }
    


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

    if current_state == "Pending CFO" and action == "approve":

        # ensure value is calculated
        if renewal.rent_change_percent is None:
            renewal.calculate_rent_change_percent()

        if renewal.rent_change_percent > 5:
            next_state = "Pending MD"
        else:
            next_state = "Pending Property PO"
            notify_md(renewal)
    

    renewal.workflow_state = next_state
    renewal.save(ignore_permissions=True)
    update_property_master_renewal_date(renewal)

    return {
        "name": renewal.name,
        "role": role,
        "previous_state": current_state,
        "workflow_state": renewal.workflow_state,
    }
