# Copyright (c) 2026, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, today


class JHDelegation(Document):

	def validate(self):
		self._validate_not_self_delegation()
		self._validate_users_active()
		self._validate_type_rules()
		self._validate_no_duplicate()
		self._validate_single_standing_delegation()

	def after_insert(self):
		from jh_digitrack.api.helpers.delegation import notify_delegation_created
		notify_delegation_created(self)

	def on_update(self):
		if not self.has_value_changed("status") or self.status == "Active":
			return
		from jh_digitrack.api.helpers.delegation import notify_delegation_revoked, notify_adhoc_expired
		if self.delegation_type == "Permanent":
			notify_delegation_revoked(self)
		elif self.delegation_type == "Ad-Hoc":
			notify_adhoc_expired(self)

	def _validate_not_self_delegation(self):
		if self.delegator == self.delegate:
			frappe.throw(_("A user cannot delegate to themselves."))

	def _validate_users_active(self):
		for field, label in [("delegator", "Delegator"), ("delegate", "Delegate")]:
			user = self.get(field)
			if user:
				enabled = frappe.db.get_value("User", user, "enabled")
				if not enabled:
					frappe.throw(_("{0} {1} is not an active user.").format(label, user))

	def _validate_type_rules(self):
		if self.delegation_type == "Temporary":
			if not self.from_date or not self.to_date:
				frappe.throw(_("From Date and To Date are required for Temporary delegation."))
			if getdate(self.from_date) > getdate(self.to_date):
				frappe.throw(_("From Date must be on or before To Date."))
			if getdate(self.to_date) < getdate(today()):
				frappe.throw(_("To Date must be today or a future date."))

		elif self.delegation_type == "Permanent":
			if self.from_date or self.to_date:
				frappe.throw(_("From Date and To Date must be empty for Permanent delegation."))

		elif self.delegation_type == "Ad-Hoc":
			if not self.reference_doctype or not self.reference_name:
				frappe.throw(_("Reference DocType and Reference Name are required for Ad-Hoc delegation."))
			if not self.comment:
				frappe.throw(_("Comment is mandatory for Ad-Hoc delegation."))

	def _validate_single_standing_delegation(self):
		if self.delegation_type not in ("Temporary", "Permanent"):
			return

		existing = frappe.db.exists("JH Delegation", {
			"delegator": self.delegator,
			"delegation_type": ["in", ["Temporary", "Permanent"]],
			"status": "Active",
			"name": ["!=", self.name],
		})

		if existing:
			frappe.throw(
				_("You already have an active Temporary or Permanent delegation. "
				  "Please revoke it before creating a new one.")
			)

	def _validate_no_duplicate(self):
		filters = {
			"delegator": self.delegator,
			"delegate": self.delegate,
			"delegation_type": self.delegation_type,
			"status": "Active",
			"name": ["!=", self.name],
		}

		if self.delegation_type == "Ad-Hoc":
			filters["reference_doctype"] = self.reference_doctype
			filters["reference_name"] = self.reference_name

		if frappe.db.exists("JH Delegation", filters):
			frappe.throw(
				_("An active {0} delegation already exists for this delegator, delegate, and document combination.").format(
					self.delegation_type
				)
			)
