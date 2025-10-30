# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt


import frappe
from frappe.model.document import Document

class PMSEmployees(Document):
    def before_save(self):
        name_parts = [self.first_name, self.middle_name, self.last_name]
        name_parts = [part.strip() for part in name_parts if part and part.strip()]
        self.full_name = " ".join(name_parts)
