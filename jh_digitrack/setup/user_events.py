import frappe


def before_save(doc, method=None):
    jh_digitrack_settings = frappe.get_doc("JH Digitrack Settings")
    doc.send_welcome_email = jh_digitrack_settings.send_welcome_emails
