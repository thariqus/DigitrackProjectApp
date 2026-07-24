// Copyright (c) 2026, Bytsolv and contributors
// For license information, please see license.txt

const VAT_RATE = 0.05;
const PARENT_VAT_LABEL = "Rent VAT";
const PARENT_RENT_LABEL = "Rent";
const PARTICULARS_FIELD = "table_xqmr";
const CHEQUE_DETAILS_FIELD = "cheque_details";

frappe.ui.form.on("JH Property Rental Renewal", {
	async refresh(frm) {
		calculate_percent(frm);
		calculate_particular_total(frm);
		calculate_cheque_total(frm);
		await add_workflow_action_buttons(frm);
		jh_attach_sanitizer(frm, [
			'po_number', 'division', 'location', 'emirate',
			'landlord', 'property_type', 'tenancy_period', 'remarks'
		]);
	},
	property(frm) {
		// Wait until fetch_from fields (like current_rent) are populated.
		frappe.after_ajax(() => calculate_percent(frm));
	},
	current_rent(frm) {
		calculate_percent(frm);
	},
	proposed_rent(frm) {
		calculate_percent(frm);
		sync_parent_rent_row(frm);
		sync_parent_vat_row(frm);
	},
	include_vat(frm) {
		sync_parent_vat_row(frm);
	},
	table_xqmr_add(frm) {
		calculate_particular_total(frm);
	},
	table_xqmr_remove(frm) {
		calculate_particular_total(frm);
	},
	cheque_details_add(frm) {
		calculate_cheque_total(frm);
	},
	cheque_details_remove(frm) {
		calculate_cheque_total(frm);
	},
	validate(frm) {
		let today = frappe.datetime.get_today();
		let is_draft = frm.is_new() || (frm.doc.workflow_state || "Draft") === "Draft";

		// Check Renewal From >= Today
		if (is_draft && frm.doc.renewal_from && frm.doc.renewal_from < today) {
			frappe.throw("Renewal From date cannot be in the past.");
		}

		// Check Renewal To > Renewal From
		if (frm.doc.renewal_from && frm.doc.renewal_to) {
			if (frm.doc.renewal_to <= frm.doc.renewal_from) {
				frappe.throw("Renewal To date must be after Renewal From date.");
			}
		}
	},
});

async function add_workflow_action_buttons(frm) {
	if (frm.is_new() || !frm.doc.name || frm.doc.docstatus !== 1) {
		return;
	}

	const response = await frappe.call({
		method: "jh_digitrack.api.property_management.get_allowed_actions",
		type: "GET",
		args: {
			renewal_id: frm.doc.name,
		},
	});

	const allowed_actions = response.message?.actions || [];
	const sendback_options = response.message?.sendback_options || [];

	if (allowed_actions.includes("approve")) {
		frm.add_custom_button(__("Approve"), () => {
			run_workflow_action(frm, "approve");
		}, __("Approval"));
	}

	if (allowed_actions.includes("sendback") && sendback_options.length) {
		frm.add_custom_button(__("Send Back"), () => {
			show_sendback_options(frm, sendback_options);
		}, __("Approval"));
	}

	if (allowed_actions.includes("withdraw")) {
		frm.add_custom_button(__("Withdraw"), () => {
			run_workflow_action(frm, "withdraw");
		}, __("Approval"));
	}
}

function show_sendback_options(frm, options) {
	if (!options?.length) {
		frappe.msgprint(__("No sendback options available."));
		return;
	}

	frappe.prompt(
		[
			{
				fieldname: "target_state",
				label: "Send Back To",
				fieldtype: "Select",
				options: options.join("\n"),
				reqd: 1,
			},
		],
		function (values) {
			run_workflow_action(frm, "sendback", values.target_state);
		},
		__("Sendback"),
		__("Confirm")
	);
}

function run_workflow_action(frm, action, target_state = null) {
	frappe.call({
		method: "jh_digitrack.api.property_management.apply_workflow_action",
		args: {
			renewal_id: frm.doc.name,
			action: action,
			target_state: target_state,
		},
		callback: function () {
			frm.reload_doc();
		},
	});
}

function calculate_percent(frm) {
	const current_rent = flt(frm.doc.current_rent);
	const proposed_rent = flt(frm.doc.proposed_rent);

	if (!current_rent || !frm.doc.proposed_rent) {
		frm.set_value("rent_change_percent", 0);
		frm.set_value("data_gisi", 0);
		frm.set_value("rent_change", 0);
		return;
	}

	const rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100;
	frm.set_value("rent_change_percent", rent_change_percent);
	frm.set_value("data_gisi", rent_change_percent);
	frm.set_value("rent_change", Math.round(proposed_rent - current_rent));
}

