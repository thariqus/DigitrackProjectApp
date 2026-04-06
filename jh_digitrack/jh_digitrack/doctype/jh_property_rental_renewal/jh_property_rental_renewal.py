# Copyright (c) 2026, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt


def get_org_role_users():
	settings = "JH Digitrack Settings"
	return {
		"cfo_user": frappe.db.get_single_value(settings, "cfo_user"),
		"md_user": frappe.db.get_single_value(settings, "md_user"),
		"admin_hod_user": frappe.db.get_single_value(settings, "admin_hod_user"),
	}


class JHPropertyRentalRenewal(Document):
	def calculate_rent_change_percent(self):
		current_rent = flt(self.current_rent)
		proposed_rent = flt(self.proposed_rent)

		if not current_rent:
			self.rent_change_percent = 0
			return

		self.rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100


def before_save_rental_renewal(doc, method=None):
	doc.calculate_rent_change_percent()
 
