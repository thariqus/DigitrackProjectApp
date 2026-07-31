"""
Outbound email gateway for external systems to trigger emails through DigiTrack.

Callers authenticate with a Frappe API key/secret belonging to a dedicated
integration user that holds the "JH Email Integration" role. The sender
address is never caller-controlled — DigiTrack's configured default outgoing
Email Account is always used; only recipient(s), subject and body are
accepted from the caller.
"""

import hmac

import frappe
from frappe import _
from frappe.utils import sanitize_html, validate_email_address
from frappe.utils.password import get_decrypted_password

MAX_RECIPIENTS = 20
MAX_SUBJECT_LENGTH = 200



# TEMPORARY — allow_guest is enabled and the role check below is disabled ONLY
# for local Postman testing. This must be reverted (allow_guest=False and the
# role check restored) before this touches any shared/deployed environment —
# as-is, anyone who can reach this URL can send email through it, no auth.
@frappe.whitelist(allow_guest=True, methods=["POST"])
def send_email(to, subject, body, password, sender):
    """
    Send an email on behalf of an authorized external integration.

    Params:
    - to (str): recipient address, or multiple addresses separated by commas
    - subject (str): email subject line
    - body (str): email body (HTML allowed; sanitized before sending)
    - password (str): shared password, must match JH Digitrack Settings > Password
    - sender (str): email id of the person/system triggering this send, recorded in JH Emails
    """
    # if "JH Email Integration" not in frappe.get_roles(frappe.session.user):
    #     frappe.throw(_("Not permitted to use the email gateway."), frappe.PermissionError)

    stored_password = get_decrypted_password(
        "JH Digitrack Settings", "JH Digitrack Settings", fieldname="password", raise_exception=False
    )
    if not stored_password or not hmac.compare_digest(password or "", stored_password):
        return {"status": "Failure", "message": "Password is not correct."}

    if not to or not subject or not body or not sender:
        return {"status": "Failure", "message": "to, subject, body and sender are all required."}

    recipients = [address.strip() for address in to.split(",") if address.strip()]
    if not recipients:
        return{"status": "Failure", "message": "At least one recipient is required."}
    if len(recipients) > MAX_RECIPIENTS:
        frappe.throw(_("Cannot send to more than {0} recipients in a single request.").format(MAX_RECIPIENTS))
    for address in recipients:
        validate_email_address(address, throw=True)
    validate_email_address(sender, throw=True)

    subject = subject.strip()[:MAX_SUBJECT_LENGTH]
    body = sanitize_html(body)

    email_doc = frappe.new_doc("JH Emails")
    email_doc.source_document = "Email Gateway"
    email_doc.date = frappe.utils.now()
    row = email_doc.append("emails", {
        "to": to,
        "subject": subject,
        "body": body,
        "sender": sender,
        "status": "0",
    })
    email_doc.insert(ignore_permissions=True)
    frappe.db.commit()

    try:
        frappe.sendmail(
            recipients=recipients,
            subject=subject,
            message=body,
            now=True,
        )
    except Exception:
        frappe.log_error(message=frappe.get_traceback(), title="Error sending email in email_gateway")
        return {"status": "Failure", "message": "Email could not be sent.", "recipients": recipients}

    row.status = "1"
    email_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "success", "message": "Email sent.", "recipients": recipients}
