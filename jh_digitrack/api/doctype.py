import frappe
from frappe.utils.caching import redis_cache


@frappe.whitelist()
@redis_cache
def meta(doctype: str):
	doctype_doc = frappe.get_doc("DocType", doctype, ignore_permissions=True)
	custom_fields = frappe.get_all("Custom Field", filters={"dt": doctype}, ignore_permissions=True)
	for custom_field in custom_fields:
		field = frappe.get_doc("Custom Field", custom_field.name, ignore_permissions=True)
		doctype_doc.append("fields", field)
	return doctype_doc
