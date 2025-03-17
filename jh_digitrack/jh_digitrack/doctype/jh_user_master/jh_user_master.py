# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class JHUserMaster(Document):
	def after_insert(self):
		create_user(self.name, self.email)
		
	def before_save(self):
		first_name = self.get("first_name", "") or ""
		middle_name = self.get("middle_name", "") or ""
		last_name = self.get("last_name", "") or ""
		self.full_name = f"{first_name} {middle_name} {last_name}"


@frappe.whitelist()
def create_user(jh_user_id: str, email: str):
	jh_user = frappe.get_doc("JH User Master", jh_user_id)

	user = frappe.new_doc("User")
	user.update(
		{
			"email": jh_user.email,
			"enabled": 1,
			"first_name": jh_user.first_name,
			"middle_name": jh_user.middle_name,
			"last_name": jh_user.last_name,
			"roles": [{"role": "JH Digitrack Member"}],
		}
	)
	user.insert()
		

	
	jh_user.user = user.name
	jh_user.save()
	return user.name