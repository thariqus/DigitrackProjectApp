import json
from typing import Any

import frappe
from frappe.utils import cint, escape_html, getdate, now_datetime, nowdate, validate_email_address

from jh_digitrack.jh_digitrack.doctype.jh_project_item.jh_project_item import get_workflow_state

SEVERITY_PRIORITY = {"Critical": 1, "High": 2, "Medium": 3, "Low": 4}
# Set by the system, so a change to them is not a user edit.
SYSTEM_FIELDS = {"created_by", "created_at", "deleted_at", "deleted_by", "item_number"}


@frappe.whitelist(methods=["POST"])
def soft_delete_item(name: str):
    """Mark an Item deleted while preserving its audit trail and attachments."""
    item = frappe.get_doc("JH Project Item", name)
    item.check_permission("write")
    if item.deleted_at:
        frappe.throw("This Item is already deleted")
    if _has_edits(item.name):
        frappe.throw("This Item has been edited, so it cannot be deleted")

    item.deleted_at = now_datetime()
    item.deleted_by = frappe.session.user
    item.save()
    return {"name": item.name, "deleted_at": item.deleted_at, "deleted_by": item.deleted_by}


@frappe.whitelist(methods=["GET"])
def get_project_tabs() -> dict[str, Any]:
    """Project names for the current user's My Projects and Team Projects tabs."""
    from jh_digitrack.permissions import is_project_admin, project_scope

    scope = project_scope()
    return {"is_admin": is_project_admin(), "my": sorted(scope["my"]), "team": sorted(scope["team"])}


@frappe.whitelist(methods=["GET"])
def get_project_item_audit(project_id: str) -> list[dict[str, Any]]:
    frappe.has_permission(doctype="JH Project", ptype="read", doc=project_id, throw=True)

    items = frappe.get_list(
        "JH Project Item",
        filters={"project": project_id},
        fields=["name", "item_description", "created_by", "created_at", "owner", "creation", "deleted_at", "deleted_by"],
        limit_page_length=5000,
    )
    item_names = [item.name for item in items]
    if not item_names:
        return []

    audit = []
    items_by_name = {item.name: item for item in items}
    for item in items:
        audit.append({
            "item_id": item.name,
            "item_description": item.item_description,
            "event": "Item created",
            "user": item.created_by or item.owner,
            "timestamp": item.created_at or item.creation,
            "changes": [],
        })
        if item.deleted_at:
            audit.append({
                "item_id": item.name,
                "item_description": item.item_description,
                "event": "Item deleted",
                "user": item.deleted_by,
                "timestamp": item.deleted_at,
                "changes": [],
            })

    # Version is an internal, System Manager-only DocType. Access its rows only
    # after resolving the caller's readable Item records above, and restrict the
    # query to those exact document names.
    versions = frappe.get_all(
        "Version",
        filters={"ref_doctype": "JH Project Item", "docname": ["in", item_names]},
        fields=["docname", "owner", "creation", "data"],
        order_by="creation desc",
        limit_page_length=5000,
    )
    field_labels = {field.fieldname: field.label for field in frappe.get_meta("JH Project Item").fields}
    employee_names = {}
    for version in versions:
        try:
            data = json.loads(version.data or "{}")
        except (TypeError, ValueError):
            continue
        changes = _version_changes(data, field_labels, employee_names)
        if not changes:
            continue
        item = items_by_name[version.docname]
        audit.append({
            "item_id": version.docname,
            "item_description": item.item_description,
            "event": "Item edited",
            "user": version.owner,
            "timestamp": version.creation,
            "changes": changes,
        })

    audit.sort(key=lambda entry: entry["timestamp"] or "", reverse=True)
    return audit[:5000]


def _version_changes(data: dict, field_labels: dict, employee_names: dict) -> list[dict[str, Any]]:
    """The user-visible changes in one Version. System fields are ignored."""
    changes = [
        {"field": field_labels.get(change[0], change[0]), "from": change[1], "to": change[2]}
        for change in data.get("changed", [])
        if change[0] not in SYSTEM_FIELDS
    ]
    assignment_change = _assignment_change(data, employee_names)
    if assignment_change:
        changes.append(assignment_change)
    return changes


def _has_edits(item_name: str) -> bool:
    """True once the Item has a saved edit. The Item list uses the same rule
    (an "Item edited" audit entry) to disable its Delete button."""
    field_labels = {field.fieldname: field.label for field in frappe.get_meta("JH Project Item").fields}
    employee_names = {}
    versions = frappe.get_all(
        "Version",
        filters={"ref_doctype": "JH Project Item", "docname": item_name},
        pluck="data",
    )
    for raw in versions:
        try:
            data = json.loads(raw or "{}")
        except (TypeError, ValueError):
            continue
        if _version_changes(data, field_labels, employee_names):
            return True
    return False


