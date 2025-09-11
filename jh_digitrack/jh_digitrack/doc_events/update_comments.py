import frappe
from frappe.utils import now_datetime
def update_last_activity_on(doc, method):
    if doc.comment_type == "Comment" and doc.reference_doctype == "JH Task Master" and doc.reference_name:
        frappe.db.set_value(
            "JH Task Master",
            doc.reference_name,
            "last_commented_on",
            doc.creation or now_datetime()
        )
