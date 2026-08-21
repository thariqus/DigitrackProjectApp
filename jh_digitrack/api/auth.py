import frappe
from frappe import _
from frappe.rate_limiter import rate_limit


def _get_employee_login_id(employee_id):
	employee_id = (employee_id or "").strip()
	if not employee_id:
		return None

	return frappe.db.get_value(
		"JH User Master",
		{"employee_code": employee_id, "active": 1},
		"user",
	)


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=10, seconds=60)
def employee_login(employee_id, password):
	"""Log in with a JH User Master employee code + password.

	Kept available even when System Settings has "Disable Username/Password
	Login" checked, since that setting also blocks Frappe's own cmd=login
	server-side. Some employees have no email/Office 365 account and can
	only authenticate this way, so this intentionally bypasses that one
	check while reusing Frappe's normal credential verification and
	session setup.
	"""
	login_id = _get_employee_login_id(employee_id)
	if not login_id or not password:
		frappe.throw(_("Invalid Employee ID or Password"), frappe.AuthenticationError)

	frappe.clear_cache(user=login_id)
	login_manager = frappe.local.login_manager
	login_manager.authenticate(user=login_id, pwd=password)

	if login_manager.force_user_to_reset_password():
		doc = frappe.get_doc("User", login_manager.user)
		frappe.local.response["redirect_to"] = doc.reset_password(
			send_email=False, password_expired=True
		)
		frappe.local.response["message"] = "Password Reset"
		return

	login_manager.post_login()
