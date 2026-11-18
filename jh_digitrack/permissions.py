import frappe

PROJECT_ADMIN_ROLES = {"System Manager", "JH Digitrack Admin"}


def travel_request_query(user):
    if not user:
        user = frappe.session.user

    jh_user = frappe.db.get_value("JH User Master", {"user": user}, "name")

    return f"""
        (`tabJH Travel Request`.owner = {frappe.db.escape(user)}
        OR `tabJH Travel Request`.assigned_to = {frappe.db.escape(jh_user)}
        OR `tabJH Travel Request`.po_assigned_to = {frappe.db.escape(jh_user)}
        OR `tabJH Travel Request`.requested_by IN (
            SELECT name FROM `tabJH User Master` WHERE reporting_manager = {frappe.db.escape(jh_user)}
        )
        OR {frappe.db.escape(user)} IN (
            SELECT parent FROM `tabHas Role` WHERE role = 'JH Credit Card Holder'
        ))
    """


# ---- Projects -------------------------------------------------------------
# A Project is visible to the people who work on it and to their managers:
# - "my" Projects: the user created it or is in its Participant List;
# - "team" Projects: created by, or with a participant from, anyone in the
#   user's reporting line (every level below the user, as in Team Tasks).
# Project admins see every Project.


def is_project_admin(user: str | None = None) -> bool:
    user = user or frappe.session.user
    return user == "Administrator" or bool(PROJECT_ADMIN_ROLES & set(frappe.get_roles(user)))


def _reporting_line(employee: str) -> set[str]:
    """Every employee who reports to `employee`, directly or further down."""
    team: set[str] = set()
    frontier = [employee]
    while frontier:
        reports = frappe.get_all("JH User Master", filters={"reporting_manager": ["in", frontier]}, pluck="name")
        frontier = [name for name in reports if name not in team and name != employee]
        team.update(frontier)
    return team


def _projects_of(employees: set[str], users: set[str]) -> set[str]:
    projects: set[str] = set()
    if employees:
        projects.update(frappe.get_all(
            "JH Project Participant",
            filters={"parenttype": "JH Project", "parentfield": "participants", "employee": ["in", list(employees)]},
            pluck="parent",
        ))
    if users:
        projects.update(frappe.get_all(
            "JH Project", or_filters={"created_by": ["in", list(users)], "owner": ["in", list(users)]}, pluck="name",
        ))
    return projects


def project_scope(user: str | None = None) -> dict[str, set[str]]:
    """The user's "my" and "team" Project names, cached for the request."""
    user = user or frappe.session.user
    cache = getattr(frappe.local, "jh_project_scope", None)
    if cache is None:
        cache = frappe.local.jh_project_scope = {}
    if user not in cache:
        employee = frappe.db.get_value("JH User Master", {"user": user}, "name")
        team_employees = _reporting_line(employee) if employee else set()
        team_users = set(frappe.get_all("JH User Master", filters={"name": ["in", list(team_employees)]}, pluck="user")) - {None, ""} if team_employees else set()
        cache[user] = {
            "my": _projects_of({employee} if employee else set(), {user}),
            "team": _projects_of(team_employees, team_users),
        }
    return cache[user]


def _visible_projects(user: str) -> set[str]:
    scope = project_scope(user)
    return scope["my"] | scope["team"]


def _in_condition(column: str, names: set[str]) -> str:
    if not names:
        return "1=0"
    return f"{column} in ({', '.join(frappe.db.escape(name) for name in sorted(names))})"


def project_query(user):
    user = user or frappe.session.user
    if is_project_admin(user):
        return ""
    return _in_condition("`tabJH Project`.name", _visible_projects(user))


def project_item_query(user):
    user = user or frappe.session.user
    if is_project_admin(user):
        return ""
    return _in_condition("`tabJH Project Item`.project", _visible_projects(user))


def project_has_permission(doc, ptype=None, user=None):
    user = user or frappe.session.user
    if is_project_admin(user) or ptype == "create" or doc.is_new():
        return True
    return doc.name in _visible_projects(user)


def project_item_has_permission(doc, ptype=None, user=None):
    user = user or frappe.session.user
    if is_project_admin(user):
        return True
    return doc.project in _visible_projects(user)
