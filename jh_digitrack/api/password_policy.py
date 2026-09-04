import frappe
from frappe.utils import date_diff, today

PASSWORD_RESET_INTERVAL_DAYS = 90


def flag_users_for_password_reset():
	"""Daily scheduled job: once a user's password is older than
	PASSWORD_RESET_INTERVAL_DAYS, set "Force Password Reset" on them so it
	shows up immediately in reports/list views, instead of only being
	enforced reactively the next time they attempt to log in. The actual
	login-time block is handled by jh_digitrack.setup.login_override.
	"""
	users = frappe.get_all(
		"User",
		filters={
			"enabled": 1,
			"name": ["not in", frappe.STANDARD_USERS],
			"custom_force_password_reset": 0,
			"last_password_reset_date": ["is", "set"],
		},
		fields=["name", "last_password_reset_date"],
	)

	for user in users:
		if date_diff(today(), user.last_password_reset_date) > PASSWORD_RESET_INTERVAL_DAYS:
			frappe.db.set_value("User", user.name, "custom_force_password_reset", 1)

	frappe.db.commit()
