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
    "Draft": {"licensing", "module_admin", "Administrator"},
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
        "Pending Approver 1": {"roles": {"approver_1"}, "next_state": "Withdrawn"},
        "Pending Approver 2": {"roles": {"approver_2"}, "next_state": "Withdrawn"},
        "Pending CFO": {"roles": {"cfo"}, "next_state": "Withdrawn"},
        "Pending MD": {"roles": {"md"}, "next_state": "Withdrawn"},
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
            "next_state": "Withdrawn",
        },
        "Pending Approver 2": {
            "roles": {"approver_2", "module_admin", "Administrator"},
            "next_state": "Withdrawn",
        },
        "Pending Cheque Details": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Withdrawn",
        },
        "Pending CFO": {
            "roles": {"cfo", "module_admin", "Administrator"},
            "next_state": "Withdrawn",
        },
        "Pending MD": {
            "roles": {"md", "module_admin", "Administrator"},
            "next_state": "Withdrawn",
        },
        "Pending Property PO": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Withdrawn",
        },
        "Pending MIRO": {
            "roles": {"gl_team", "module_admin", "Administrator"},
            "next_state": "Withdrawn",
        },
    },
}
 
 
def _get_active_delegators(user, delegation_types=None):
    """Returns list of users who have an active delegation to `user`."""
    filters = {"delegate": user, "status": "Active"}
    if delegation_types:
        filters["delegation_type"] = ["in", list(delegation_types)]

    return frappe.get_all(
        "JH Delegation",
        filters=filters,
        pluck="delegator",
        ignore_permissions=True,
    )


def _get_standing_delegators(user):
    """Returns delegators whose Temporary/Permanent delegation grants standing authority."""
    return _get_active_delegators(user, {"Temporary", "Permanent"})


def _get_adhoc_delegated_renewals(user, statuses=None):
    """Returns renewal names delegated to `user` via Ad-Hoc delegation."""
    if statuses is None:
        statuses = ["Active"]
    renewal_names = frappe.get_all(
        "JH Delegation",
        filters={
            "delegate": user,
            "status": ["in", statuses],
            "delegation_type": "Ad-Hoc",
            "reference_doctype": "JH Property Rental Renewal",
        },
        pluck="reference_name",
        ignore_permissions=True,
    )
    return [name for name in renewal_names if name]


def _get_adhoc_delegated_properties(user, statuses=None):
    """Returns property names linked to renewals delegated to `user` via Ad-Hoc."""
    delegated_renewals = _get_adhoc_delegated_renewals(user, statuses=statuses)
    if not delegated_renewals:
        return []

    properties = frappe.get_all(
        "JH Property Rental Renewal",
        filters={
            "name": ["in", delegated_renewals],
        },
        pluck="property",
        ignore_permissions=True,
    )
    return [property_name for property_name in properties if property_name]


def _get_visible_adhoc_renewals(user):
    """Returns renewal names delegated to `user` via Ad-Hoc (Active or Expired)."""
    return _get_adhoc_delegated_renewals(user, statuses=["Active", "Expired"])


def _get_visible_adhoc_properties(user):
    """Returns property names linked to renewals delegated to `user` via Ad-Hoc (Active or Expired)."""
    return _get_adhoc_delegated_properties(user, statuses=["Active", "Expired"])


def _has_adhoc_delegated_property(user, property_name):
    """Returns True if `user` has an Ad-Hoc renewal delegation (Active or Expired) for this property."""
    return property_name in _get_visible_adhoc_properties(user)


def _get_approver_properties(user):
    """Returns property names where user or a standing delegator is approver_1 or approver_2."""
    props = set(frappe.get_all(
        "JH Property Master",
        or_filters=[["approver_1", "=", user], ["approver_2", "=", user]],
        pluck="name",
        ignore_permissions=True,
    ))
    for delegator in _get_standing_delegators(user):
        props.update(frappe.get_all(
            "JH Property Master",
            or_filters=[["approver_1", "=", delegator], ["approver_2", "=", delegator]],
            pluck="name",
            ignore_permissions=True,
        ))
    return list(props)


