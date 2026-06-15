# Copyright (c) 2026, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


def sanitize_multivalue_field(value):
	if not value:
		return value
	lines = [line.strip() for line in value.split("\n")]
	seen = set()
	result = []
	for line in lines:
		if line and line.lower() not in seen:
			seen.add(line.lower())
			result.append(line)
	return "\n".join(result)


class JHPropertyMaster(Document):

	def validate(self):
		self.premise_number = sanitize_multivalue_field(self.premise_number)
		for field in [
			'property_name', 'booked_under', 'profit_center', 'staff_allocated',
			'location', 'emirate', 'country', 'makani_number', 'po_box_number',
			'landlord', 'real_estate', 'tenancy_period', 'internet_connection',
		]:
			if self.get(field):
				self.set(field, frappe.utils.sanitize_html(self.get(field), always_sanitize=True))
