import frappe
from frappe.query_builder import DocType
from frappe.utils import date_diff, today

PASSWORD_RESET_INTERVAL_DAYS = 90


def flag_users_for_password_reset():
	"""Daily scheduled job: once a user's password is older than
	PASSWORD_RESET_INTERVAL_DAYS, set "Force Password Reset" on their
	JH User Master record so it shows up immediately in reports/list
	views, instead of only being enforced reactively the next time they
	attempt to log in. The actual login-time block is handled by
	jh_digitrack.setup.login_override.

	A user with no JH User Master record (e.g. Administrator) has nowhere
	to store the flag and is skipped.
	"""
	User = DocType("User")
	JHUserMaster = DocType("JH User Master")

	rows = (
		frappe.qb.from_(User)
		.join(JHUserMaster)
		.on(JHUserMaster.user == User.name)
		.select(JHUserMaster.name, User.last_password_reset_date)
		.where(User.enabled == 1)
		.where(User.name.notin(frappe.STANDARD_USERS))
		.where(JHUserMaster.force_password_reset == 0)
		.where(User.last_password_reset_date.isnotnull())
	).run(as_dict=True)

	for row in rows:
		if date_diff(today(), row.last_password_reset_date) > PASSWORD_RESET_INTERVAL_DAYS:
			frappe.db.set_value("JH User Master", row.name, "force_password_reset", 1)

	frappe.db.commit()
