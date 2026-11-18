import frappe
from frappe.model.document import Document
from frappe.utils import cint, getdate, now_datetime

RCA_APPROVAL_FIELDS = ("rca_approved", "rca_approved_by", "rca_approved_at", "rca_approval_comments")


class JHProjectItem(Document):
    def autoname(self):
        if not self.project:
            frappe.throw("Project is required before an Item ID can be generated")

        # Serialize name allocation per project, including simultaneous inserts.
        project = frappe.qb.DocType("JH Project")
        frappe.qb.from_(project).select(project.name).where(project.name == self.project).for_update().run()

        item = frappe.qb.DocType("JH Project Item")
        existing_items = (
            frappe.qb.from_(item)
            .select(item.name, item.item_number)
            .where(item.project == self.project)
        ).run(as_dict=True)
        name_numbers = []
        item_prefix = f"{self.project.replace('-', '')}#"
        for row in existing_items:
            suffix = row.name.removeprefix(item_prefix)
            if row.name.startswith(item_prefix) and suffix.isdigit():
                name_numbers.append(int(suffix))
        last_number = max(
            [int(row.item_number or 0) for row in existing_items]
            + name_numbers
            + [0]
        )
        self.item_number = last_number + 1
        self.name = f"{self.project.replace('-', '')}#{self.item_number:02d}"
        while frappe.db.exists("JH Project Item", self.name):
            self.item_number += 1
            self.name = f"{self.project.replace('-', '')}#{self.item_number:02d}"

    def validate(self):
        self.validate_not_deleted()
        if self.is_new():
            self.created_by = frappe.session.user
            self.created_at = now_datetime()
            if not self.status:
                self.status = "Open"
        else:
            creation_metadata = frappe.db.get_value(
                "JH Project Item",
                self.name,
                ["created_by", "created_at", "item_number"],
                as_dict=True,
            )
            if creation_metadata:
                self.created_by = creation_metadata.created_by
                self.created_at = creation_metadata.created_at
                self.item_number = creation_metadata.item_number
        if not self.item_description or not self.item_description.strip():
            frappe.throw("Item Description is required")
        if not self.requirement_or_defect:
            frappe.throw("Req/Def is required")
        if not self.severity:
            frappe.throw("Severity is required")
        if not self.status:
            frappe.throw("Status is required")
        if not frappe.db.exists("JH Project Item Status", self.status):
            frappe.throw("Select a valid Item Status")
        if self.requirement_or_defect not in {"FR", "NFR", "Defect"}:
            frappe.throw("Req/Def must be FR, NFR, or Defect")
        if self.due_date and self.revised_due_date and getdate(self.revised_due_date) < getdate(self.due_date):
            frappe.throw("Revised Due Date cannot be earlier than Due Date (Actual)")
        self.validate_assigned_participants()

        previous = self.get_doc_before_save() if not self.is_new() else None
        if previous and cint(previous.rca_required) and not cint(self.rca_required):
            frappe.throw("RCA Required cannot be unchecked after it has been saved for this Item")
        if previous and not self.flags.get("rca_approval"):
            for fieldname in RCA_APPROVAL_FIELDS:
                self.set(fieldname, previous.get(fieldname))
        elif not previous and not self.flags.get("rca_approval") and self.rca_approved:
            frappe.throw("RCA approval can only be recorded through the approval dialog")

        was_closed = bool(previous) and get_workflow_state(previous.status) == "Closed"
        is_closed = get_workflow_state(self.status) == "Closed"
        if was_closed:
            self.validate_closed_item_edit(previous, is_closed)
            if not is_closed:
                self.reset_rca_approval()
        elif is_closed and self.rca_required and not self.flags.get("rca_approval"):
            frappe.throw("Verify and approve the RCA before moving this Item to a Closed workflow status")

        if self.flags.get("rca_approval"):
            if not self.rca_required or not is_closed or was_closed:
                frappe.throw("RCA approval is only valid when moving an Item that requires RCA to a Closed workflow status")
            if not self.rca_approval_comments or not self.rca_approval_comments.strip():
                frappe.throw("RCA approval comments are required")

    def validate_not_deleted(self) -> None:
        """A soft-deleted Item is read-only. The Items page hides Edit for it;
        this also blocks direct API updates, including clearing deleted_at."""
        if self.is_new():
            return
        if frappe.db.get_value("JH Project Item", self.name, "deleted_at"):
            frappe.throw("This Item is deleted and cannot be edited")

    def validate_assigned_participants(self) -> None:
        """An Item may have no assignees. The Item form ticks every Project
        participant by default, so an empty list is the user's choice."""
        project_participants = frappe.get_all(
            "JH Project Participant",
            filters={"parenttype": "JH Project", "parent": self.project},
            pluck="employee",
        )
        assigned = [row.employee for row in self.assigned_participants]
        if len(assigned) != len(set(assigned)):
            frappe.throw("A participant can be assigned only once")
        previous = self.get_doc_before_save()
        already_assigned = {row.employee for row in previous.assigned_participants} if previous else set()
        if not set(assigned).issubset(set(project_participants) | already_assigned):
            frappe.throw("Assigned participants must be in the Project Participant List")

    def validate_closed_item_edit(self, previous, is_closed: bool) -> None:
        """RCA fields of an Item in a Closed workflow status are locked until
        it is moved back to an Open workflow status. Other fields stay editable."""
        if is_closed and cint(self.rca_required) != cint(previous.rca_required):
            frappe.throw(
                "RCA fields cannot be edited while this Item is in a Closed workflow status. "
                "Move it to an Open workflow status first. This resets the RCA approval."
            )

    def reset_rca_approval(self) -> None:
        # The Version log keeps the previous approval for the audit trail.
        self.rca_approved = 0
        self.rca_approved_by = None
        self.rca_approved_at = None
        self.rca_approval_comments = None


def get_workflow_state(status: str | None) -> str | None:
    if not status:
        return None
    return frappe.db.get_value("JH Project Item Status", status, "workflow_state")
