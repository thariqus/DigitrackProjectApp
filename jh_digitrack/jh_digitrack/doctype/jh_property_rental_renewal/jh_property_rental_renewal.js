// Copyright (c) 2026, Bytsolv and contributors
// For license information, please see license.txt

frappe.ui.form.on("JH Property Rental Renewal", {
	async refresh(frm) {
		calculate_percent(frm);
		await add_workflow_action_buttons(frm);
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
	},
	validate(frm) {
		let today = frappe.datetime.get_today();

		// Check Renewal From >= Today
		if (frm.doc.renewal_from && frm.doc.renewal_from < today) {
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
		return;
	}

	const rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100;
	frm.set_value("rent_change_percent", rent_change_percent);
	frm.set_value("data_gisi", rent_change_percent);
}