def _assignment_change(version_data: dict, employee_names: dict) -> dict[str, str] | None:
    """Summarize an Assigned Participants change from a Version log entry.

    Frappe logs child table edits as rows added, removed or changed, not as
    field changes. The Item form re-sends every row on save, so an
    unchanged list also appears as rows removed and added; only the net
    difference is a real change.
    """
    added, removed = set(), set()
    for key, target in (("added", added), ("removed", removed)):
        for row in version_data.get(key, []):
            if row and row[0] == "assigned_participants" and isinstance(row[1], dict):
                target.add(row[1].get("employee"))
    for row in version_data.get("row_changed", []):
        if row and row[0] == "assigned_participants":
            for fieldname, old, new in row[3]:
                if fieldname == "employee":
                    removed.add(old)
                    added.add(new)
    added, removed = added - removed - {None}, removed - added - {None}
    if not added and not removed:
        return None

    def names(employees: set) -> str:
        for employee in employees - employee_names.keys():
            employee_names[employee] = frappe.db.get_value("JH User Master", employee, "full_name") or employee
        return ", ".join(sorted(employee_names[employee] for employee in employees)) or "—"

    return {"field": "Assigned Participants (removed → added)", "from": names(removed), "to": names(added)}


@frappe.whitelist(methods=["POST"])
def send_project_item_email(
    item_name: str,
    recipients: list[str],
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    message: str = "",
) -> dict[str, str]:
    """Email an Item message only to selected participants of its Project."""
    if not item_name or not isinstance(recipients, list) or not recipients:
        frappe.throw("Select at least one To participant")
    for values in (recipients, cc or [], bcc or []):
        if not isinstance(values, list) or any(not isinstance(value, str) or not value for value in values):
            frappe.throw("Recipients must be selected from the Project Participant List")
    if not message or not message.strip():
        frappe.throw("Message is required")

    # Each person gets one copy: To wins over CC, and CC over BCC.
    recipients = list(dict.fromkeys(recipients))
    cc = [name for name in dict.fromkeys(cc or []) if name not in recipients]
    bcc = [name for name in dict.fromkeys(bcc or []) if name not in recipients and name not in cc]

    item = frappe.get_doc("JH Project Item", item_name)
    item.check_permission("read")
    project = frappe.get_doc("JH Project", item.project)
    project.check_permission("read")
    participant_ids = {row.employee for row in project.participants}
    selected = list(dict.fromkeys(recipients + (cc or []) + (bcc or [])))
    if not set(selected).issubset(participant_ids):
        frappe.throw("Email recipients must be Project participants")

    users = frappe.get_list(
        "JH User Master",
        filters={"name": ["in", selected]},
        fields=["name", "email", "full_name"],
        limit_page_length=len(selected),
    )
    users_by_name = {user.name: user for user in users}
    if len(users_by_name) != len(selected):
        frappe.throw("One or more selected participants are unavailable")
    for user in users:
        if not user.email or not validate_email_address(user.email, throw=False):
            frappe.throw(f"Participant {user.full_name or user.name} needs a valid email address")

    email_by_name = {user.name: user.email for user in users}
    subject = f"[{item.name}] {item.item_description}"
    body = (
        f"<p>{escape_html(message.strip()).replace(chr(10), '<br>')}</p>"
        f"<hr><p><b>Project:</b> {escape_html(project.name)} — {escape_html(project.project_name)}</p>"
        f"<p><b>Item:</b> {escape_html(item.name)} — {escape_html(item.item_description)}</p>"
    )
    frappe.sendmail(
        recipients=[email_by_name[name] for name in recipients],
        cc=[email_by_name[name] for name in (cc or [])],
        bcc=[email_by_name[name] for name in (bcc or [])],
        subject=subject,
        message=body,
        reference_doctype="JH Project Item",
        reference_name=item.name,
    )
    return {"status": "queued"}


@frappe.whitelist(methods=["POST"])
def approve_rca_and_close(item_name: str, status: str, approval_comments: str) -> dict[str, str]:
    if not item_name or not status or not approval_comments or not approval_comments.strip():
        frappe.throw("Item, a Closed workflow status, and RCA approval comments are required")
    item = frappe.get_doc("JH Project Item", item_name)
    item.check_permission("write")
    if not item.rca_required:
        frappe.throw("This Item does not require RCA approval")
    if get_workflow_state(item.status) == "Closed":
        frappe.throw("This Item is already in a Closed workflow status")
    if get_workflow_state(status) != "Closed":
        frappe.throw("Select a status with the Closed workflow")

    item.status = status
    item.rca_approved = 1
    item.rca_approved_by = frappe.session.user
    item.rca_approved_at = now_datetime()
    item.rca_approval_comments = approval_comments.strip()
    item.flags.rca_approval = True
    item.save()
    return {"name": item.name, "status": item.status, "rca_approved_by": item.rca_approved_by}


