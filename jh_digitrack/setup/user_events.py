import frappe
from frappe.core.doctype.user.user import update_password as _core_update_password


def before_save(doc, method=None):
    jh_digitrack_settings = frappe.get_doc("JH Digitrack Settings")
    doc.send_welcome_email = jh_digitrack_settings.send_welcome_emails


@frappe.whitelist(allow_guest=True, methods=["POST"])
def update_password(new_password, logout_all_sessions=0, key=None, old_password=None):
    """Wraps core update_password to clear "Force Password Reset" once the
    user has actually set a new password, so they aren't asked again on
    their next login."""
    result = _core_update_password(
        new_password,
        logout_all_sessions=logout_all_sessions,
        key=key,
        old_password=old_password,
    )

    if frappe.session.user and frappe.session.user != "Guest":
        frappe.db.set_value(
            "JH User Master", {"user": frappe.session.user}, "force_password_reset", 0
        )

    return result