// Keeps a single "Rent" row, always pinned as the first row, in the
// particulars table equal to the proposed rent.
function sync_parent_rent_row(frm) {
	const rows = frm.doc[PARTICULARS_FIELD] || [];
	let existing = rows.find((row) => row.label === PARENT_RENT_LABEL);

	if (frm.doc.proposed_rent) {
		const rent_amount = Math.round(flt(frm.doc.proposed_rent));
		if (existing) {
			frappe.model.set_value(existing.doctype, existing.name, "amount", rent_amount);
		} else {
			existing = frm.add_child(PARTICULARS_FIELD, { label: PARENT_RENT_LABEL, amount: rent_amount });
		}
		move_row_to_top(frm, existing);
	} else if (existing) {
		frm.get_field(PARTICULARS_FIELD).grid.grid_rows_by_docname[existing.name].remove();
	}

	frm.refresh_field(PARTICULARS_FIELD);
	calculate_particular_total(frm);
}

// Keeps a single "Rent VAT" row in the particulars table equal to 5% of the
// proposed rent, added/updated/removed as the "Include VAT" checkbox and
// proposed rent change.
function sync_parent_vat_row(frm) {
	const rows = frm.doc[PARTICULARS_FIELD] || [];
	const existing = rows.find((row) => row.label === PARENT_VAT_LABEL);

	if (frm.doc.include_vat) {
		const vat_amount = Math.round(flt(frm.doc.proposed_rent) * VAT_RATE);
		if (existing) {
			frappe.model.set_value(existing.doctype, existing.name, "amount", vat_amount);
		} else {
			frm.add_child(PARTICULARS_FIELD, { label: PARENT_VAT_LABEL, amount: vat_amount });
		}
	} else if (existing) {
		frm.get_field(PARTICULARS_FIELD).grid.grid_rows_by_docname[existing.name].remove();
	}

	frm.refresh_field(PARTICULARS_FIELD);
	calculate_particular_total(frm);
}

// Sums all particular row amounts into the "Particular Total" field.
function calculate_particular_total(frm) {
	const rows = frm.doc[PARTICULARS_FIELD] || [];
	const total = rows.reduce((sum, row) => sum + flt(row.amount), 0);
	frm.set_value("particular_total", total);
}

// Sums all cheque entry amounts into the "Cheque Total" field.
function calculate_cheque_total(frm) {
	const rows = frm.doc[CHEQUE_DETAILS_FIELD] || [];
	const total = rows.reduce((sum, row) => sum + flt(row.cheque_amount), 0);
	frm.set_value("cheque_total", total);
}

// When a particular row's own "Include VAT" checkbox is ticked, inserts a
// "<Label> VAT" row directly after it, equal to 5% of that row's amount.
frappe.ui.form.on("JH Property Particulars", {
	include_vat_(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const rows = frm.doc[PARTICULARS_FIELD] || [];
		const vat_label = row.label ? `${row.label} VAT` : "VAT";
		const row_idx = rows.indexOf(row);
		const next_row = rows[row_idx + 1];

		if (row.include_vat_) {
			const vat_amount = Math.round(flt(row.amount) * VAT_RATE);
			if (next_row && next_row.label === vat_label) {
				frappe.model.set_value(next_row.doctype, next_row.name, "amount", vat_amount);
			} else {
				const vat_row = frm.add_child(PARTICULARS_FIELD, { label: vat_label, amount: vat_amount });
				move_row_after(frm, vat_row, row);
			}
		} else if (next_row && next_row.label === vat_label) {
			frm.get_field(PARTICULARS_FIELD).grid.grid_rows_by_docname[next_row.name].remove();
		}

		frm.refresh_field(PARTICULARS_FIELD);
		calculate_particular_total(frm);
	},
	amount(frm) {
		calculate_particular_total(frm);
	},
});

frappe.ui.form.on("JH Property Cheque Detail", {
	cheque_amount(frm) {
		calculate_cheque_total(frm);
	},
});

function move_row_after(frm, row, after_row) {
	const rows = frm.doc[PARTICULARS_FIELD];
	const from_idx = rows.indexOf(row);
	if (from_idx === -1) return;

	rows.splice(from_idx, 1);
	const after_idx = rows.indexOf(after_row);
	rows.splice(after_idx + 1, 0, row);
	rows.forEach((r, i) => {
		r.idx = i + 1;
	});
}

function move_row_to_top(frm, row) {
	const rows = frm.doc[PARTICULARS_FIELD];
	const from_idx = rows.indexOf(row);
	if (from_idx <= 0) return;

	rows.splice(from_idx, 1);
	rows.unshift(row);
	rows.forEach((r, i) => {
		r.idx = i + 1;
	});
}
