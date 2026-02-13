# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class JHAuditMaster(Document):
    def validate(self):
        """Sanitize HTML in text fields to prevent XSS attacks"""
        if self.audit_description:
            self.audit_description = frappe.utils.sanitize_html(self.audit_description, always_sanitize=True)
        if self.additional_comments:
            self.additional_comments = frappe.utils.sanitize_html(self.additional_comments, always_sanitize=True)
        if self.remarks:
            self.remarks = frappe.utils.sanitize_html(self.remarks, always_sanitize=True)
        if self.file_name:
            self.file_name = frappe.utils.sanitize_html(self.file_name, always_sanitize=True)
        if self.folder_name:
            self.folder_name = frappe.utils.sanitize_html(self.folder_name, always_sanitize=True)
