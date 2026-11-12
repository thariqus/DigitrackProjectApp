"""Recalculate VAT rows of in-progress property renewals with 2 decimals.

JH Property Particulars.amount used to be an Int field, so VAT rows were
truncated on save (518.40 -> 518, 129.60 -> 129) and particular_total came
out short of what the screen showed. The fields are now Currency; this patch
fixes the stored values of renewals that have not reached the cheque step yet.
Renewals past that step already have cheques issued and are left as they are.
"""

import frappe
from frappe.utils import flt

VAT_RATE = 0.05
PARENT_VAT_LABEL = "Rent VAT"

OPEN_STATES = [
	"Draft",
	"Pending Approver 1",
	"Pending Approver 2",
	"Pending Approver 3",
	"Pending Approver 4",
	"Pending Approver 5",
	"Pending Approver 6",
	"Pending Cheque Details",
]


def execute():
	renewals = frappe.get_all(
		"JH Property Rental Renewal",
		filters={"workflow_state": ["in", OPEN_STATES]},
		fields=["name", "proposed_rent", "particular_total"],
	)

	for renewal in renewals:
		rows = frappe.get_all(
			"JH Property Particulars",
			filters={
				"parent": renewal.name,
				"parenttype": "JH Property Rental Renewal",
				"parentfield": "table_xqmr",
			},
			fields=["name", "label", "amount"],
		)
		amount_by_label = {(row.label or "").strip().lower(): flt(row.amount) for row in rows}

		total = 0
		for row in rows:
			amount = flt(row.amount, 2)
			label = (row.label or "").strip()

			if label == PARENT_VAT_LABEL:
				amount = flt(flt(renewal.proposed_rent) * VAT_RATE, 2)
			elif label.lower().endswith(" vat"):
				base = label[:-4].strip().lower()
				if base in amount_by_label:
					amount = flt(amount_by_label[base] * VAT_RATE, 2)

			if amount != flt(row.amount, 2):
				frappe.db.set_value("JH Property Particulars", row.name, "amount", amount, update_modified=False)
			total += amount

		total = flt(total, 2)
		if total != flt(renewal.particular_total, 2):
			frappe.db.set_value(
				"JH Property Rental Renewal", renewal.name, "particular_total", total, update_modified=False
			)
