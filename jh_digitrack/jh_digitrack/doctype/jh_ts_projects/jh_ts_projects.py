# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class JHTSProjects(Document):
    def validate(self):
        """Sanitize HTML in text fields to prevent XSS attacks"""
        if self.description:
            self.description = frappe.utils.sanitize_html(self.description, always_sanitize=True)
        if self.action:
            self.action = frappe.utils.sanitize_html(self.action, always_sanitize=True)
        if self.learning:
            self.learning = frappe.utils.sanitize_html(self.learning, always_sanitize=True)
        if self.project_folder:
            self.project_folder = frappe.utils.sanitize_html(self.project_folder, always_sanitize=True)
        if self.rfp_document_folder:
            self.rfp_document_folder = frappe.utils.sanitize_html(self.rfp_document_folder, always_sanitize=True)
        if self.bc_document_folder:
            self.bc_document_folder = frappe.utils.sanitize_html(self.bc_document_folder, always_sanitize=True)
        if self.contract__document_folder:
            self.contract__document_folder = frappe.utils.sanitize_html(self.contract__document_folder, always_sanitize=True)
        if self.nda_document_folder:
            self.nda_document_folder = frappe.utils.sanitize_html(self.nda_document_folder, always_sanitize=True)
        if self.project_plan_document_folder:
            self.project_plan_document_folder = frappe.utils.sanitize_html(self.project_plan_document_folder, always_sanitize=True)
        if self.technical_spoc:
            self.technical_spoc = frappe.utils.sanitize_html(self.technical_spoc, always_sanitize=True)
        if self.nda_signed:
            self.nda_signed = frappe.utils.sanitize_html(self.nda_signed, always_sanitize=True)
        if self.allocated_by:
            self.allocated_by = frappe.utils.sanitize_html(self.allocated_by, always_sanitize=True)
        if self.allocated_to:
            self.allocated_to = frappe.utils.sanitize_html(self.allocated_to, always_sanitize=True)
