# Copyright (c) 2026, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate, today

from jh_digitrack.api.property_management import ACTIVE_RENEWAL_STATES

VAT_RATE = 0.05
PARENT_VAT_LABEL = "Rent VAT"
PARENT_RENT_LABEL = "Rent"


class JHPropertyRentalRenewal(Document):

	def validate(self):
		for field in [
			'remarks', 'po_number', 'division', 'location',
			'emirate', 'landlord', 'property_type', 'tenancy_period',
		]:
			if self.get(field):
				self.set(field, frappe.utils.sanitize_html(self.get(field), always_sanitize=True))
				
		for row in self.get("table_gfwd", []):
			if row.miro_number:
				row.miro_number = frappe.utils.sanitize_html(row.miro_number, always_sanitize=True)
		self.validate_dates()
		self.validate_currency_fields()
		self.validate_active_property_renewal()

	def before_save(self):
		self.calculate_rent_change_percent()
		self.sync_parent_rent_row()
		self.sync_parent_vat_row()
		self.calculate_particular_total()
		self.calculate_cheque_total()

	def before_submit(self):
		if (self.workflow_state or "Draft") == "Draft":
			self.workflow_state = "Pending Approver 1"
			self.step_entered_on = frappe.utils.now_datetime()

	def calculate_rent_change_percent(self):
		current_rent = flt(self.current_rent)
		proposed_rent = flt(self.proposed_rent)

		if not current_rent or self.proposed_rent in (None, ""):
			self.rent_change_percent = 0
			self.rent_change = 0
			return

		self.rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100
		self.rent_change = round(proposed_rent - current_rent)

	def sync_parent_rent_row(self):
		rows = self.get("table_xqmr") or []
		existing = next((row for row in rows if row.label == PARENT_RENT_LABEL), None)

		if self.proposed_rent:
			rent_amount = flt(self.proposed_rent, 2)
			if existing:
				existing.amount = rent_amount
			else:
				existing = self.append("table_xqmr", {"label": PARENT_RENT_LABEL, "amount": rent_amount})
			self._move_particular_row_to_top(existing)
		elif existing:
			self.table_xqmr.remove(existing)

	def _move_particular_row_to_top(self, row):
		rows = self.table_xqmr
		if not rows or rows[0] == row:
			return
		rows.remove(row)
		rows.insert(0, row)
		for i, r in enumerate(rows, start=1):
			r.idx = i

	def sync_parent_vat_row(self):
		rows = self.get("table_xqmr") or []
		existing = next((row for row in rows if row.label == PARENT_VAT_LABEL), None)

		if self.include_vat:
			vat_amount = flt(flt(self.proposed_rent) * VAT_RATE, 2)
			if existing:
				existing.amount = vat_amount
			else:
				self.append("table_xqmr", {"label": PARENT_VAT_LABEL, "amount": vat_amount})
		elif existing:
			self.table_xqmr.remove(existing)

	def calculate_particular_total(self):
		self.particular_total = flt(sum(flt(row.amount) for row in self.get("table_xqmr", [])), 2)

	def calculate_cheque_total(self):
		self.cheque_total = flt(sum(flt(row.cheque_amount) for row in self.get("cheque_details", [])), 2)

	def validate_dates(self):
		is_draft = self.is_new() or (self.workflow_state or "Draft") == "Draft"
		if is_draft and self.renewal_from and getdate(self.renewal_from) < getdate(today()):
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

		existing_renewal = frappe.db.exists(
			"JH Property Rental Renewal",
			{
				"property": self.property,
				"workflow_state": ["in", ACTIVE_RENEWAL_STATES],
				"name": ["!=", self.name],
			},
		)

		if existing_renewal:
			frappe.throw(
				_(
					"An active rental renewal already exists for property {0}: {1}"
				).format(self.property, existing_renewal)
			)


