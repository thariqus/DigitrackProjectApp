# Copyright (c) 2026, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt

WORKFLOW_TRANSITIONS = {
	"approve": {
		"Pending Approver 1": "Pending Approver 2",
		"Pending Approver 2": "Pending CFO",
		"Pending CFO": "Pending MD",  # default; overridden dynamically: ≤5% → Pending Cheque Details
		"Pending MD": "Pending Cheque Details",
		"Pending Cheque Details": "Pending Property PO",
		"Pending Property PO": "Pending MIRO",
		"Pending MIRO": "Completed",
	},
	"withdraw": {
		"Pending Approver 1": "Rejected",
		"Pending Approver 2": "Rejected",
		"Pending CFO": "Rejected",
		"Pending MD": "Rejected",
		"Pending Cheque Details": "Rejected",
		"Pending Property PO": "Rejected",
		"Pending MIRO": "Rejected",
	},
}

SENDBACK_TRANSITIONS = {
	"Pending Approver 1": {"Draft"},
	"Pending Approver 2": {"Pending Approver 1", "Draft"},
	"Pending CFO": {"Pending Approver 2", "Pending Approver 1", "Draft"},
	"Pending MD": {"Pending CFO", "Pending Approver 2", "Pending Approver 1", "Draft"},
	"Pending Cheque Details": {"Pending MD", "Pending CFO", "Pending Approver 2", "Pending Approver 1", "Draft"},
	"Pending Property PO": {"Pending Cheque Details", "Pending MD", "Pending CFO", "Pending Approver 2", "Pending Approver 1", "Draft"},
	"Pending MIRO": {"Pending Property PO", "Pending Cheque Details", "Pending MD", "Pending CFO", "Pending Approver 2", "Pending Approver 1", "Draft"},
}

STATE_ROLE_MAP = {
	"Pending Approver 1": {"approver_1", "module_admin", "Administrator"},
	"Pending Approver 2": {"approver_2", "module_admin", "Administrator"},
	"Pending Cheque Details": {"property_dept", "module_admin", "Administrator"},
	"Pending CFO": {"cfo", "module_admin", "Administrator"},
	"Pending MD": {"md", "module_admin", "Administrator"},
	"Pending Property PO": {"property_dept", "module_admin", "Administrator"},
	"Pending MIRO": {"gl_team", "module_admin", "Administrator"},
}


class JHPropertyRentalRenewal(Document):

	def validate(self):
		self.validate_active_property_renewal()

	def before_save(self):
		self.calculate_rent_change_percent()

	def before_submit(self):
		if (self.workflow_state or "Draft") == "Draft":
			self.workflow_state = "Pending Approver 1"

	def calculate_rent_change_percent(self):
		current_rent = flt(self.current_rent)
		proposed_rent = flt(self.proposed_rent)

		if not current_rent or self.proposed_rent in (None, ""):
			self.rent_change_percent = 0
			return

		self.rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100

	def validate_active_property_renewal(self):
		if not self.property:
			return

		active_states = [
			"Draft",
			"Pending Approver 1",
			"Pending Approver 2",
			"Pending CFO",
			"Pending MD",
			"Pending Cheque Details",
			"Pending Property PO",
			"Pending MIRO",
		]

		existing_renewal = frappe.db.exists(
			"JH Property Rental Renewal",
			{
				"property": self.property,
				"workflow_state": ["in", active_states],
				"name": ["!=", self.name],
			},
		)

		if existing_renewal:
			frappe.throw(
				_(
					"An active rental renewal already exists for property {0}: {1}"
				).format(self.property, existing_renewal)
			)


def get_org_role_users():
	settings = frappe.get_single("JH Digitrack Settings")

	return {
		"cfo_user": settings.cfo_user,
		"md_user": settings.md_user,
	}


def get_user_workflow_roles(renewal):
	user = frappe.session.user

	if user == "Administrator":
		return {"Administrator"}

	user_roles = set(frappe.get_roles(user))
	matches = set()
	org_role_users = get_org_role_users()

	if "JH Digitrack Admin" in user_roles:
		matches.add("module_admin")
	if "JH Property Department" in user_roles:
		matches.add("property_dept")
	if "JH GL Team" in user_roles:
		matches.add("gl_team")
	if user == org_role_users.get("cfo_user"):
		matches.add("cfo")
	if user == org_role_users.get("md_user"):
		matches.add("md")

	if renewal.property:
		property_doc = frappe.get_cached_doc("JH Property Master", renewal.property)
		if user == property_doc.approver_1:
			matches.add("approver_1")
		if user == property_doc.approver_2:
			matches.add("approver_2")

	return matches


def get_permitted_actions(renewal):
	current_state = renewal.workflow_state or "Draft"
	user_workflow_roles = get_user_workflow_roles(renewal)
	allowed_roles = STATE_ROLE_MAP.get(current_state, set())

	if not user_workflow_roles.intersection(allowed_roles):
		return []

	actions = []
	if current_state in WORKFLOW_TRANSITIONS.get("approve", {}):
		actions.append("approve")
	if current_state in SENDBACK_TRANSITIONS:
		actions.append("sendback")
	if current_state in WORKFLOW_TRANSITIONS.get("withdraw", {}):
		actions.append("withdraw")
	return actions


@frappe.whitelist()
def get_allowed_actions(renewal_id: str):
	if not renewal_id:
		frappe.throw(_("renewal_id is required"))

	renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
	allowed_actions = get_permitted_actions(renewal)

	return {
		"actions": allowed_actions,
		"sendback_options": list(SENDBACK_TRANSITIONS.get(renewal.workflow_state or "Draft", [])),
	}


@frappe.whitelist(methods=["POST"])
def apply_workflow_action(renewal_id: str, action: str, target_state: str = None):
	if not renewal_id:
		frappe.throw(_("renewal_id is required"))

	action = (action or "").strip().lower()
	renewal = frappe.get_doc("JH Property Rental Renewal", renewal_id)
	current_state = renewal.workflow_state or "Draft"
	allowed_actions = get_permitted_actions(renewal)

	if action not in allowed_actions:
		frappe.throw(
			_("You are not allowed to perform {0} in state {1}.").format(action, current_state)
		)

	if action == "sendback":
		allowed_states = SENDBACK_TRANSITIONS.get(current_state)
		if not allowed_states:
			frappe.throw(_("Sendback is not allowed from {0}.").format(current_state))
		if not target_state:
			frappe.throw(_("Please select a workflow state for sendback."))
		if target_state not in allowed_states:
			frappe.throw(_("Invalid sendback state: {0}").format(target_state))
		next_state = target_state
	else:
		next_state = WORKFLOW_TRANSITIONS.get(action, {}).get(current_state)
		if not next_state:
			frappe.throw(_("Action {0} is not allowed from {1}.").format(action, current_state))

	if action == "approve" and current_state == "Pending CFO":
		next_state = "Pending MD" if flt(renewal.rent_change_percent) > 5 else "Pending Cheque Details"

	renewal.db_set("workflow_state", next_state, update_modified=True)

	if next_state == "Completed" and renewal.property and renewal.renewal_to:
		frappe.db.set_value("JH Property Master", renewal.property, "renewal_date", renewal.renewal_to)

	return {
		"name": renewal.name,
		"previous_state": current_state,
		"workflow_state": next_state,
	}
