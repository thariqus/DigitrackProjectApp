import frappe
from frappe import _
from frappe.utils import cint, flt

ROLE_PRIORITY = [
    "module_admin",
    "cfo",
    "md",
    "admin_hod",
    "fc",
    "approver_1",
    "approver_2",
    "approver_3",
    "approver_4",
    "approver_5",
    "approver_6",
    "property_dept",
    "gl_team",
    "licensing",
]

ACTIVE_RENEWAL_STATES = [
    "Draft",
    "Pending Approver 1",
    "Pending Approver 2",
    "Pending Approver 3",
    "Pending Approver 4",
    "Pending Approver 5",
    "Pending Approver 6",
    "Pending Cheque Details",
    "Pending Admin HOD",
    "Pending FC",
    "Pending CFO",
    "Pending MD",
    "Pending Property PO",
    "Pending MIRO",
]

# Full set of possible sendback targets per state.
# Dynamic approver states that don't exist for a given property are filtered
# out by _get_valid_sendback_options() before being sent to the client.
_ALL_APPROVER_STATES = {
    "Pending Approver 1", "Pending Approver 2", "Pending Approver 3",
    "Pending Approver 4", "Pending Approver 5", "Pending Approver 6",
}

SENDBACK_TRANSITIONS = {
    "Pending Approver 1": {"Draft"},
    "Pending Approver 2": {"Pending Approver 1", "Draft"},
    "Pending Approver 3": {"Pending Approver 2", "Pending Approver 1", "Draft"},
    "Pending Approver 4": {"Pending Approver 3", "Pending Approver 2", "Pending Approver 1", "Draft"},
    "Pending Approver 5": {"Pending Approver 4", "Pending Approver 3", "Pending Approver 2", "Pending Approver 1", "Draft"},
    "Pending Approver 6": {"Pending Approver 5", "Pending Approver 4", "Pending Approver 3", "Pending Approver 2", "Pending Approver 1", "Draft"},
    "Pending Cheque Details": _ALL_APPROVER_STATES | {"Draft"},
    "Pending Admin HOD":      _ALL_APPROVER_STATES | {"Pending Cheque Details", "Draft"},
    "Pending FC":             _ALL_APPROVER_STATES | {"Pending Admin HOD", "Pending Cheque Details", "Draft"},
    "Pending CFO":            _ALL_APPROVER_STATES | {"Pending FC", "Pending Admin HOD", "Pending Cheque Details", "Draft"},
    "Pending MD":             _ALL_APPROVER_STATES | {"Pending CFO", "Pending FC", "Pending Admin HOD", "Pending Cheque Details", "Draft"},
    "Pending Property PO":    _ALL_APPROVER_STATES | {"Pending MD", "Pending CFO", "Pending FC", "Pending Admin HOD", "Pending Cheque Details", "Draft"},
    "Pending MIRO":           _ALL_APPROVER_STATES | {"Pending Property PO", "Pending MD", "Pending CFO", "Pending FC", "Pending Admin HOD", "Pending Cheque Details", "Draft"},
}

STATE_ROLE_MAP = {
    "Draft":                  {"licensing", "property_dept", "module_admin", "Administrator"},
    "Pending Approver 1":     {"approver_1", "module_admin", "Administrator"},
    "Pending Approver 2":     {"approver_2", "module_admin", "Administrator"},
    "Pending Approver 3":     {"approver_3", "module_admin", "Administrator"},
    "Pending Approver 4":     {"approver_4", "module_admin", "Administrator"},
    "Pending Approver 5":     {"approver_5", "module_admin", "Administrator"},
    "Pending Approver 6":     {"approver_6", "module_admin", "Administrator"},
    "Pending Cheque Details": {"property_dept", "module_admin", "Administrator"},
    "Pending Admin HOD":      {"admin_hod", "module_admin", "Administrator"},
    "Pending FC":             {"fc", "module_admin", "Administrator"},
    "Pending CFO":            {"cfo", "module_admin", "Administrator"},
    "Pending MD":             {"md", "module_admin", "Administrator"},
    "Pending Property PO":    {"property_dept", "module_admin", "Administrator"},
    "Pending MIRO":           {"gl_team", "module_admin", "Administrator"},
}

