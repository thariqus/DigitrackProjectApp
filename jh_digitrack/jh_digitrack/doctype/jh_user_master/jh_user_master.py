# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class JHUserMaster(Document):
	pass


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
		}
	)
	user.insert()
		

	
	jh_user.user = user.name
	jh_user.save()
	return user.name