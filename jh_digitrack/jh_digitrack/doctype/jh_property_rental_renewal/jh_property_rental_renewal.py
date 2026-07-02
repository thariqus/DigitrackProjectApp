# Copyright (c) 2026, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate, today


class JHPropertyRentalRenewal(Document):

	def validate(self):
		for field in [
			'remarks', 'po_number', 'miro_number', 'division', 'location',
			'emirate', 'landlord', 'property_type', 'tenancy_period',
		]:
			if self.get(field):
				self.set(field, frappe.utils.sanitize_html(self.get(field), always_sanitize=True))
		self.validate_dates()
		self.validate_currency_fields()
		self.validate_active_property_renewal()

	def before_save(self):
		self.calculate_rent_change_percent()

	def before_submit(self):
		if (self.workflow_state or "Draft") == "Draft":
			self.workflow_state = "Pending Approver 1"
			self.step_entered_on = frappe.utils.now_datetime()

	def calculate_rent_change_percent(self):
		current_rent = flt(self.current_rent)
		proposed_rent = flt(self.proposed_rent)

		if not current_rent or self.proposed_rent in (None, ""):
			self.rent_change_percent = 0
			return

		self.rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100

	def validate_dates(self):
		if self.renewal_from and getdate(self.renewal_from) < getdate(today()):
			frappe.throw(_("Renewal From date cannot be in the past."))

		if self.renewal_from and self.renewal_to:
			if getdate(self.renewal_to) <= getdate(self.renewal_from):
				frappe.throw(_("Renewal To date must be after Renewal From date."))

	def validate_currency_fields(self):
		if self.proposed_rent is not None and flt(self.proposed_rent) < 0:
			frappe.throw(_("Proposed Rent cannot be negative."))

		for row in self.get("cheque_details", []):
			if row.cheque_amount is not None and flt(row.cheque_amount) < 0:
				frappe.throw(_("Cheque Amount in row {0} cannot be negative.").format(row.idx))

	def validate_active_property_renewal(self):
		if not self.property:
			return

		active_states = [
			"Draft",
			"Pending Approver 1",
			"Pending Approver 2",
			"Pending CFO",
			"Pending MD",
			"Pending Cheque Details",
			"Pending Property PO",
			"Pending MIRO",
		]

		existing_renewal = frappe.db.exists(
			"JH Property Rental Renewal",
			{
				"property": self.property,
				"workflow_state": ["in", active_states],
				"name": ["!=", self.name],
			},
		)

		if existing_renewal:
			frappe.throw(
				_(
					"An active rental renewal already exists for property {0}: {1}"
				).format(self.property, existing_renewal)
			)


