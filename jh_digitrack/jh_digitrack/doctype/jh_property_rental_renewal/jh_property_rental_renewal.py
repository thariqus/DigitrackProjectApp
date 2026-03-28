# Copyright (c) 2026, Bytsolv and contributors
# For license information, please see license.txt

from frappe.model.document import Document
from frappe.utils import flt


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
 