def _get_property_user_context():
    """
    Returns a dict of booleans describing the current user's property access level.
    MD and CFO are resolved from JH Digitrack Settings — not from Frappe roles —
    so they get access even if they only hold JH Digitrack Member.
    Delegation is also checked: if a delegator has a qualifying role, the delegate inherits it.
    """
    user = frappe.session.user
    user_roles = set(frappe.get_roles(user))
    settings = frappe.get_single("JH Digitrack Settings")
    is_administrator = user == "Administrator"

    ctx = {
        "user": user,
        "is_admin": is_administrator or "JH Digitrack Admin" in user_roles,
        "is_md": is_administrator or user == settings.md_user,
        "is_cfo": is_administrator or user == settings.cfo_user,
        "has_property_dept": is_administrator or "JH Property Department" in user_roles,
        "has_gl_team": is_administrator or "JH GL Team" in user_roles,
        "is_licensing": is_administrator or "JH Licensing Team" in user_roles,
    }

    has_direct_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["has_property_dept"] or ctx["has_gl_team"] or ctx["is_licensing"]
    )

    if not has_direct_access and not is_administrator:
        for delegator in _get_standing_delegators(user):
            delegator_roles = set(frappe.get_roles(delegator))
            if "JH Digitrack Admin" in delegator_roles:
                ctx["is_admin"] = True
            if delegator == settings.cfo_user:
                ctx["is_cfo"] = True
            if delegator == settings.md_user:
                ctx["is_md"] = True
            if "JH Property Department" in delegator_roles:
                ctx["has_property_dept"] = True
            if "JH GL Team" in delegator_roles:
                ctx["has_gl_team"] = True
            if "JH Licensing Team" in delegator_roles:
                ctx["is_licensing"] = True

    return ctx
 
 
