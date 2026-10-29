# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt


class PMSSettings(Document):
	def validate(self):
		self.validate_bell_curve_ratings()

	def validate_bell_curve_ratings(self):
		# Empty table is allowed; the bell curve then shows only actual HR ratings
		if not self.bell_curve_ratings:
			return

		seen = set()
		total = 0
		for row in self.bell_curve_ratings:
			rating = cint(row.rating)
			if rating < 1 or rating > 5:
				frappe.throw(_("Bell Curve row {0}: Rating must be between 1 and 5").format(row.idx))
			if rating in seen:
				frappe.throw(_("Bell Curve row {0}: Rating {1} is duplicated").format(row.idx, rating))
			if flt(row.expected_percentage) < 0:
				frappe.throw(_("Bell Curve row {0}: Expected Percentage cannot be negative").format(row.idx))
			seen.add(rating)
			total += flt(row.expected_percentage)

		if flt(total, 2) != 100:
			frappe.throw(
				_("Bell Curve expected percentages must total 100 (currently {0})").format(flt(total, 2))
			)
