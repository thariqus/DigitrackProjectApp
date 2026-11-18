import frappe
from frappe.model.document import Document
from frappe.utils import cint, now_datetime

MAX_UPDATE_EMAIL_INTERVAL_DAYS = 365


class JHProject(Document):
    def on_trash(self):
        if frappe.db.exists("JH Project Item", {"project": self.name}):
            frappe.throw("Cannot delete this Project because it contains Items.")

    def validate(self):
        if self.start_date and self.due_date and self.due_date < self.start_date:
            frappe.throw("Due Date cannot be earlier than Start Date")
        if not self.is_new():
            self.keep_system_fields()
        if not self.created_by:
            self.created_by = frappe.session.user
        if not self.created_at:
            self.created_at = now_datetime()
        if not self.status:
            self.status = "Open"
        if cint(self.update_email_interval_days) < 0:
            frappe.throw("Update Email Interval (Days) cannot be negative")
        if cint(self.update_email_interval_days) > MAX_UPDATE_EMAIL_INTERVAL_DAYS:
            frappe.throw(f"Update Email Interval (Days) cannot be more than {MAX_UPDATE_EMAIL_INTERVAL_DAYS}")

    def keep_system_fields(self) -> None:
        """Keep the fields users never edit when a client saves a partial Project.

        A save replaces the whole record, so a client that omits these fields
        would otherwise clear them, and validate() would then refill the
        creator fields from the current user. The scheduler sets
        last_update_email_sent_on with db.set_value, which skips validate.
        """
        saved = frappe.db.get_value(
            "JH Project",
            self.name,
            ["owner", "created_by", "created_at", "last_update_email_sent_on", "show_status_priority"],
            as_dict=True,
        )
        if not saved:
            return
        self.created_by = saved.created_by or saved.owner
        self.created_at = saved.created_at
        self.last_update_email_sent_on = saved.last_update_email_sent_on
        # Show Status Priority can be changed, so restore it only when the
        # client did not send it.
        if self.show_status_priority is None:
            self.show_status_priority = saved.show_status_priority