def send_scheduled_update_emails():
    """Daily job: email the update digest of each Project whose interval is due.

    A Project qualifies when it is not Closed or Cancelled, its Update Email
    Interval (Days) is more than 0, and it has Items whose status has the Open
    workflow. The Due Date is not checked. The first digest goes out on the
    first run after the interval is set, then again every N days. The digest
    goes to every participant with a valid email, with the Project creator in CC.
    """
    today = getdate(nowdate())
    projects = frappe.get_all(
        "JH Project",
        filters={
            "status": ["not in", ["Closed", "Cancelled"]],
            "update_email_interval_days": [">", 0],
        },
        pluck="name",
    )
    for project_id in projects:
        try:
            _send_scheduled_update_email(frappe.get_doc("JH Project", project_id), today)
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            frappe.log_error(title=f"Project update email failed for {project_id}")


def _send_scheduled_update_email(project, today) -> None:
    if not _is_update_email_due(project, today):
        return
    open_items = _get_open_workflow_items(project.name)
    if not open_items:
        return
    recipients = _get_participant_emails(project)
    if not recipients:
        return

    creator_email = frappe.db.get_value("User", project.created_by or project.owner, "email")
    cc = [creator_email] if creator_email and creator_email not in recipients else []
    frappe.sendmail(
        recipients=recipients,
        cc=cc,
        subject=f"Project Update: {project.name} — {project.project_name}",
        message=_update_email_message(project, open_items),
        reference_doctype="JH Project",
        reference_name=project.name,
    )
    # set_value skips validate and keeps "modified", so open editors are not
    # told the Project changed under them.
    frappe.db.set_value("JH Project", project.name, "last_update_email_sent_on", today, update_modified=False)


def _is_update_email_due(project, today) -> bool:
    interval = cint(project.update_email_interval_days)
    if interval <= 0 or project.status in {"Closed", "Cancelled"}:
        return False
    if not project.last_update_email_sent_on:
        return True
    return (today - getdate(project.last_update_email_sent_on)).days >= interval


def _get_participant_emails(project) -> list[str]:
    employee_ids = list({row.employee for row in project.participants})
    if not employee_ids:
        return []
    emails = frappe.get_all("JH User Master", filters={"name": ["in", employee_ids]}, pluck="email")
    valid = [email for email in emails if email and validate_email_address(email)]
    return list(dict.fromkeys(valid))


def _get_status_numbers() -> dict[str, int]:
    rows = frappe.get_all("JH Project Item Status", fields=["name", "status_number"], limit_page_length=1000)
    return {row.name: row.status_number or 999 for row in rows}


def _get_open_workflow_items(project_id: str) -> list:
    """Return the Project's Items that are not deleted and whose status has the
    Open workflow, sorted by severity, then status number."""
    open_statuses = frappe.get_all("JH Project Item Status", filters={"workflow_state": "Open"}, pluck="name")
    if not open_statuses:
        return []
    status_numbers = _get_status_numbers()
    items = frappe.get_all(
        "JH Project Item",
        filters={"project": project_id, "deleted_at": ["is", "not set"], "status": ["in", open_statuses]},
        fields=["name", "item_description", "requirement_or_defect", "severity", "status", "due_date", "revised_due_date", "reported_site", "rca_required"],
        limit_page_length=5000,
    )
    items.sort(key=lambda item: (SEVERITY_PRIORITY.get(item.severity, 999), status_numbers.get(item.status, 999), item.name))
    return items


def _update_email_message(project, open_items: list) -> str:
    status_numbers = _get_status_numbers()
    show_priority = project.get("show_status_priority") is None or cint(project.show_status_priority)

    def numbered_cell(number, label):
        label = escape_html(label or "")
        return f"{number:02d} · {label}" if show_priority else label

    rows = "".join(
        "<tr>"
        f"<td>{escape_html(item.name)}</td>"
        f"<td>{escape_html(item.item_description or '')}</td>"
        f"<td>{numbered_cell(status_numbers.get(item.status, 999), item.status)}</td>"
        f"<td>{escape_html(item.requirement_or_defect or '')}</td>"
        f"<td>{numbered_cell(SEVERITY_PRIORITY.get(item.severity, 999), item.severity)}</td>"
        f"<td>{escape_html(str(item.due_date or ''))}</td>"
        f"<td>{escape_html(str(item.revised_due_date or ''))}</td>"
        f"<td>{escape_html(item.reported_site or '')}</td>"
        f"<td>{'Yes' if item.rca_required else 'No'}</td></tr>"
        for item in open_items
    )
    return (
        f"<p>{escape_html(project.name)} — {escape_html(project.project_name)} has "
        f"{len(open_items)} Item(s) in an Open workflow status, listed by severity.</p>"
        "<table border='1' cellpadding='6' cellspacing='0'><thead><tr>"
        "<th>Item ID</th><th>Description</th><th>Status</th><th>Req/Defect</th><th>Severity</th>"
        "<th>Item Due Date</th><th>Revised Due Date</th><th>Reported Site</th><th>RCA Required</th>"
        f"</tr></thead><tbody>{rows}</tbody></table>"
    )
