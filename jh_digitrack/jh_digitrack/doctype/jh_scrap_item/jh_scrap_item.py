# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class JHScrapItem(Document):
    def validate(self):
        """Sanitize HTML in text fields to prevent XSS attacks"""
        if self.description:
            self.description = frappe.utils.sanitize_html(self.description, always_sanitize=True)


