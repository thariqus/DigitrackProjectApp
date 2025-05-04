import frappe


def execute():
    frappe.db.set_value("Role", "JH Digitrack Member", "desk_access", 0)