@frappe.whitelist(methods=["GET"])
def get_property_list(
    search=None,
    emirate=None,
    type_of_property=None,
    division=None,
    expiring_soon=None,
    renewal_filter=None,
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
 
    if not has_full_access:
        approver_props = _get_approver_properties(user)
        has_adhoc_delegation = bool(_get_visible_adhoc_properties(user))
        if not approver_props and not has_adhoc_delegation:
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
 
    from frappe.utils import add_days, today
    today_str = today()
 
    if renewal_filter:
        if renewal_filter == "30":
            filters["renewal_date"] = ["between", [today_str, add_days(today_str, 30)]]
        elif renewal_filter == "60":
            filters["renewal_date"] = ["between", [today_str, add_days(today_str, 60)]]
        elif renewal_filter == "90":
            filters["renewal_date"] = ["between", [today_str, add_days(today_str, 90)]]
        elif renewal_filter == "overdue":
            filters["renewal_date"] = ["<", today_str]
    elif expiring_soon:
        filters["renewal_date"] = ["between", [today_str, add_days(today_str, 90)]]
 
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
def get_property_dashboard_counts():
    """
    Returns dashboard counts for properties.
    Applies the same permission logic as get_property_list.
    """
    from frappe.utils import add_days, today
 
    ctx = _get_property_user_context()
    user = ctx["user"]
 
    has_full_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["has_property_dept"] or ctx["has_gl_team"] or ctx["is_licensing"]
    )
 
    base_filters = {}
    if not has_full_access:
        approver_props = _get_approver_properties(user)
        has_adhoc_delegation = bool(_get_visible_adhoc_renewals(user))
        if not approver_props and not has_adhoc_delegation:
            frappe.throw(_("Not permitted"), frappe.PermissionError)

    today_str = today()

    # Properties with an in-progress renewal are excluded from upcoming/overdue
    # buckets — they don't need a new renewal started.
    properties_with_active_renewal = frappe.get_all(
        "JH Property Rental Renewal",
        filters={"workflow_state": ["not in", ["Completed", "Withdrawn"]]},
        pluck="property",
        ignore_permissions=True,
    )

    def _count(extra_filters=None):
        filters = {**base_filters}
        if extra_filters:
            filters.update(extra_filters)
        return frappe.db.count("JH Property Master", filters=filters, cache=False)

    def _count_without_active(extra_filters=None):
        filters = {**base_filters}
        if extra_filters:
            filters.update(extra_filters)
        if properties_with_active_renewal:
            filters["name"] = ["not in", properties_with_active_renewal]
        return frappe.db.count("JH Property Master", filters=filters, cache=False)

    total_properties = _count()

    renewals_30_days = _count_without_active({
        "renewal_date": ["between", [today_str, add_days(today_str, 30)]]
    })

    renewals_60_days = _count_without_active({
        "renewal_date": ["between", [today_str, add_days(today_str, 60)]]
    })

    renewals_90_days = _count_without_active({
        "renewal_date": ["between", [today_str, add_days(today_str, 90)]]
    })

    overdue = _count_without_active({
        "renewal_date": ["<", today_str]
    })
 
    return {
        "total_properties": total_properties,
        "renewals_30_days": renewals_30_days,
        "renewals_60_days": renewals_60_days,
        "renewals_90_days": renewals_90_days,
        "overdue": overdue,
    }
 
 
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
    adhoc_renewals = []
    if not has_full_access:
        approver_props = _get_approver_properties(user)
        adhoc_renewals = _get_visible_adhoc_renewals(user)
        if not approver_props and not adhoc_renewals:
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
 
    # Standing approver access is property-scoped. Ad-Hoc delegation is document-scoped.
    if not has_full_access:
        if approver_props and adhoc_renewals:
            seen = set()
            results = []
            for extra_filter in [
                {**filters, "property": ["in", approver_props]},
                {**filters, "name": ["in", adhoc_renewals]},
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
        elif adhoc_renewals:
            filters["name"] = ["in", adhoc_renewals]
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
        has_property_access = bool(_get_approver_properties(user) or _get_visible_adhoc_properties(user))
        if not has_property_access:
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
        # Check direct approver assignment and delegation
        is_approver = renewal.name in _get_visible_adhoc_renewals(user)
        if renewal.property:
            approvers = frappe.db.get_value(
                "JH Property Master", renewal.property,
                ["approver_1", "approver_2"], as_dict=True,
            ) or frappe._dict()
            is_approver = is_approver or user in [approvers.approver_1, approvers.approver_2]
            # Also check if user is a delegate for either approver
            if not is_approver:
                from jh_digitrack.api.helpers.delegation import resolve_effective_user
                if resolve_effective_user(delegate=user, delegator=approvers.approver_1, document=renewal):
                    is_approver = True
                elif resolve_effective_user(delegate=user, delegator=approvers.approver_2, document=renewal):
                    is_approver = True
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
    
    if not has_access:
        for delegator in _get_standing_delegators(user):
            delegator_roles = set(frappe.get_roles(delegator))
            if (
                "JH Digitrack Admin" in delegator_roles
                or "JH Property Department" in delegator_roles
                or "JH GL Team" in delegator_roles
                or "JH Licensing Team" in delegator_roles
                or delegator == settings.cfo_user
                or delegator == settings.md_user
                or frappe.db.count("JH Property Master", filters={"approver_1": delegator}) > 0
                or frappe.db.count("JH Property Master", filters={"approver_2": delegator}) > 0
            ):
                has_access = True
                break

    if not has_access and _get_visible_adhoc_renewals(user):
        has_access = True

    return {"has_access": has_access}


@frappe.whitelist(methods=["GET"])
def has_property_automation_nav_access():
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

    if not has_access:
        for delegator in _get_standing_delegators(user):
            delegator_roles = set(frappe.get_roles(delegator))
            if (
                "JH Digitrack Admin" in delegator_roles
                or "JH Property Department" in delegator_roles
                or "JH GL Team" in delegator_roles
                or "JH Licensing Team" in delegator_roles
                or delegator == settings.cfo_user
                or delegator == settings.md_user
                or frappe.db.count("JH Property Master", filters={"approver_1": delegator}) > 0
                or frappe.db.count("JH Property Master", filters={"approver_2": delegator}) > 0
            ):
                has_access = True
                break

    if not has_access and _get_visible_adhoc_renewals(user):
        has_access = True

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
    has_adhoc_delegation = bool(_get_adhoc_delegated_renewals(user))
    has_visible_adhoc_renewal = bool(_get_visible_adhoc_renewals(user))

    # Extend flags via standing (Temporary/Permanent) delegation
    has_standing_delegation = False
    if not is_administrator:
        for delegator in _get_standing_delegators(user):
            has_standing_delegation = True
            delegator_roles = set(frappe.get_roles(delegator))
            if not is_module_admin and "JH Digitrack Admin" in delegator_roles:
                is_module_admin = True
            if not is_cfo and delegator == settings.cfo_user:
                is_cfo = True
            if not is_md and delegator == settings.md_user:
                is_md = True
            if not has_property_dept_role and "JH Property Department" in delegator_roles:
                has_property_dept_role = True
            if not has_gl_team_role and "JH GL Team" in delegator_roles:
                has_gl_team_role = True
            if not is_licensing and "JH Licensing Team" in delegator_roles:
                is_licensing = True
            if not is_approver_1 and frappe.db.count("JH Property Master", filters={"approver_1": delegator}):
                is_approver_1 = True
                is_approver = True
            if not is_approver_2 and frappe.db.count("JH Property Master", filters={"approver_2": delegator}):
                is_approver_2 = True
                is_approver = True

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
            or has_adhoc_delegation
            or has_standing_delegation
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
        "has_adhoc_delegation": has_adhoc_delegation,
        "has_standing_delegation": has_standing_delegation,
        "has_visible_adhoc_renewal": has_visible_adhoc_renewal,
        "roles": sorted(user_roles),
    }
 
 