WORKFLOW_TRANSITIONS = {
    "submit": {
        "Draft": {
            "roles": {"licensing", "property_dept", "module_admin", "Administrator"},
            "next_state": "Pending Approver 1",
        },
    },

    "approve": {
        "Pending Approver 1": {
            "roles": {"approver_1", "module_admin", "Administrator"},
            "next_state": None,  # dynamic: check approver count
        },
        "Pending Approver 2": {
            "roles": {"approver_2", "module_admin", "Administrator"},
            "next_state": None,  # dynamic: check approver count
        },
        "Pending Approver 3": {
            "roles": {"approver_3", "module_admin", "Administrator"},
            "next_state": None,  # dynamic: check approver count
        },
        "Pending Approver 4": {
            "roles": {"approver_4", "module_admin", "Administrator"},
            "next_state": None,  # dynamic: check approver count
        },
        "Pending Approver 5": {
            "roles": {"approver_5", "module_admin", "Administrator"},
            "next_state": None,  # dynamic: check approver count
        },
        "Pending Approver 6": {
            "roles": {"approver_6", "module_admin", "Administrator"},
            "next_state": "Pending Cheque Details",
        },
        "Pending Cheque Details": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Pending Admin HOD",
        },
        "Pending Admin HOD": {
            "roles": {"admin_hod", "module_admin", "Administrator"},
            "next_state": "Pending FC",
        },
        "Pending FC": {
            "roles": {"fc", "module_admin", "Administrator"},
            "next_state": "Pending CFO",
        },
        "Pending CFO": {
            "roles": {"cfo", "module_admin", "Administrator"},
            "next_state": None,  # dynamic: >5% → Pending MD, else → Pending Property PO
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
        "Pending Approver 1": {"roles": {"approver_1"}, "next_state": "Withdrawn"},
        "Pending Approver 2": {"roles": {"approver_2"}, "next_state": "Withdrawn"},
        "Pending Approver 3": {"roles": {"approver_3"}, "next_state": "Withdrawn"},
        "Pending Approver 4": {"roles": {"approver_4"}, "next_state": "Withdrawn"},
        "Pending Approver 5": {"roles": {"approver_5"}, "next_state": "Withdrawn"},
        "Pending Approver 6": {"roles": {"approver_6"}, "next_state": "Withdrawn"},
        "Pending Admin HOD":  {"roles": {"admin_hod"}, "next_state": "Withdrawn"},
        "Pending FC":         {"roles": {"fc"}, "next_state": "Withdrawn"},
        "Pending CFO":        {"roles": {"cfo"}, "next_state": "Withdrawn"},
        "Pending MD":         {"roles": {"md"}, "next_state": "Withdrawn"},
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
        "Pending Approver 3": {
            "roles": {"approver_3", "module_admin", "Administrator"},
            "next_state": "Pending Approver 2",
        },
        "Pending Approver 4": {
            "roles": {"approver_4", "module_admin", "Administrator"},
            "next_state": "Pending Approver 3",
        },
        "Pending Approver 5": {
            "roles": {"approver_5", "module_admin", "Administrator"},
            "next_state": "Pending Approver 4",
        },
        "Pending Approver 6": {
            "roles": {"approver_6", "module_admin", "Administrator"},
            "next_state": "Pending Approver 5",
        },
        "Pending Cheque Details": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": None,  # dynamic: last active approver state
        },
        "Pending Admin HOD": {
            "roles": {"admin_hod", "module_admin", "Administrator"},
            "next_state": "Pending Cheque Details",
        },
        "Pending FC": {
            "roles": {"fc", "module_admin", "Administrator"},
            "next_state": "Pending Admin HOD",
        },
        "Pending CFO": {
            "roles": {"cfo", "module_admin", "Administrator"},
            "next_state": "Pending FC",
        },
        "Pending MD": {
            "roles": {"md", "module_admin", "Administrator"},
            "next_state": "Pending CFO",
        },
        "Pending Property PO": {
            "roles": {"property_dept", "module_admin", "Administrator"},
            "next_state": "Pending CFO",
        },
        "Pending MIRO": {
            "roles": {"gl_team", "module_admin", "Administrator"},
            "next_state": "Pending Property PO",
        },
    },

    "withdraw": {
        "Pending Approver 1":     {"roles": {"approver_1", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending Approver 2":     {"roles": {"approver_2", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending Approver 3":     {"roles": {"approver_3", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending Approver 4":     {"roles": {"approver_4", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending Approver 5":     {"roles": {"approver_5", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending Approver 6":     {"roles": {"approver_6", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending Cheque Details": {"roles": {"property_dept", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending Admin HOD":      {"roles": {"admin_hod", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending FC":             {"roles": {"fc", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending CFO":            {"roles": {"cfo", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending MD":             {"roles": {"md", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending Property PO":    {"roles": {"property_dept", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
        "Pending MIRO":           {"roles": {"gl_team", "module_admin", "Administrator"}, "next_state": "Withdrawn"},
    },
}


def _is_property_approver(user):
    """
    Returns True if user is in the JH Property Approver child table.
    Falls back to checking legacy approver_1/approver_2 columns so existing
    properties don't lose access before the data migration is run.
    """
    if not user:
        return False

    identity_users = {user}
    mapped_email = frappe.db.get_value("JH User Master", {"user": user}, "email")
    user_email = frappe.db.get_value("User", user, "email")
    identity_users.update(value for value in (mapped_email, user_email) if value)

    # Child-table access must not depend on the logged-in user's DocType
    # permissions; approvers are website users and may not have Desk access.
    try:
        approver_rows = frappe.get_all(
            "JH Property Approver",
            filters={
                "approver": ["in", list(identity_users)],
                "parenttype": "JH Property Master",
            },
            pluck="name",
            limit=1,
            ignore_permissions=True,
        )
        if approver_rows:
            return True
    except Exception:
        pass

    # --- legacy fallback ---
    try:
        rows = frappe.db.sql(
            """
            SELECT COUNT(*)
            FROM `tabJH Property Master`
            WHERE approver_1 IN %(users)s OR approver_2 IN %(users)s
            """,
            {"users": tuple(identity_users)},
        )
        count = rows[0][0] if rows else 0
        return bool(count)
    except Exception:
        return False


def _get_property_approvers_list(property_name):
    """Returns sorted list of approver user emails from the JH Property Approver child table."""
    if not property_name:
        return []
    try:
        rows = frappe.get_all(
            "JH Property Approver",
            filters={"parent": property_name, "parenttype": "JH Property Master"},
            fields=["order", "approver"],
            order_by="`order` asc",
            ignore_permissions=True,
        )
        return [r.approver for r in rows if r.approver]
    except Exception:
        return []


def _get_valid_sendback_options(renewal, current_state):
    """Filter SENDBACK_TRANSITIONS options to only include approver states that exist."""
    all_options = SENDBACK_TRANSITIONS.get(current_state, set())
    if not all_options or not renewal or not renewal.property:
        return all_options

    approvers = _get_property_approvers_list(renewal.property)
    n = len(approvers)
    valid = set()
    for option in all_options:
        if not option.startswith("Pending Approver"):
            valid.add(option)
        else:
            try:
                idx = int(option.split("Pending Approver ")[1])
                if n >= idx:
                    valid.add(option)
            except (IndexError, ValueError):
                pass
    return valid


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
        filters={"name": ["in", delegated_renewals]},
        pluck="property",
        ignore_permissions=True,
    )
    return [p for p in properties if p]


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
    """Returns property names where user or a standing delegator is an approver (any level)."""
    def _fetch_from_child_table(approver):
        try:
            return set(frappe.get_all(
                "JH Property Approver",
                filters={"approver": approver, "parenttype": "JH Property Master"},
                pluck="parent",
                ignore_permissions=True,
            ))
        except Exception:
            return set()

    def _fetch_legacy(approver):
        try:
            rows = frappe.db.sql(
                "SELECT name FROM `tabJH Property Master` WHERE approver_1 = %s OR approver_2 = %s",
                (approver, approver),
            )
            return {r[0] for r in rows}
        except Exception:
            return set()

    props = _fetch_from_child_table(user) or _fetch_legacy(user)
    for delegator in _get_standing_delegators(user):
        props.update(_fetch_from_child_table(delegator) or _fetch_legacy(delegator))
    return list(props)


def _get_property_user_context():
    """
    Returns a dict of booleans describing the current user's property access level.
    MD, CFO, Admin HOD and FC are resolved from JH Digitrack Settings.
    Delegation is also checked.
    """
    user = frappe.session.user
    user_roles = set(frappe.get_roles(user))
    settings = frappe.get_single("JH Digitrack Settings")
    is_administrator = user == "Administrator"

    ctx = {
        "user": user,
        "is_admin":        is_administrator or "JH Digitrack Admin" in user_roles,
        "is_md":           is_administrator or user == settings.md_user,
        "is_cfo":          is_administrator or user == settings.cfo_user,
        "is_admin_hod":    is_administrator or user == settings.admin_hod_user,
        "is_fc":           is_administrator or user == settings.fc_user,
        "has_property_dept": is_administrator or "JH Property Department" in user_roles,
        "has_gl_team":     is_administrator or "JH GL Team" in user_roles,
        "is_licensing":    is_administrator or "JH Licensing Team" in user_roles,
    }

    has_direct_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["is_admin_hod"] or ctx["is_fc"]
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
            if delegator == settings.admin_hod_user:
                ctx["is_admin_hod"] = True
            if delegator == settings.fc_user:
                ctx["is_fc"] = True
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
    business=None,
    expiring_soon=None,
    renewal_filter=None,
    attention_filter=None,
    limit=10,
    page=1,
):
    ctx = _get_property_user_context()
    user = ctx["user"]

    has_full_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["is_admin_hod"] or ctx["is_fc"]
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
    if business:
        filters["business_used"] = business

    from frappe.utils import add_days, today
    today_str = today()

    if renewal_filter:
        if renewal_filter == "30":
            filters["renewal_date"] = ["between", [today_str, add_days(today_str, 30)]]
        elif renewal_filter == "60":
            filters["renewal_date"] = ["between", [add_days(today_str, 31), add_days(today_str, 60)]]
        elif renewal_filter == "90":
            filters["renewal_date"] = ["between", [add_days(today_str, 61), add_days(today_str, 90)]]
        elif renewal_filter == "overdue":
            filters["renewal_date"] = ["<", today_str]
        elif renewal_filter == "active":
            filters["renewal_date"] = [">", add_days(today_str, 90)]
    elif attention_filter:
        if attention_filter == "overdue_no_renewal":
            properties_with_any_renewal = frappe.get_all(
                "JH Property Rental Renewal",
                filters={"workflow_state": ["in", ACTIVE_RENEWAL_STATES + ["Withdrawn"]]},
                pluck="property",
                ignore_permissions=True,
            )
            filters["renewal_date"] = ["<", today_str]
            if properties_with_any_renewal:
                filters["name"] = ["not in", list(set(properties_with_any_renewal))]
        elif attention_filter == "hassantuk_expiring_soon":
            filters["hassantuk_expiry"] = ["between", [today_str, add_days(today_str, 30)]]
        elif attention_filter == "cdc_expiring_soon":
            filters["cdc_expiry"] = ["between", [today_str, add_days(today_str, 30)]]
        elif attention_filter == "po_box_expiring_soon":
            filters["po_box_renewal_date"] = ["between", [today_str, add_days(today_str, 30)]]
    elif expiring_soon:
        filters["renewal_date"] = ["between", [today_str, add_days(today_str, 90)]]

    limit = cint(limit)
    page = cint(page)
    start = (page - 1) * limit

    fields = [
        "name", "property_name", "type_of_property", "division_used", "business_used",
        "booked_under", "profit_center",
        "number_of_units", "number_of_premises", "premise_number",
        "staff_allocated", "location", "emirate", "country",
        "makani_number", "po_box_number", "po_box_renewal_date",
        "landlord", "real_estate", "current_rent", "renewal_date",
        "landlord_security_deposit", "tenancy_period",
        "electricity_accounts", "electricity_water_security_deposit",
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
    from frappe.utils import add_days, today

    ctx = _get_property_user_context()
    user = ctx["user"]

    has_full_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["is_admin_hod"] or ctx["is_fc"]
        or ctx["has_property_dept"] or ctx["has_gl_team"] or ctx["is_licensing"]
    )

    base_filters = {}
    if not has_full_access:
        approver_props = _get_approver_properties(user)
        has_adhoc_delegation = bool(_get_visible_adhoc_renewals(user))
        if not approver_props and not has_adhoc_delegation:
            frappe.throw(_("Not permitted"), frappe.PermissionError)

    today_str = today()

    def _count(extra_filters=None):
        filters = {**base_filters}
        if extra_filters:
            filters.update(extra_filters)
        return frappe.db.count("JH Property Master", filters=filters, cache=False)

    total_properties = _count()
    renewals_30_days = _count({"renewal_date": ["between", [today_str, add_days(today_str, 30)]]})
    renewals_60_days = _count({"renewal_date": ["between", [add_days(today_str, 31), add_days(today_str, 60)]]})
    renewals_90_days = _count({"renewal_date": ["between", [add_days(today_str, 61), add_days(today_str, 90)]]})
    overdue = _count({"renewal_date": ["<", today_str]})

    properties_with_any_renewal = frappe.get_all(
        "JH Property Rental Renewal",
        filters={"workflow_state": ["in", ACTIVE_RENEWAL_STATES + ["Withdrawn"]]},
        pluck="property",
        ignore_permissions=True,
    )
    overdue_no_renewal_filters = {"renewal_date": ["<", today_str]}
    if properties_with_any_renewal:
        overdue_no_renewal_filters["name"] = ["not in", list(set(properties_with_any_renewal))]

    stalled_renewals = frappe.db.count(
        "JH Property Rental Renewal",
        filters={
            "workflow_state": ["in", ACTIVE_RENEWAL_STATES],
            "modified": ["<=", add_days(today_str, -7)],
        },
        cache=False,
    )

    try:
        pending_payload = get_my_pending_renewals()
        pending_my_action = len(pending_payload.get("renewals") or [])
    except Exception:
        pending_my_action = 0

    attention = {
        "overdue_no_renewal": _count(overdue_no_renewal_filters),
        "stalled_renewals": stalled_renewals,
        "pending_my_action": pending_my_action,
        "hassantuk_expiring_soon": _count({"hassantuk_expiry": ["between", [today_str, add_days(today_str, 30)]]}),
        "cdc_expiring_soon": _count({"cdc_expiry": ["between", [today_str, add_days(today_str, 30)]]}),
        "po_box_expiring_soon": _count({"po_box_renewal_date": ["between", [today_str, add_days(today_str, 30)]]}),
    }

    active_properties = _count({"renewal_date": [">", add_days(today_str, 90)]})

    return {
        "total_properties": total_properties,
        "active_properties": active_properties,
        "renewals_30_days": renewals_30_days,
        "renewals_60_days": renewals_60_days,
        "renewals_90_days": renewals_90_days,
        "overdue": overdue,
        "attention": attention,
    }


def _attach_approver_names(records):
    """Attach approver_1_name, approver_2_name, approver_3_name (full names) to each renewal record."""
    if not records:
        return records

    property_names = list({r.get("property") for r in records if r.get("property")})
    if not property_names:
        return records

    approver_rows = frappe.get_all(
        "JH Property Approver",
        filters={"parent": ["in", property_names], "parenttype": "JH Property Master"},
        fields=["parent", "order", "approver"],
        order_by="`order` asc",
        ignore_permissions=True,
    )

    prop_approvers = {}
    for row in approver_rows:
        prop_approvers.setdefault(row["parent"], []).append(row)

    user_emails = {row["approver"] for row in approver_rows if row.get("approver")}
    user_fullnames = {}
    if user_emails:
        users = frappe.get_all(
            "User",
            filters={"name": ["in", list(user_emails)]},
            fields=["name", "full_name"],
            ignore_permissions=True,
        )
        user_fullnames = {u["name"]: u["full_name"] for u in users}

    for record in records:
        rows = sorted(prop_approvers.get(record.get("property"), []), key=lambda x: x.get("order", 0))
        def _name(idx):
            if len(rows) > idx:
                u = rows[idx].get("approver")
                return user_fullnames.get(u, u) if u else None
            return None
        record["approver_1_name"] = _name(0)
        record["approver_2_name"] = _name(1)
        record["approver_3_name"] = _name(2)
        record["approver_4_name"] = _name(3)
        record["approver_5_name"] = _name(4)
        record["approver_6_name"] = _name(5)

    return records


@frappe.whitelist(methods=["GET"])
def get_renewal_list(
    workflow_states=None,
    divisions=None,
    search=None,
    property=None,
    attention_filter=None,
    renewal_period=None,
    limit=10,
    page=1,
):
    import json as _json
    from frappe.utils import add_days, add_months, cint, getdate, today

    ctx = _get_property_user_context()
    user = ctx["user"]

    has_full_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["is_admin_hod"] or ctx["is_fc"]
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

    if attention_filter == "stalled_7_days":
        filters["workflow_state"] = ["in", ACTIVE_RENEWAL_STATES]
        filters["modified"] = ["<=", add_days(today(), -7)]

    if renewal_period:
        current_date = getdate(today())
        if renewal_period == "This Month":
            start_date = current_date.replace(day=1)
            end_date = add_days(add_months(start_date, 1), -1)
            filters["renewal_from"] = ["between", [start_date, end_date]]
        elif renewal_period == "Next 3 Months":
            end_date = add_months(current_date, 3)
            filters["renewal_from"] = ["between", [current_date, end_date]]
        elif renewal_period == "This Year":
            start_date = current_date.replace(month=1, day=1)
            end_date = current_date.replace(month=12, day=31)
            filters["renewal_from"] = ["between", [start_date, end_date]]

    limit = cint(limit)
    page = cint(page)
    start = (page - 1) * limit

    RENEWAL_FIELDS = [
        "name", "property", "current_rent", "proposed_rent", "rent_change_percent",
        "renewal_from", "renewal_to", "division", "workflow_state", "modified", "step_entered_on",
    ]

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
            results.sort(key=lambda x: x.get("modified") or "", reverse=True)
            total = len(results)
            records = results[start: start + limit]
            return {"renewals": _attach_approver_names(records), "total": total}

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
        order_by="modified desc",
        ignore_permissions=True,
    )
    total = frappe.db.count("JH Property Rental Renewal", filters=filters, cache=False)

    return {"renewals": _attach_approver_names(records), "total": total}


@frappe.whitelist(methods=["GET"])
def get_property_doc(name: str):
    if not name:
        frappe.throw(_("name is required"))

    ctx = _get_property_user_context()
    user = ctx["user"]

    has_full_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["is_admin_hod"] or ctx["is_fc"]
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
        or ctx["is_admin_hod"] or ctx["is_fc"]
        or ctx["has_property_dept"] or ctx["has_gl_team"] or ctx["is_licensing"]
    )

    if not has_full_access:
        is_approver = renewal.name in _get_visible_adhoc_renewals(user)
        if renewal.property and not is_approver:
            approver_users = _get_property_approvers_list(renewal.property)
            if user in approver_users:
                is_approver = True
            if not is_approver:
                from jh_digitrack.api.helpers.delegation import resolve_effective_user
                for approver_user in approver_users:
                    if resolve_effective_user(delegate=user, delegator=approver_user, document=renewal):
                        is_approver = True
                        break
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
        or user == settings.admin_hod_user
        or user == settings.fc_user
        or _is_property_approver(user)
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
                or delegator == settings.admin_hod_user
                or delegator == settings.fc_user
                or _is_property_approver(delegator)
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
        or user == settings.admin_hod_user
        or user == settings.fc_user
        or _is_property_approver(user)
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
                or delegator == settings.admin_hod_user
                or delegator == settings.fc_user
                or _is_property_approver(delegator)
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
    is_module_admin   = is_administrator or "JH Digitrack Admin" in user_roles
    is_cfo            = is_administrator or user == settings.cfo_user
    is_md             = is_administrator or user == settings.md_user
    is_admin_hod      = is_administrator or user == settings.admin_hod_user
    is_fc             = is_administrator or user == settings.fc_user
    has_property_dept_role = is_administrator or "JH Property Department" in user_roles
    has_gl_team_role  = is_administrator or "JH GL Team" in user_roles
    is_licensing      = is_administrator or "JH Licensing Team" in user_roles

    is_approver = _is_property_approver(user)
    is_approver_1 = is_approver
    is_approver_2 = is_approver
    is_approver_3 = is_approver
    has_adhoc_delegation = bool(_get_adhoc_delegated_renewals(user))
    has_visible_adhoc_renewal = bool(_get_visible_adhoc_renewals(user))

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
            if not is_admin_hod and delegator == settings.admin_hod_user:
                is_admin_hod = True
            if not is_fc and delegator == settings.fc_user:
                is_fc = True
            if not has_property_dept_role and "JH Property Department" in delegator_roles:
                has_property_dept_role = True
            if not has_gl_team_role and "JH GL Team" in delegator_roles:
                has_gl_team_role = True
            if not is_licensing and "JH Licensing Team" in delegator_roles:
                is_licensing = True
            if not is_approver and _is_property_approver(delegator):
                is_approver = True
                is_approver_1 = True
                is_approver_2 = True
                is_approver_3 = True

    return {
        "user": user,
        "has_property_access": (
            is_module_admin or has_property_dept_role or has_gl_team_role
            or is_licensing or is_cfo or is_md or is_admin_hod or is_fc
            or is_approver or has_adhoc_delegation or has_standing_delegation
        ),
        "has_property_dept_role": has_property_dept_role,
        "has_gl_team_role": has_gl_team_role,
        "is_module_admin": is_module_admin,
        "is_cfo": is_cfo,
        "is_md": is_md,
        "is_admin_hod": is_admin_hod,
        "is_fc": is_fc,
        "is_licensing": is_licensing,
        "is_approver": is_approver,
        "is_approver_1": is_approver_1,
        "is_approver_2": is_approver_2,
        "is_approver_3": is_approver_3,
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
        "admin_hod_user": settings.admin_hod_user,
        "fc_user": settings.fc_user,
    }


@frappe.whitelist(methods=["GET"])
def get_property_types():
    meta = frappe.get_meta("JH Property Master")
    field = next((f for f in meta.fields if f.fieldname == "type_of_property"), None)
    if not field or not field.options:
        return {"property_types": []}
    return {"property_types": [opt for opt in field.options.split("\n") if opt.strip()]}


def _get_effective_roles(user, renewal=None):
    """
    Returns all workflow roles the user can act as, including via delegation.
    Returns: (roles_set, behalf_map)
    """
    if user == "Administrator":
        return {"Administrator"}, {}

    user_roles = set(frappe.get_roles(user))
    matches = set()
    behalf_map = {}
    org = get_org_role_users()
    cfo_user      = org.get("cfo_user")
    md_user       = org.get("md_user")
    admin_hod_user = org.get("admin_hod_user")
    fc_user       = org.get("fc_user")

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

    add_frappe_role_match("JH Digitrack Admin", "module_admin")
    add_frappe_role_match("JH Property Department", "property_dept")
    add_frappe_role_match("JH GL Team", "gl_team")
    add_frappe_role_match("JH Licensing Team", "licensing")

    def add_settings_role_match(settings_user, workflow_role):
        if user == settings_user:
            matches.add(workflow_role)
        elif settings_user and resolve_effective_user(delegate=user, delegator=settings_user, document=renewal):
            matches.add(workflow_role)
            behalf_map[workflow_role] = settings_user

    add_settings_role_match(cfo_user, "cfo")
    add_settings_role_match(md_user, "md")
    add_settings_role_match(admin_hod_user, "admin_hod")
    add_settings_role_match(fc_user, "fc")

    # Dynamic per-property approver roles
    if renewal and renewal.property:
        approvers = _get_property_approvers_list(renewal.property)
        for i, approver_user in enumerate(approvers):
            role_key = f"approver_{i + 1}"
            if user == approver_user:
                matches.add(role_key)
            elif approver_user and resolve_effective_user(delegate=user, delegator=approver_user, document=renewal):
                matches.add(role_key)
                behalf_map[role_key] = approver_user

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
    current_state = renewal.workflow_state or "Draft"

    state_role_priority = {
        "Draft":                  ["licensing", "property_dept", "module_admin"],
        "Pending Approver 1":     ["approver_1", "module_admin"],
        "Pending Approver 2":     ["approver_2", "module_admin"],
        "Pending Approver 3":     ["approver_3", "module_admin"],
        "Pending Approver 4":     ["approver_4", "module_admin"],
        "Pending Approver 5":     ["approver_5", "module_admin"],
        "Pending Approver 6":     ["approver_6", "module_admin"],
        "Pending Cheque Details": ["property_dept", "module_admin"],
        "Pending Admin HOD":      ["admin_hod", "module_admin"],
        "Pending FC":             ["fc", "module_admin"],
        "Pending CFO":            ["cfo", "module_admin"],
        "Pending MD":             ["md", "module_admin"],
        "Pending Property PO":    ["property_dept", "module_admin"],
        "Pending MIRO":           ["gl_team", "module_admin"],
    }

    priority_roles = state_role_priority.get(current_state, ROLE_PRIORITY)
    for role in priority_roles:
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
 
 
@frappe.whitelist(methods=["GET"])
def get_allowed_actions(renewal_id: str):
    if not renewal_id:
        frappe.throw(_("renewal_id is required"))

    frappe.flags.ignore_permissions = True
    try:
        renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    finally:
        frappe.flags.ignore_permissions = False

    allowed_actions = get_permitted_actions(renewal)
    valid_sendback = _get_valid_sendback_options(renewal, renewal.workflow_state or "Draft")

    return {
        "actions": allowed_actions,
        "sendback_options": list(valid_sendback),
    }


@frappe.whitelist(methods=["GET"])
def get_renewal_role(renewal_id: str):
    if not renewal_id:
        frappe.throw(_("renewal_id is required"))

    try:
        result = whoami(renewal_id=renewal_id, is_new=False)
    except (frappe.PermissionError, frappe.exceptions.ValidationError):
        user = frappe.session.user

        if renewal_id in _get_visible_adhoc_renewals(user):
            return {"role": "adhoc_viewer", "actions": [], "sendback_options": []}

        ctx = _get_property_user_context()
        has_any_access = (
            ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
            or ctx["is_admin_hod"] or ctx["is_fc"]
            or ctx["has_property_dept"] or ctx["has_gl_team"] or ctx["is_licensing"]
        )
        if not has_any_access:
            renewal_property = frappe.db.get_value(
                "JH Property Rental Renewal", renewal_id, "property",
                ignore_permissions=True,
            )
            if renewal_property and renewal_property in _get_approver_properties(user):
                has_any_access = True

        if has_any_access:
            return {"role": "viewer", "actions": [], "sendback_options": []}

        raise

    frappe.flags.ignore_permissions = True
    try:
        renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
    finally:
        frappe.flags.ignore_permissions = False

    allowed_actions = get_permitted_actions(renewal)
    valid_sendback = _get_valid_sendback_options(renewal, renewal.workflow_state or "Draft")
    result["actions"] = allowed_actions
    result["sendback_options"] = list(valid_sendback) if allowed_actions else []
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
            resolved_division = frappe.db.get_value("JH Property Master", renewal_data.property, "division_used")

    if not resolved_division:
        frappe.throw(_("Division could not be resolved"))

    gm_user = frappe.db.get_value("JH Division Master", resolved_division, "division_gm")

    return {"division": resolved_division, "gm_user": gm_user}


@frappe.whitelist(methods=["GET"])
def get_divisions_by_business(business: str = None):
    """Return divisions filtered by business. If no business supplied, return all divisions."""
    filters = {}
    if business:
        filters["business"] = business

    divisions = frappe.db.get_all(
        "JH Division Master",
        filters=filters,
        fields=["name", "division_name", "business"],
        order_by="name asc",
    )
    return {"divisions": divisions}


@frappe.whitelist(methods=["GET"])
def get_my_pending_renewals():
    """Return renewals where the logged-in user is the next actor, delegation-aware."""
    user = frappe.session.user

    try:
        user_roles = set(frappe.get_roles(user) or [])
        org = get_org_role_users()
        cfo_user       = org.get("cfo_user")
        md_user        = org.get("md_user")
        admin_hod_user = org.get("admin_hod_user")
        fc_user        = org.get("fc_user")

        is_admin = user == "Administrator" or "JH Digitrack Admin" in user_roles

        RENEWAL_FIELDS = [
            "name", "property", "current_rent", "proposed_rent", "rent_change_percent",
            "renewal_from", "renewal_to", "division", "workflow_state", "modified",
        ]

        if is_admin:
            renewals = frappe.get_all(
                "JH Property Rental Renewal",
                filters={"workflow_state": ["not in", ["Completed", "Withdrawn"]]},
                fields=RENEWAL_FIELDS,
                order_by="modified desc",
                ignore_permissions=True,
            )
            return {"renewals": _attach_approver_names(renewals)}

        seen = set()
        results = []

        def _add_rows(filters):
            rows = frappe.get_all(
                "JH Property Rental Renewal",
                filters=filters,
                fields=RENEWAL_FIELDS,
                order_by="modified desc",
                ignore_permissions=True,
            )
            for row in rows:
                if row.get("name") and row["name"] not in seen:
                    seen.add(row["name"])
                    results.append(row)

        def _fetch_for_actor(actor, actor_roles):
            if "JH Property Department" in actor_roles or "JH Licensing Team" in actor_roles:
                _add_rows({"workflow_state": "Draft"})
                _add_rows({"workflow_state": "Pending Cheque Details"})
                _add_rows({"workflow_state": "Pending Property PO"})

            if "JH GL Team" in actor_roles:
                _add_rows({"workflow_state": "Pending MIRO"})

            if actor == cfo_user:
                _add_rows({"workflow_state": "Pending CFO"})

            if actor == md_user:
                _add_rows({"workflow_state": "Pending MD"})

            if actor == admin_hod_user:
                _add_rows({"workflow_state": "Pending Admin HOD"})

            if actor == fc_user:
                _add_rows({"workflow_state": "Pending FC"})

            # Approver properties: any order level
            approver_props_1 = frappe.get_all(
                "JH Property Approver",
                filters={"approver": actor, "order": 1, "parenttype": "JH Property Master"},
                pluck="parent",
                ignore_permissions=True,
            )
            if approver_props_1:
                _add_rows({"workflow_state": "Pending Approver 1", "property": ["in", approver_props_1]})

            approver_props_2 = frappe.get_all(
                "JH Property Approver",
                filters={"approver": actor, "order": 2, "parenttype": "JH Property Master"},
                pluck="parent",
                ignore_permissions=True,
            )
            if approver_props_2:
                _add_rows({"workflow_state": "Pending Approver 2", "property": ["in", approver_props_2]})

            approver_props_3 = frappe.get_all(
                "JH Property Approver",
                filters={"approver": actor, "order": 3, "parenttype": "JH Property Master"},
                pluck="parent",
                ignore_permissions=True,
            )
            if approver_props_3:
                _add_rows({"workflow_state": "Pending Approver 3", "property": ["in", approver_props_3]})

            approver_props_4 = frappe.get_all(
                "JH Property Approver",
                filters={"approver": actor, "order": 4, "parenttype": "JH Property Master"},
                pluck="parent",
                ignore_permissions=True,
            )
            if approver_props_4:
                _add_rows({"workflow_state": "Pending Approver 4", "property": ["in", approver_props_4]})

            approver_props_5 = frappe.get_all(
                "JH Property Approver",
                filters={"approver": actor, "order": 5, "parenttype": "JH Property Master"},
                pluck="parent",
                ignore_permissions=True,
            )
            if approver_props_5:
                _add_rows({"workflow_state": "Pending Approver 5", "property": ["in", approver_props_5]})

            approver_props_6 = frappe.get_all(
                "JH Property Approver",
                filters={"approver": actor, "order": 6, "parenttype": "JH Property Master"},
                pluck="parent",
                ignore_permissions=True,
            )
            if approver_props_6:
                _add_rows({"workflow_state": "Pending Approver 6", "property": ["in", approver_props_6]})

        _fetch_for_actor(user, user_roles)

        for delegator in (_get_standing_delegators(user) or []):
            _fetch_for_actor(delegator, set(frappe.get_roles(delegator) or []))

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
            for row in adhoc_rows:
                if row.get("name") and row["name"] not in seen:
                    seen.add(row["name"])
                    results.append(row)

        return {"renewals": _attach_approver_names(results)}

    except Exception:
        frappe.log_error(frappe.get_traceback(), "get_my_pending_renewals Error")
        return {"renewals": []}


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
        required = {
            "cheque_type": _("Type of Cheque"),
            "cheque_date": _("Date"),
            "payee": _("Payee"),
        }
        for i, row in enumerate(renewal.cheque_details, start=1):
            missing = [label for field, label in required.items() if not row.get(field)]
            if missing:
                frappe.throw(_("Cheque row {0}: missing {1}").format(i, ", ".join(missing)))
            if not flt(row.get("cheque_amount")):
                frappe.throw(_("Cheque row {0}: Amount must be greater than zero.").format(i))

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
    cheque_details=None,
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
        import json as _json
        rows = cheque_details
        if isinstance(rows, str):
            rows = _json.loads(rows)
        if not rows:
            frappe.throw(_("At least one cheque detail row is required."))
        renewal.set("cheque_details", [])
        for row in rows:
            renewal.append("cheque_details", {
                "cheque_type":   row.get("cheque_type") or "",
                "cheque_amount": flt(row.get("cheque_amount")),
                "cheque_date":   row.get("cheque_date") or "",
                "payee":         row.get("payee") or "",
            })

    if current_state == "Pending Property PO":
        renewal.po_number = po_number or ""
        if renewed_contract_document is not None:
            renewal.renewed_contract_document = renewed_contract_document or ""

    if current_state == "Pending MIRO":
        renewal.miro_number = miro_number or ""

    _validate_stage_fields(renewal)
    renewal.save(ignore_permissions=True)

    return {
        "name":                     renewal.name,
        "workflow_state":           renewal.workflow_state,
        "modified":                 renewal.modified,
        "po_number":                renewal.po_number,
        "miro_number":              renewal.miro_number,
        "renewed_contract_document": renewal.renewed_contract_document,
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
        valid_targets = _get_valid_sendback_options(renewal, current_state)
        if target_state not in valid_targets:
            frappe.throw(_("Invalid target state {0} for sendback from {1}").format(target_state, current_state))
        sendback_transition = WORKFLOW_TRANSITIONS["sendback"].get(current_state)
        if not sendback_transition or role not in sendback_transition["roles"]:
            frappe.throw(_("Role {0} is not allowed to send back from state {1}").format(role, current_state))
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
        if not comment:
            frappe.throw(_("Comment is required"))
        next_state = transition["next_state"]

        # Dynamic next_state for Approvers 1-5 (advance to next approver or Cheque Details)
        if action == "approve" and current_state.startswith("Pending Approver "):
            try:
                idx = int(current_state.split("Pending Approver ")[1])
            except (IndexError, ValueError):
                idx = 0
            if 1 <= idx <= 5:
                approvers = _get_property_approvers_list(renewal.property)
                next_state = f"Pending Approver {idx + 1}" if len(approvers) >= idx + 1 else "Pending Cheque Details"

        # Dynamic next_state for Cheque Details sendback (go to last active approver)
        elif action == "sendback" and current_state == "Pending Cheque Details":
            approvers = _get_property_approvers_list(renewal.property)
            n = len(approvers)
            next_state = f"Pending Approver {n}" if n >= 1 else "Draft"

        # CFO approval: conditional on rent change
        elif current_state == "Pending CFO" and action == "approve":
            current_rent = flt(renewal.current_rent)
            proposed_rent = flt(renewal.proposed_rent)
            rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100 if current_rent else 0
            if rent_change_percent > 5:
                next_state = "Pending MD"
            else:
                next_state = "Pending Property PO"
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
            "user":          frappe.session.user,
            "on_behalf_of":  on_behalf_of,
            "role":          role,
            "current_state": current_state,
            "changed_state": next_state,
            "action":        action.title(),
            "comments":      audit_comment,
            "action_time":   frappe.utils.now_datetime(),
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
        "name":           renewal.name,
        "role":           role,
        "previous_state": current_state,
        "workflow_state": renewal.workflow_state,
    }


@frappe.whitelist(methods=["GET"])
def get_renewal_pipeline_counts():
    ctx = _get_property_user_context()
    user = ctx["user"]

    has_full_access = (
        ctx["is_admin"] or ctx["is_md"] or ctx["is_cfo"]
        or ctx["is_admin_hod"] or ctx["is_fc"]
        or ctx["has_property_dept"] or ctx["has_gl_team"] or ctx["is_licensing"]
    )

    STATES = [
        ("draft",                  "Draft"),
        ("pending_approver_1",     "Pending Approver 1"),
        ("pending_approver_2",     "Pending Approver 2"),
        ("pending_approver_3",     "Pending Approver 3"),
        ("pending_cheque_details", "Pending Cheque Details"),
        ("pending_admin_hod",      "Pending Admin HOD"),
        ("pending_fc",             "Pending FC"),
        ("pending_cfo",            "Pending CFO"),
        ("pending_md",             "Pending MD"),
        ("pending_property_po",    "Pending Property PO"),
        ("pending_miro",           "Pending MIRO"),
        ("completed",              "Completed"),
        ("withdrawn",              "Withdrawn"),
    ]

    counts = {key: 0 for key, _ in STATES}

    if has_full_access:
        rows = frappe.get_all("JH Property Rental Renewal", fields=["workflow_state"], ignore_permissions=True)
        state_map = {label: key for key, label in STATES}
        for row in rows:
            key = state_map.get(row["workflow_state"])
            if key:
                counts[key] += 1
    else:
        approver_props = _get_approver_properties(user)
        adhoc_renewals = _get_visible_adhoc_renewals(user)
        if not approver_props and not adhoc_renewals:
            return counts

        seen = set()
        rows = []
        if approver_props:
            rows += frappe.get_all(
                "JH Property Rental Renewal",
                filters={"property": ["in", approver_props]},
                fields=["name", "workflow_state"],
                ignore_permissions=True,
            )
        if adhoc_renewals:
            rows += frappe.get_all(
                "JH Property Rental Renewal",
                filters={"name": ["in", adhoc_renewals]},
                fields=["name", "workflow_state"],
                ignore_permissions=True,
            )

        state_map = {label: key for key, label in STATES}
        for row in rows:
            if row["name"] in seen:
                continue
            seen.add(row["name"])
            key = state_map.get(row["workflow_state"])
            if key:
                counts[key] += 1

    return counts


# @frappe.whitelist(methods=["GET"])
# def get_bank_accounts():
#     accounts = frappe.get_all(
#         "JH Bank Account",
#         filters={"is_active": 1},
#         fields=["bank_name"],
#         order_by="bank_name asc",
#         ignore_permissions=True,
#     )
#     return {"bank_accounts": [a.bank_name for a in accounts]}


@frappe.whitelist(methods=["GET"])
def get_cheque_types():
    meta = frappe.get_meta("JH Property Cheque Detail")
    field = next((f for f in meta.fields if f.fieldname == "cheque_type"), None)
    if not field or not field.options:
        return {"cheque_types": []}
    return {"cheque_types": [opt for opt in field.options.split("\n") if opt.strip()]}
