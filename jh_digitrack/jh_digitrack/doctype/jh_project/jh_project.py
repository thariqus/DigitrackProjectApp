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