def get_org_role_users():
    settings = frappe.get_single("JH Digitrack Settings")
 
    return {
        "cfo_user": settings.cfo_user,
        "md_user": settings.md_user,
    }
 
 
def _get_effective_roles(user, renewal=None):
    """
    Returns all workflow roles the user can act as, including via delegation.
    When renewal is provided, Ad-Hoc delegation is also checked.
    Returns: (roles_set, behalf_map)
    """
    if user == "Administrator":
        return {"Administrator"}, {}
 
    user_roles = set(frappe.get_roles(user))
    matches = set()
    behalf_map = {}
    org_role_users = get_org_role_users()
    cfo_user = org_role_users.get("cfo_user")
    md_user = org_role_users.get("md_user")
 
    from jh_digitrack.api.helpers.delegation import resolve_effective_user
 
    def add_frappe_role_match(frappe_role, workflow_role):
        if frappe_role in user_roles:
            matches.add(workflow_role)
            return

        for delegator in _get_active_delegators(user):
            if frappe_role not in set(frappe.get_roles(delegator)):
                continue
            if resolve_effective_user(delegate=user, delegator=delegator, document=renewal):
                matches.add(workflow_role)
                behalf_map[workflow_role] = delegator
                return

    # Frappe role-based workflow roles with delegation support
    add_frappe_role_match("JH Digitrack Admin", "module_admin")
    add_frappe_role_match("JH Property Department", "property_dept")
    add_frappe_role_match("JH GL Team", "gl_team")
    add_frappe_role_match("JH Licensing Team", "licensing")
 
    # Settings-based roles with delegation support. Ad-Hoc delegation is
    # document-specific, so pass the renewal when resolving these roles.
    if user == cfo_user:
        matches.add("cfo")
    elif resolve_effective_user(delegate=user, delegator=cfo_user, document=renewal):
        matches.add("cfo")
        behalf_map["cfo"] = cfo_user
 
    if user == md_user:
        matches.add("md")
    elif resolve_effective_user(delegate=user, delegator=md_user, document=renewal):
        matches.add("md")
        behalf_map["md"] = md_user
 
    # Property-specific approver roles with delegation support
    if renewal and renewal.property:
        approvers = frappe.db.get_value(
            "JH Property Master", renewal.property,
            ["approver_1", "approver_2"], as_dict=True,
        ) or frappe._dict()
 
        if user == approvers.approver_1:
            matches.add("approver_1")
        elif resolve_effective_user(delegate=user, delegator=approvers.approver_1, document=renewal):
            matches.add("approver_1")
            behalf_map["approver_1"] = approvers.approver_1
 
        if user == approvers.approver_2:
            matches.add("approver_2")
        elif resolve_effective_user(delegate=user, delegator=approvers.approver_2, document=renewal):
            matches.add("approver_2")
            behalf_map["approver_2"] = approvers.approver_2
 
    return matches, behalf_map
 
 
