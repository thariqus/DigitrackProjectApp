# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class JHUserMaster(Document):
    def after_insert(self):
        attach_user(self.name, self.email)

    # def before_save(self):
    #     first_name = self.get("first_name", "") or ""
    #     middle_name = self.get("middle_name", "") or ""
    #     last_name = self.get("last_name", "") or ""
    #     self.full_name = f"{first_name} {middle_name} {last_name}"

    def before_save(self):
        first_name = (self.first_name or "").strip()
        middle_name = (self.middle_name or "").strip()
        last_name = (self.last_name or "").strip()

        self.full_name = " ".join(part for part in [first_name, middle_name, last_name] if part)

@frappe.whitelist()
def attach_user(jh_user_id: str, email: str):
    jh_user = frappe.get_doc("JH User Master", jh_user_id)

    if not frappe.db.exists("User", jh_user.email):
        user = frappe.new_doc("User")
        user.update(
            {
                "email": jh_user.email,
                "enabled": 1,
                "first_name": jh_user.first_name,
                "middle_name": jh_user.middle_name,
                "last_name": jh_user.last_name,
                "roles": [
                    {"role": "JH Digitrack Member"},
                    {"role": "Inbox User"},
                    {"role": "JH Travel Workflow User"},
                ],
                "default_app": "jh_digitrack",
                "default_workspace": None,
            }
        )
        user.insert()
    else:
        print("User already exists")
        user = frappe.get_doc("User", jh_user.email)
        user.append("roles", {"role": "JH Digitrack Member"})
        user.append("roles", {"role": "Inbox User"})
        user.append("roles", {"role": "JH Travel Workflow User"})
        user.default_app = "jh_digitrack"

    jh_user.user = user.name
    jh_user.save()
    return user.name
