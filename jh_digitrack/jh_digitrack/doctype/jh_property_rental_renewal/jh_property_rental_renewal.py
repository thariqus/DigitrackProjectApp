# Copyright (c) 2026, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class JHPropertyRentalRenewal(Document):

	def validate(self):
		self.validate_active_property_renewal()

	def before_save(self):
		self.calculate_rent_change_percent()

	def before_submit(self):
		if (self.workflow_state or "Draft") == "Draft":
			self.workflow_state = "Pending Approver 1"

	def calculate_rent_change_percent(self):
		current_rent = flt(self.current_rent)
		proposed_rent = flt(self.proposed_rent)

		if not current_rent or self.proposed_rent in (None, ""):
			self.rent_change_percent = 0
			return

		self.rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100

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


