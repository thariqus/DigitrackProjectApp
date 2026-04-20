import frappe
from frappe import _
from frappe.utils import cint, flt
 
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
 
SENDBACK_TRANSITIONS = {
    "Pending Approver 1": {"Draft"},
    "Pending Approver 2": {"Pending Approver 1", "Draft"},
    "Pending CFO": {"Pending Approver 2", "Pending Approver 1", "Draft"},
    "Pending MD": {"Pending CFO", "Pending Approver 2", "Pending Approver 1", "Draft"},
    "Pending Cheque Details": {"Pending MD", "Pending CFO", "Pending Approver 2", "Pending Approver 1", "Draft"},
    "Pending Property PO": {"Pending Cheque Details", "Pending MD", "Pending CFO", "Pending Approver 2", "Pending Approver 1", "Draft"},
    "Pending MIRO": {"Pending Property PO", "Pending Cheque Details", "Pending MD", "Pending CFO", "Pending Approver 2", "Pending Approver 1", "Draft"},
}
 
STATE_ROLE_MAP = {
    "Pending Approver 1": {"approver_1", "module_admin", "Administrator"},
    "Pending Approver 2": {"approver_2", "module_admin", "Administrator"},
    "Pending Cheque Details": {"property_dept", "module_admin", "Administrator"},
    "Pending CFO": {"cfo", "module_admin", "Administrator"},
    "Pending MD": {"md", "module_admin", "Administrator"},
    "Pending Property PO": {"property_dept", "module_admin", "Administrator"},
    "Pending MIRO": {"gl_team", "module_admin", "Administrator"},
}
 
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
            "next_state": "Pending CFO",
        },
 
        "Pending CFO": {
            "roles": {"cfo", "module_admin", "Administrator"},
            "next_state": None,  # handled dynamically: >5% → Pending MD, else → Pending Cheque Details
        },
 
        "Pending MD": {
            "roles": {"md", "module_admin", "Administrator"},
            "next_state": "Pending Cheque Details",
        },
 
        "Pending Cheque Details": {
            "roles": {"property_dept", "module_admin", "Administrator"},
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
 
    "sendback": {
        "Pending Approver 1": {
            "roles": {"approver_1", "module_admin", "Administrator"},
            "next_state": "Draft",
        },
        "Pending Approver 2": {
            "roles": {"approver_2", "module_admin", "Administrator"},
            "next_state": "Pending Approver 1",
        },
        "Pending CFO": {
            "roles": {"cfo", "module_admin", "Administrator"},
            "next_state": "Pending Approver 2",
        },
        "Pending MD": {
            "roles": {"md", "module_admin", "Administrator"},
            "next_state": "Pending CFO",
        },
        "Pending Cheque Details": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Pending CFO",
        },
        "Pending Property PO": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Pending Cheque Details",
        },
        "Pending MIRO": {
            "roles": {"gl_team", "module_admin", "Administrator"},
            "next_state": "Pending Property PO",
        },
    },
 
    "withdraw": {
        "Pending Approver 1": {
            "roles": {"approver_1", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
        "Pending Approver 2": {
            "roles": {"approver_2", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
        "Pending Cheque Details": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
        "Pending CFO": {
            "roles": {"cfo", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
        "Pending MD": {
            "roles": {"md", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
        "Pending Property PO": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
        "Pending MIRO": {
            "roles": {"gl_team", "module_admin", "Administrator"},
            "next_state": "Rejected",
        },
    },
}
 
 
def _get_property_user_context():
    """
    Returns a dict of booleans describing the current user's property access level.
    MD and CFO are resolved from JH Digitrack Settings — not from Frappe roles —
    so they get access even if they only hold JH Digitrack Member.
    """
    user = frappe.session.user
    user_roles = set(frappe.get_roles(user))
    settings = frappe.get_single("JH Digitrack Settings")
    is_administrator = user == "Administrator"
    return {
        "user": user,
        "is_admin": is_administrator or "JH Digitrack Admin" in user_roles,
        "is_md": is_administrator or user == settings.md_user,
        "is_cfo": is_administrator or user == settings.cfo_user,
        "has_property_dept": is_administrator or "JH Property Department" in user_roles,
        "has_gl_team": is_administrator or "JH GL Team" in user_roles,
        "is_licensing": is_administrator or "JH Licensing Team" in user_roles,
    }
 
 
@frappe.whitelist(methods=["GET"])
def get_property_list(
    search=None,
    emirate=None,
    type_of_property=None,
    division=None,
    expiring_soon=None,
    limit=10,
    page=1,
):
    """
    Returns JH Property Master records the current user is allowed to see.
    MD and CFO are resolved from JH Digitrack Settings so they receive full
    access without needing a property-specific Frappe role.
    """
    ctx = _get_property_user_context()
    user = ctx["user"]
 
    has_full_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["has_property_dept"] or ctx["has_gl_team"] or ctx["is_licensing"]
    )
 
    approver_props = []
    if not has_full_access:
        approver_props = frappe.get_all(
            "JH Property Master",
            or_filters=[["approver_1", "=", user], ["approver_2", "=", user]],
            pluck="name",
            ignore_permissions=True,
        )
        if not approver_props:
            frappe.throw(_("Not permitted"), frappe.PermissionError)
 
    filters = {}
    if search:
        filters["property_name"] = ["like", f"%{search}%"]
    if emirate:
        filters["emirate"] = emirate
    if type_of_property:
        filters["type_of_property"] = type_of_property
    if division:
        filters["division_used"] = division
    if expiring_soon:
        from frappe.utils import add_days, today
        filters["renewal_date"] = ["between", [today(), add_days(today(), 90)]]
    if not has_full_access:
        filters["name"] = ["in", approver_props]
 
    limit = cint(limit)
    page = cint(page)
    start = (page - 1) * limit
 
    fields = [
        "name", "property_name", "type_of_property", "division_used",
        "approver_1", "approver_2", "booked_under", "profit_center",
        "number_of_units", "number_of_premises", "premise_number",
        "staff_allocated", "location", "emirate", "country",
        "makani_number", "po_box_number", "po_box_renewal_date",
        "landlord", "real_estate", "current_rent", "renewal_date",
        "landlord_security_deposit", "tenancy_period",
        "electricity_accounts", "electricity_connection_numbers",
        "electricity_water_security_deposit", "landline_numbers",
        "internet_connection", "cdc_expiry", "hassantuk_expiry",
    ]
 
    records = frappe.get_all(
        "JH Property Master",
        filters=filters,
        fields=fields,
        limit=limit,
        start=start,
        order_by="renewal_date asc",
        ignore_permissions=True,
    )
    total = frappe.db.count("JH Property Master", filters=filters, cache=False)
 
    return {"properties": records, "total": total}
 
 
@frappe.whitelist(methods=["GET"])
def get_renewal_list(
    workflow_states=None,
    divisions=None,
    search=None,
    property=None,
    limit=10,
    page=1,
):
    """
    Returns JH Property Rental Renewal records the current user is allowed to see.
    Row-level access mirrors property_renewal_query but runs regardless of DocType
    permissions so MD/CFO (identified via settings) receive full visibility.
    """
    import json as _json
 
    ctx = _get_property_user_context()
    user = ctx["user"]
 
    has_full_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["has_property_dept"] or ctx["has_gl_team"] or ctx["is_licensing"]
    )
 
    approver_props = []
    if not has_full_access:
        approver_props = frappe.get_all(
            "JH Property Master",
            or_filters=[["approver_1", "=", user], ["approver_2", "=", user]],
            pluck="name",
            ignore_permissions=True,
        )
        if not approver_props:
            frappe.throw(_("Not permitted"), frappe.PermissionError)
 
    filters = {}
 
    if workflow_states:
        states = _json.loads(workflow_states) if isinstance(workflow_states, str) else workflow_states
        if states:
            filters["workflow_state"] = ["in", states]
 
    if divisions:
        divs = _json.loads(divisions) if isinstance(divisions, str) else divisions
        if divs:
            filters["division"] = ["in", divs]
 
    if search:
        filters["property"] = ["like", f"%{search}%"]
 
    if property:
        filters["property"] = property
 
    limit = cint(limit)
    page = cint(page)
    start = (page - 1) * limit
 
    RENEWAL_FIELDS = [
        "name", "property", "current_rent", "proposed_rent",
        "rent_change_percent", "renewal_from", "renewal_to",
        "division", "workflow_state", "modified",
    ]
 
    # Licensing-only: scope to owned docs. Approver-only: scope to their properties.
    # Licensing + approver: union of both.
    if not has_full_access:
        if ctx["is_licensing"] and approver_props:
            seen = set()
            results = []
            for extra_filter in [
                {**filters, "owner": user},
                {**filters, "property": ["in", approver_props]},
            ]:
                rows = frappe.get_all(
                    "JH Property Rental Renewal",
                    filters=extra_filter,
                    fields=RENEWAL_FIELDS,
                    order_by="modified desc",
                    ignore_permissions=True,
                )
                for r in rows:
                    if r["name"] not in seen:
                        seen.add(r["name"])
                        results.append(r)
            total = len(results)
            records = results[start: start + limit]
            return {"renewals": records, "total": total}
        elif ctx["is_licensing"]:
            filters["owner"] = user
        elif approver_props:
            filters["property"] = ["in", approver_props]
 
    records = frappe.get_all(
        "JH Property Rental Renewal",
        filters=filters,
        fields=RENEWAL_FIELDS,
        limit=limit,
        start=start,
        order_by="modified asc",
        ignore_permissions=True,
    )
    total = frappe.db.count("JH Property Rental Renewal", filters=filters, cache=False)
 
    return {"renewals": records, "total": total}
 
 
@frappe.whitelist(methods=["GET"])
def get_property_doc(name: str):
    """
    Returns a single JH Property Master document.
    Bypasses DocType-level role check so MD/CFO can open property detail sheets.
    """
    if not name:
        frappe.throw(_("name is required"))
 
    ctx = _get_property_user_context()
    user = ctx["user"]
 
    has_full_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["has_property_dept"] or ctx["has_gl_team"] or ctx["is_licensing"]
    )
 
    if not has_full_access:
        approvers = frappe.db.get_value(
            "JH Property Master", name, ["approver_1", "approver_2"], as_dict=True,
        )
        if not approvers or user not in [approvers.approver_1, approvers.approver_2]:
            frappe.throw(_("Not permitted"), frappe.PermissionError)
 
    frappe.flags.ignore_permissions = True
    try:
        doc = frappe.get_doc("JH Property Master", name)
    finally:
        frappe.flags.ignore_permissions = False
    return {"doc": doc.as_dict()}
 
 
@frappe.whitelist(methods=["GET"])
def get_renewal_doc(name: str):
    """
    Returns a single JH Property Rental Renewal document.
    Bypasses DocType-level role check so MD/CFO can open renewal detail sheets.
    """
    if not name:
        frappe.throw(_("name is required"))
 
    ctx = _get_property_user_context()
    user = ctx["user"]
 
    frappe.flags.ignore_permissions = True
    try:
        renewal = frappe.get_doc("JH Property Rental Renewal", name)
    finally:
        frappe.flags.ignore_permissions = False
 
    has_full_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["has_property_dept"] or ctx["has_gl_team"] or ctx["is_licensing"]
    )
 
    if not has_full_access:
        is_approver = False
        if renewal.property:
            approvers = frappe.db.get_value(
                "JH Property Master", renewal.property,
                ["approver_1", "approver_2"], as_dict=True,
            ) or frappe._dict()
            is_approver = user in [approvers.approver_1, approvers.approver_2]
        if not is_approver:
            frappe.throw(_("Not permitted"), frappe.PermissionError)
 
    return {"doc": renewal.as_dict()}
 
 
@frappe.whitelist(methods=["GET"])
def has_property_automation_role():
    user = frappe.session.user
 
    if user == "Administrator":
        return {"has_access": True}
 
    user_roles = set(frappe.get_roles(user))
    settings = frappe.get_single("JH Digitrack Settings")
 
    has_access = (
        "JH Digitrack Admin" in user_roles
        or "JH Property Department" in user_roles
        or "JH GL Team" in user_roles
        or "JH Licensing Team" in user_roles
        or user == settings.cfo_user
        or user == settings.md_user
        or frappe.db.count("JH Property Master", filters={"approver_1": user}) > 0
        or frappe.db.count("JH Property Master", filters={"approver_2": user}) > 0
    )
 
    return {"has_access": has_access}
 
 
@frappe.whitelist(methods=["GET"])
def get_logged_in_property_user():
    user = frappe.session.user
    user_roles = set(frappe.get_roles(user))
    settings = frappe.get_single("JH Digitrack Settings")
    is_administrator = user == "Administrator"
    is_module_admin = is_administrator or "JH Digitrack Admin" in user_roles
    is_cfo = is_administrator or user == settings.cfo_user
    is_md = is_administrator or user == settings.md_user
    has_property_dept_role = is_administrator or "JH Property Department" in user_roles
    has_gl_team_role = is_administrator or "JH GL Team" in user_roles
    is_licensing = is_administrator or "JH Licensing Team" in user_roles
 
    is_approver_1 = bool(frappe.db.count("JH Property Master", filters={"approver_1": user}))
    is_approver_2 = bool(frappe.db.count("JH Property Master", filters={"approver_2": user}))
    is_approver = is_approver_1 or is_approver_2
 
    return {
        "user": user,
        "has_property_access": (
            is_module_admin
            or has_property_dept_role
            or has_gl_team_role
            or is_licensing
            or is_cfo
            or is_md
            or is_approver
        ),
        "has_property_dept_role": has_property_dept_role,
        "has_gl_team_role": has_gl_team_role,
        "is_module_admin": is_module_admin,
        "is_cfo": is_cfo,
        "is_md": is_md,
        "is_licensing": is_licensing,
        "is_approver": is_approver,
        "is_approver_1": is_approver_1,
        "is_approver_2": is_approver_2,
        "roles": sorted(user_roles),
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
 
    frappe.flags.ignore_permissions = True
    try:
        renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    finally:
        frappe.flags.ignore_permissions = False
 
    if renewal.property:
        approvers = frappe.db.get_value(
            "JH Property Master", renewal.property,
            ["approver_1", "approver_2"], as_dict=True,
        ) or frappe._dict()
        if user == approvers.approver_1:
            matches.add("approver_1")
        if user == approvers.approver_2:
            matches.add("approver_2")
 
    for role in ROLE_PRIORITY:
        if role in matches:
            return {"role": role}
 
    frappe.throw(_("You are not allowed to access property renewal workflow."))
 
 
def get_org_role_users():
    settings = frappe.get_single("JH Digitrack Settings")
 
    return {
        "cfo_user": settings.cfo_user,
        "md_user": settings.md_user,
    }
 
 
def get_user_workflow_roles(renewal):
    user = frappe.session.user
 
    if user == "Administrator":
        return {"Administrator"}
 
    user_roles = set(frappe.get_roles(user))
    matches = set()
    org_role_users = get_org_role_users()
 
    if "JH Digitrack Admin" in user_roles:
        matches.add("module_admin")
    if "JH Property Department" in user_roles:
        matches.add("property_dept")
    if "JH GL Team" in user_roles:
        matches.add("gl_team")
    if user == org_role_users.get("cfo_user"):
        matches.add("cfo")
    if user == org_role_users.get("md_user"):
        matches.add("md")
 
    if renewal.property:
        approvers = frappe.db.get_value(
            "JH Property Master", renewal.property,
            ["approver_1", "approver_2"], as_dict=True,
        ) or frappe._dict()
        if user == approvers.approver_1:
            matches.add("approver_1")
        if user == approvers.approver_2:
            matches.add("approver_2")
 
    return matches
 
 
def get_permitted_actions(renewal):
    current_state = renewal.workflow_state or "Draft"
    user_workflow_roles = get_user_workflow_roles(renewal)
    allowed_roles = STATE_ROLE_MAP.get(current_state, set())
 
    if not user_workflow_roles.intersection(allowed_roles):
        return []
 
    actions = []
    if current_state in WORKFLOW_TRANSITIONS.get("approve", {}):
        actions.append("approve")
    if current_state in SENDBACK_TRANSITIONS:
        actions.append("sendback")
    if current_state in WORKFLOW_TRANSITIONS.get("withdraw", {}):
        actions.append("withdraw")
    return actions
 
 
@frappe.whitelist(methods=["GET", "POST"])
def get_allowed_actions(renewal_id: str):
    if not renewal_id:
        frappe.throw(_("renewal_id is required"))
 
    frappe.flags.ignore_permissions = True
    try:
        renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    finally:
        frappe.flags.ignore_permissions = False
    allowed_actions = get_permitted_actions(renewal)
 
    return {
        "actions": allowed_actions,
        "sendback_options": list(SENDBACK_TRANSITIONS.get(renewal.workflow_state or "Draft", [])),
    }
 
 
def notify_md(renewal):
    settings = frappe.get_single("JH Digitrack Settings")
 
    if not settings.md_user:
       frappe.logger().warning("MD user not set. Skipping email.")
       return
 
    try:
        frappe.sendmail(
            recipients=[settings.md_user],
            subject="Rental Renewal Approved (No MD Approval Required)",
            message=f"""
            Rental Renewal <b>{frappe.utils.escape_html(renewal.name)}</b> has been approved by CFO.<br><br>
            Rent change is ≤ 5%, so MD approval is not required.<br><br>
            This is for your information.
            """
        )
    except Exception as e:
        frappe.logger().error(f"Failed to send MD notification: {str(e)}")
 
def update_property_master_renewal_date(renewal):
    if renewal.workflow_state != "Completed" or not renewal.property or not renewal.renewal_to:
        return
 
    frappe.db.set_value("JH Property Master", renewal.property, {
        "renewal_date": renewal.renewal_to,
        "current_rent": renewal.proposed_rent,
    })
 
 
@frappe.whitelist(methods=["GET"])
def get_division_gm(division: str = None, property: str = None, renewal_id: str = None):
    if not any([division, property, renewal_id]):
        frappe.throw(_("One of division, property, or renewal_id is required"))
 
    resolved_division = division
 
    if not resolved_division and property:
        resolved_division = frappe.db.get_value("JH Property Master", property, "division_used")
 
    if not resolved_division and renewal_id:
        renewal_data = frappe.db.get_value(
            "JH Property Rental Renewal", renewal_id,
            ["division", "property"], as_dict=True,
        ) or frappe._dict()
        resolved_division = renewal_data.division
        if not resolved_division and renewal_data.property:
            resolved_division = frappe.db.get_value(
                "JH Property Master", renewal_data.property, "division_used",
            )
 
    if not resolved_division:
        frappe.throw(_("Division could not be resolved"))
 
    gm_user = frappe.db.get_value("JH Division Master", resolved_division, "division_gm")
 
    return {
        "division": resolved_division,
        "gm_user": gm_user,
    }
 
 
@frappe.whitelist(methods=["GET"])
def get_my_pending_renewals():
    """
    Returns the actual renewal records where the logged-in user is the next actor.
    Uses ignore_permissions=True because approvers have no DocType-level read role —
    actor filtering is enforced here instead.
    """
    user = frappe.session.user
    user_roles = set(frappe.get_roles(user))
 
    cfo_user = frappe.db.get_single_value("JH Digitrack Settings", "cfo_user")
    md_user = frappe.db.get_single_value("JH Digitrack Settings", "md_user")
 
    is_admin = user == "Administrator" or "JH Digitrack Admin" in user_roles
 
    RENEWAL_FIELDS = [
        "name", "property", "current_rent", "proposed_rent",
        "rent_change_percent", "renewal_from", "renewal_to",
        "division", "workflow_state", "modified",
    ]
 
    # Admins see all active (non-terminal) renewals
    if is_admin:
        renewals = frappe.get_all(
            "JH Property Rental Renewal",
            filters={"workflow_state": ["not in", ["Completed", "Rejected"]]},
            fields=RENEWAL_FIELDS,
            ignore_permissions=True,
        )
        return {"renewals": renewals}
 
    # Build a set of (workflow_state, optional property restriction) clauses
    # We'll collect results per segment and union them.
    seen = set()
    results = []
 
    def _fetch(filters):
        rows = frappe.get_all(
            "JH Property Rental Renewal",
            filters=filters,
            fields=RENEWAL_FIELDS,
            order_by="modified desc",
            ignore_permissions=True,
        )
        for r in rows:
            if r["name"] not in seen:
                seen.add(r["name"])
                results.append(r)
 
    if "JH Licensing Team" in user_roles:
        # Draft renewals should stay scoped to the logged-in licensing user.
        # Otherwise every licensing user sees everyone else's drafts under
        # "Pending My Action", which makes the filter feel broken.
        _fetch({"workflow_state": "Draft", "owner": user})
 
    if "JH Property Department" in user_roles:
        _fetch({"workflow_state": "Pending Cheque Details"})
        _fetch({"workflow_state": "Pending Property PO"})
 
    if "JH GL Team" in user_roles:
        _fetch({"workflow_state": "Pending MIRO"})
 
    if user == cfo_user:
        _fetch({"workflow_state": "Pending CFO"})
 
    if user == md_user:
        _fetch({"workflow_state": "Pending MD"})
 
    # Approver 1: only renewals for properties where this user is approver_1
    approver_1_props = frappe.get_all(
        "JH Property Master", filters={"approver_1": user}, pluck="name"
    )
    if approver_1_props:
        _fetch({
            "workflow_state": "Pending Approver 1",
            "property": ["in", approver_1_props],
        })
 
    # Approver 2: only renewals for properties where this user is approver_2
    approver_2_props = frappe.get_all(
        "JH Property Master", filters={"approver_2": user}, pluck="name"
    )
    if approver_2_props:
        _fetch({
            "workflow_state": "Pending Approver 2",
            "property": ["in", approver_2_props],
        })
 
    return {"renewals": results}
 
 
@frappe.whitelist(methods=["GET"])
def get_my_pending_filters():
    user = frappe.session.user
    user_roles = set(frappe.get_roles(user))
 
    cfo_user = frappe.db.get_single_value("JH Digitrack Settings", "cfo_user")
    md_user = frappe.db.get_single_value("JH Digitrack Settings", "md_user")
 
    # Admins see all active renewals
    if user == "Administrator" or "JH Digitrack Admin" in user_roles:
        return {
            "filters": [
                ["JH Property Rental Renewal", "workflow_state", "in", [
                    "Draft", "Pending Approver 1", "Pending Approver 2",
                    "Pending Cheque Details", "Pending CFO", "Pending MD",
                    "Pending Property PO", "Pending MIRO",
                ]]
            ]
        }
 
    pending_states = []
 
    if "JH Licensing Team" in user_roles:
        pending_states.append("Draft")
    if "JH Property Department" in user_roles:
        pending_states.extend(["Pending Cheque Details", "Pending Property PO"])
    if "JH GL Team" in user_roles:
        pending_states.append("Pending MIRO")
    if user == cfo_user:
        pending_states.append("Pending CFO")
    if user == md_user:
        pending_states.append("Pending MD")
 
    # Per-property approver roles
    approver_1_props = frappe.get_all(
        "JH Property Master", filters={"approver_1": user}, pluck="name"
    )
    approver_2_props = frappe.get_all(
        "JH Property Master", filters={"approver_2": user}, pluck="name"
    )
    approver_properties = list(set(approver_1_props + approver_2_props))
 
    if approver_1_props:
        pending_states.append("Pending Approver 1")
    if approver_2_props:
        pending_states.append("Pending Approver 2")
 
    if not pending_states:
        return {"filters": []}
 
    filters = [
        ["JH Property Rental Renewal", "workflow_state", "in", list(set(pending_states))]
    ]
 
    # If the user's only pending role is as a property-specific approver,
    # also restrict by the properties they are assigned to.
    only_approver_states = set(pending_states) <= {"Pending Approver 1", "Pending Approver 2"}
    if only_approver_states and approver_properties:
        filters.append(
            ["JH Property Rental Renewal", "property", "in", approver_properties]
        )
 
    return {"filters": filters}
 
 
@frappe.whitelist(methods=["GET"])
def get_renewal_audit_trail(renewal_id: str):
    if not renewal_id:
        frappe.throw(_("renewal_id is required"))
 
    trail = frappe.get_all(
        "JH Property Renewal Audit",
        filters={"parent": renewal_id, "parenttype": "JH Property Rental Renewal"},
        fields=["user", "role", "current_state", "changed_state", "action", "comments", "action_time"],
        order_by="action_time asc",
        ignore_permissions=True,
    )
 
    return {"audit_trail": trail}
 
 
@frappe.whitelist(methods=["GET"])
def calculate_rent_change_percent(current_rent=None, proposed_rent=None):
    current_rent = flt(current_rent)
    proposed_rent = flt(proposed_rent)
 
    if not current_rent:
        return {"rent_change_percent": 0}
 
    rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100
 
    return {"rent_change_percent": rent_change_percent}
 
 
@frappe.whitelist(methods=["POST"])
def apply_workflow_action(renewal_id: str, action: str, target_state: str = None, comment: str = ""):
    if not renewal_id:
        frappe.throw(_("renewal_id is required"))
 
    action = (action or "").strip().lower()
    frappe.flags.ignore_permissions = True
    try:
        renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    finally:
        frappe.flags.ignore_permissions = False
    current_state = renewal.workflow_state or "Draft"
    role = whoami(renewal_id=renewal_id, is_new=False).get("role")
 
    if action == "sendback":
        if target_state not in SENDBACK_TRANSITIONS.get(current_state, set()):
            frappe.throw(_("Invalid target state {0} for sendback from {1}").format(target_state, current_state))
        next_state = target_state
        if not comment:
            frappe.throw(_("Comment is required for sendback"))
    else:
        if action not in WORKFLOW_TRANSITIONS:
            frappe.throw(_("Unsupported workflow action: {0}").format(action))
        transition = WORKFLOW_TRANSITIONS[action].get(current_state)
        if not transition:
            frappe.throw(_("Action {0} is not allowed when workflow state is {1}").format(action, current_state))
        if role not in transition["roles"]:
            frappe.throw(_("Role {0} is not allowed to {1} a renewal in state {2}").format(role, action, current_state))
        next_state = transition["next_state"]
        if current_state == "Pending CFO" and action == "approve":
            current_rent = flt(renewal.current_rent)
            proposed_rent = flt(renewal.proposed_rent)
            rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100 if current_rent else 0
            if rent_change_percent > 5:
                next_state = "Pending MD"
            else:
                next_state = "Pending Cheque Details"
                notify_md(renewal)
 
    renewal.append(
        "audit_trail",
        {
            "user": frappe.session.user,
            "role": role,
            "current_state": current_state,
            "changed_state": next_state,
            "action": action.title(),
            "comments": comment,
            "action_time": frappe.utils.now_datetime(),
        },
    )
    renewal.flags.ignore_validate_update_after_submit = True
    renewal.workflow_state = next_state
    renewal.save(ignore_permissions=True)
    update_property_master_renewal_date(renewal)
 
    return {
        "name": renewal.name,
        "role": role,
        "previous_state": current_state,
        "workflow_state": renewal.workflow_state,
    }
 