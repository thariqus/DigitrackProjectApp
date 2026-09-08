import frappe
from frappe.auth import LoginManager

# Patched in on app load (see jh_digitrack/__init__.py) so that a User with
# "Force Password Reset" checked is sent through the same password-expired
# flow Frappe already uses for the System Settings "days since last reset"
# policy - both the standard email/password login and the custom Employee ID
# login (jh_digitrack.api.auth.employee_login) call this same method.
_original_force_user_to_reset_password = LoginManager.force_user_to_reset_password


def _force_user_to_reset_password(self):
	if self.user and self.user not in frappe.STANDARD_USERS:
		if frappe.db.get_value("User", self.user, "custom_force_password_reset"):
			return True

	return _original_force_user_to_reset_password(self)


def apply():
	LoginManager.force_user_to_reset_password = _force_user_to_reset_password
