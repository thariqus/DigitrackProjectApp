# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class JHTravelRequest(Document):
    def before_insert(self):
        user = frappe.session.user
        jh_user = frappe.db.get_value("JH User Master", {"user": user}, ["name"])
        if not jh_user:
            frappe.throw("User is not a valid JH User")

        self.requested_by = jh_user
        if self.is_urgent and self.request_status == "Approval Pending":
            self.request_status = "Urgent"
        if "JH Credit Card Holder" in frappe.get_roles():
            self.request_status = "Approved"

    def before_save(self):
        for attachment in self.attachments:
            if not attachment.created_by:
                jh_user = frappe.db.get_value(
                    "JH User Master", {"user": attachment.owner}, ["name"]
                )
                attachment.created_by = jh_user