@frappe.whitelist(methods=["GET"])
def whoami(renewal_id: str = None, is_new: bool = False):
    user = frappe.session.user
    if user == "Administrator":
        return {"role": "Administrator"}
 
    is_new = bool(cint(is_new))
 
    if is_new:
        matches, behalf_map = _get_effective_roles(user)
        for role in ROLE_PRIORITY:
            if role in matches:
                return {"role": role, "on_behalf_of": behalf_map.get(role)}
        frappe.throw(_("You are not allowed to access property renewal workflow."))
 
    if not renewal_id:
        frappe.throw(_("renewal_id is required when is_new is false"))
 
    frappe.flags.ignore_permissions = True
    try:
        renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    finally:
        frappe.flags.ignore_permissions = False
 
    matches, behalf_map = _get_effective_roles(user, renewal)
 
    for role in ROLE_PRIORITY:
        if role in matches:
            return {"role": role, "on_behalf_of": behalf_map.get(role)}
 
    frappe.throw(_("You are not allowed to access property renewal workflow."))
 
 
def get_user_workflow_roles(renewal):
    roles, _ = _get_effective_roles(frappe.session.user, renewal)
    return roles
 
 
def get_permitted_actions(renewal):
    current_state = renewal.workflow_state or "Draft"
    user_workflow_roles = get_user_workflow_roles(renewal)
    allowed_roles = STATE_ROLE_MAP.get(current_state, set())
 
    if not user_workflow_roles.intersection(allowed_roles):
        return []
 
    actions = []
    if current_state in WORKFLOW_TRANSITIONS.get("submit", {}):
        actions.append("submit")
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
 
 
@frappe.whitelist(methods=["GET"])
def get_renewal_role(renewal_id: str):
    """
    Returns the current user's effective role for a specific renewal,
    plus permitted actions so the frontend gates buttons on both role and state.
    """
    if not renewal_id:
        frappe.throw(_("renewal_id is required"))

    try:
        result = whoami(renewal_id=renewal_id, is_new=False)
    except frappe.PermissionError:
        user = frappe.session.user
        if renewal_id in _get_visible_adhoc_renewals(user):
            return {
                "role": "adhoc_viewer",
                "actions": [],
                "sendback_options": [],
            }
        raise

    frappe.flags.ignore_permissions = True
    try:
        renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    finally:
        frappe.flags.ignore_permissions = False
    allowed_actions = get_permitted_actions(renewal)
    result["actions"] = allowed_actions
    result["sendback_options"] = (
        list(SENDBACK_TRANSITIONS.get(renewal.workflow_state or "Draft", []))
        if allowed_actions else []
    )
    return result
 
 
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
            Rental Renewal <b>{frappe.utils.escape_html(renewal.name)}</b> has been approved by CFO.<br>
            Rent change is ≤ 5%, so MD approval is not required.<br>
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
            filters={"workflow_state": ["not in", ["Completed", "Withdrawn"]]},
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
 
    def _fetch_for_actor(actor, actor_roles):
        if "JH Licensing Team" in actor_roles:
            _fetch({"workflow_state": "Draft"})

        if "JH Property Department" in actor_roles:
            _fetch({"workflow_state": "Pending Cheque Details"})
            _fetch({"workflow_state": "Pending Property PO"})

        if "JH GL Team" in actor_roles:
            _fetch({"workflow_state": "Pending MIRO"})

        if actor == cfo_user:
            _fetch({"workflow_state": "Pending CFO"})

        if actor == md_user:
            _fetch({"workflow_state": "Pending MD"})

        a1_props = frappe.get_all(
            "JH Property Master", filters={"approver_1": actor},
            pluck="name", ignore_permissions=True,
        )
        if a1_props:
            _fetch({"workflow_state": "Pending Approver 1", "property": ["in", a1_props]})

        a2_props = frappe.get_all(
            "JH Property Master", filters={"approver_2": actor},
            pluck="name", ignore_permissions=True,
        )
        if a2_props:
            _fetch({"workflow_state": "Pending Approver 2", "property": ["in", a2_props]})

    _fetch_for_actor(user, user_roles)

    for delegator in _get_standing_delegators(user):
        _fetch_for_actor(delegator, set(frappe.get_roles(delegator)))

    adhoc_renewals = _get_adhoc_delegated_renewals(user)
    if adhoc_renewals:
        adhoc_rows = frappe.get_all(
            "JH Property Rental Renewal",
            filters={
                "name": ["in", adhoc_renewals],
                "workflow_state": ["not in", ["Completed", "Withdrawn"]],
            },
            fields=RENEWAL_FIELDS,
            order_by="modified desc",
            ignore_permissions=True,
        )
        for r in adhoc_rows:
            if r["name"] not in seen:
                frappe.flags.ignore_permissions = True
                try:
                    renewal_doc = frappe.get_doc("JH Property Rental Renewal", r["name"])
                finally:
                    frappe.flags.ignore_permissions = False
                if get_permitted_actions(renewal_doc):
                    seen.add(r["name"])
                    results.append(r)

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
        fields=["user", "on_behalf_of", "role", "current_state", "changed_state", "action", "comments", "action_time"],
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
 
