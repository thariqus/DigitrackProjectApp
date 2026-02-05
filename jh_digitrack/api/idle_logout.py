import frappe
from frappe import _

@frappe.whitelist(allow_guest=True, methods=["POST"])
def idle_logout():
    frappe.throw(_("Session expired due to inactivity"), frappe.AuthenticationError)
