# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class JHGoalMaster(Document):
    def validate(self):
        """Sanitize HTML in text fields to prevent XSS attacks"""
        if self.goal_description:
            self.goal_description = frappe.utils.sanitize_html(self.goal_description, always_sanitize=True)