def _validate_stage_fields(renewal):
    state = renewal.workflow_state

    if state == "Pending Cheque Details":
        if not renewal.cheque_details:
            frappe.throw(_("At least one cheque detail row is required."))
        row = renewal.cheque_details[0]
        required = {
            "bank_name": _("Bank Name"),
            "cheque_number": _("Cheque Number"),
            "cheque_date": _("Cheque Date"),
            "payee": _("Payee"),
            "signatory": _("Signatory"),
        }
        missing = [label for field, label in required.items() if not row.get(field)]
        if missing:
            frappe.throw(_("Missing required cheque fields: {0}").format(", ".join(missing)))
        if not flt(row.get("cheque_amount")):
            frappe.throw(_("Cheque Amount must be greater than zero."))

    elif state == "Pending Property PO":
        if not renewal.po_number:
            frappe.throw(_("PO Number is required."))
        if not renewal.renewed_contract_document:
            frappe.throw(_("Renewed Contract Document is required."))

    elif state == "Pending MIRO":
        if not renewal.miro_number:
            frappe.throw(_("MIRO Number is required."))


@frappe.whitelist(methods=["POST"])
def save_renewal_progress(
    renewal_id: str,
    bank_name: str = None,
    cheque_number: str = None,
    cheque_amount=None,
    cheque_date: str = None,
    payee: str = None,
    signatory: str = None,
    po_number: str = None,
    miro_number: str = None,
    renewed_contract_document: str = None,
):
    if not renewal_id:
        frappe.throw(_("renewal_id is required"))
 
    frappe.flags.ignore_permissions = True
    try:
        renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    finally:
        frappe.flags.ignore_permissions = False
 
    current_state = renewal.workflow_state or "Draft"
    role = whoami(renewal_id=renewal_id, is_new=False).get("role")
    allowed_roles = STATE_ROLE_MAP.get(current_state, set())
 
    if current_state not in {"Pending Cheque Details", "Pending Property PO", "Pending MIRO"}:
        frappe.throw(_("Progress can only be saved in cheque, PO, or MIRO stages."))
 
    if role not in allowed_roles:
        frappe.throw(
            _("Role {0} is not allowed to update a renewal in state {1}").format(role, current_state)
        )
 
    renewal.flags.ignore_validate_update_after_submit = True
 
    if current_state == "Pending Cheque Details":
        renewal.set("cheque_details", [])
        renewal.append(
            "cheque_details",
            {
                "bank_name": bank_name or "",
                "cheque_number": cheque_number or "",
                "cheque_amount": flt(cheque_amount),
                "cheque_date": cheque_date or "",
                "payee": payee or "",
                "signatory": signatory or "",
            },
        )
 
    if current_state == "Pending Property PO":
        renewal.po_number = po_number or ""
        if renewed_contract_document is not None:
            renewal.renewed_contract_document = renewed_contract_document or ""
 
    if current_state == "Pending MIRO":
        renewal.miro_number = miro_number or ""

    _validate_stage_fields(renewal)
    renewal.save(ignore_permissions=True)
 
    return {
        "name": renewal.name,
        "workflow_state": renewal.workflow_state,
        "modified": renewal.modified,
        "po_number": renewal.po_number,
        "miro_number": renewal.miro_number,
        "renewed_contract_document": renewal.renewed_contract_document
 
    }

