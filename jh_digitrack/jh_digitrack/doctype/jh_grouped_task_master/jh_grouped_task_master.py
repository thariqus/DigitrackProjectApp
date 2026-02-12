# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class JHGroupedTaskMaster(Document):
    def validate(self):
        """Sanitize HTML in text fields to prevent XSS attacks"""
        if self.agenda:
            self.agenda = frappe.utils.sanitize_html(self.agenda, always_sanitize=True)
        if self.remarks:
            self.remarks = frappe.utils.sanitize_html(self.remarks, always_sanitize=True)
        if self.participants_external:
            self.participants_external = frappe.utils.sanitize_html(self.participants_external, always_sanitize=True)
