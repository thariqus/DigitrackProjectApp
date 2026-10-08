# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class JHTravelRequest(Document):
    def validate(self):
        """Sanitize HTML in text fields to prevent XSS attacks"""
        if self.description:
            self.description = frappe.utils.sanitize_html(self.description, always_sanitize=True)
        if self.passenger_information:
            self.passenger_information = frappe.utils.sanitize_html(self.passenger_information, always_sanitize=True)

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

    def after_insert(self):
        if self.name:
            self.virtual_name = self.name
            self.save()

        # Sent from a background job only after this request is committed
        frappe.enqueue(
            "jh_digitrack.api.travel_notifications.notify_reporting_manager",
            travel_request=self.name,
            enqueue_after_commit=True,
        )

    def before_save(self):
        for attachment in self.attachments:
            if not attachment.created_by:
                jh_user = frappe.db.get_value(
                    "JH User Master", {"user": attachment.owner}, ["name"]
                )
                attachment.created_by = jh_user
        self.set_current_status()

    def set_current_status(self):
        """Human-readable summary of where the request is currently pending."""
        status = self.request_status

        if status == "Approval Pending":
            manager_name = None
            if self.requested_by:
                reporting_manager = frappe.db.get_value(
                    "JH User Master", self.requested_by, "reporting_manager"
                )
                if reporting_manager:
                    manager_name = frappe.db.get_value(
                        "JH User Master", reporting_manager, "full_name"
                    )
            self.current_status = f"Pending Approval - {manager_name}" if manager_name else "Pending Approval"

        elif status in ("Approved", "Urgent", "Reconfirmed"):
            self.current_status = "Pending - Credit Card Holder"

        elif status == "Reconfirmation Pending":
            requester_name = (
                frappe.db.get_value("JH User Master", self.requested_by, "full_name")
                if self.requested_by
                else None
            )
            self.current_status = (
                f"Pending Reconfirmation - {requester_name}" if requester_name else "Pending Reconfirmation"
            )

        elif status == "Assigned for PO / IEM":
            po_assignee_name = (
                frappe.db.get_value("JH User Master", self.po_assigned_to, "full_name")
                if self.po_assigned_to
                else None
            )
            self.current_status = f"PO Pending - {po_assignee_name}" if po_assignee_name else "PO Pending"

        elif status == "Assigned for GRN / Miro":
            assignee_name = (
                frappe.db.get_value("JH User Master", self.assigned_to, "full_name")
                if self.assigned_to
                else None
            )
            self.current_status = f"MIRO Pending - {assignee_name}" if assignee_name else "MIRO Pending"

        else:
            # Completed, Denied, or any other terminal/unmapped status
            self.current_status = status