@frappe.whitelist(methods=["POST"])
def apply_workflow_action(
    renewal_id: str,
    action: str,
    target_state: str = None,
    comment: str = "",
    expected_state: str = None,
):
    if not renewal_id:
        frappe.throw(_("renewal_id is required"))
 
    action = (action or "").strip().lower()
    frappe.flags.ignore_permissions = True
    try:
        renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    finally:
        frappe.flags.ignore_permissions = False
    current_state = renewal.workflow_state or "Draft"
    if expected_state and expected_state != current_state:
        frappe.throw(
            _("This renewal has already moved from {0} to {1}. Please refresh before taking action.")
            .format(expected_state, current_state)
        )

    whoami_result = whoami(renewal_id=renewal_id, is_new=False)
    role = whoami_result.get("role")
    on_behalf_of = whoami_result.get("on_behalf_of")

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
        if current_state == "Pending Approver 1" and action == "approve":
            approver_2 = frappe.db.get_value("JH Property Master", renewal.property, "approver_2") if renewal.property else None
            if not approver_2:
                next_state = "Pending CFO"
        if current_state == "Pending CFO" and action == "approve":
            current_rent = flt(renewal.current_rent)
            proposed_rent = flt(renewal.proposed_rent)
            rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100 if current_rent else 0
            if rent_change_percent > 5:
                next_state = "Pending MD"
            else:
                next_state = "Pending Cheque Details"
                notify_md(renewal)
        if action == "approve" and current_state in {"Pending Cheque Details", "Pending Property PO", "Pending MIRO"}:
            _validate_stage_fields(renewal)

    audit_comment = comment
    if on_behalf_of:
        delegate_name = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user
        delegator_name = frappe.db.get_value("User", on_behalf_of, "full_name") or on_behalf_of
        delegation_note = f"{action.title()} by {delegate_name} on behalf of {delegator_name}"
        audit_comment = f"{delegation_note}\n{comment}".strip() if comment else delegation_note

    renewal.append(
        "audit_trail",
        {
            "user": frappe.session.user,
            "on_behalf_of": on_behalf_of,
            "role": role,
            "current_state": current_state,
            "changed_state": next_state,
            "action": action.title(),
            "comments": audit_comment,
            "action_time": frappe.utils.now_datetime(),
        },
    )
    renewal.flags.ignore_validate_update_after_submit = True
    renewal.workflow_state = next_state
    renewal.step_entered_on = frappe.utils.now_datetime()
    renewal.last_tat_notification = None
    renewal.save(ignore_permissions=True)
    update_property_master_renewal_date(renewal)

    from jh_digitrack.api.helpers.delegation import expire_adhoc_delegations_for_document
    expire_adhoc_delegations_for_document(renewal)

    return {
        "name": renewal.name,
        "role": role,
        "previous_state": current_state,
        "workflow_state": renewal.workflow_state,
    }
 
