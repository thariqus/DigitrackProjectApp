import frappe
from frappe.model.document import Document

WORKFLOW_STATES = ("Open", "Closed")


class JHProjectItemStatus(Document):
    def validate(self):
        if not self.status_name or not self.status_name.strip():
            frappe.throw("Status Name is required")
        if not self.status_number or self.status_number < 1:
            frappe.throw("Sort Number must be greater than zero")
        if self.workflow_state not in WORKFLOW_STATES:
            frappe.throw("Workflow must be Open or Closed")
        if not self.is_new() and self.has_value_changed("workflow_state"):
            # Fixed at creation: changing it would close or reopen Items
            # without the RCA check or reset.
            frappe.throw("The Workflow of a status cannot be changed after it is created")
        duplicate = frappe.db.exists(
            "JH Project Item Status",
            {"status_number": self.status_number, "name": ["!=", self.name]},
        )
        if duplicate:
            frappe.throw(f"Sort Number {self.status_number:02d} is already used by {duplicate}")

    def on_trash(self):
        if self.name == "Open":
            frappe.throw("The default Open status cannot be deleted")
        if frappe.db.exists("JH Project Item", {"status": self.name}):
            frappe.throw("This status is assigned to Items and cannot be deleted")
        self.validate_keeps_workflow_state(self.workflow_state)

    def validate_keeps_workflow_state(self, workflow_state: str) -> None:
        """Keep at least one status in each workflow, so Items can always be
        closed and reopened."""
        others = frappe.db.count(
            "JH Project Item Status", {"workflow_state": workflow_state, "name": ["!=", self.name]}
        )
        if workflow_state in WORKFLOW_STATES and not others:
            frappe.throw(f"Keep at least one status with the {workflow_state} workflow")
