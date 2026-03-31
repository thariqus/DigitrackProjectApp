// Copyright (c) 2026, Bytsolv and contributors
// For license information, please see license.txt

frappe.ui.form.on("JH Property Rental Renewal", {
	refresh(frm) {
		calculate_percent(frm);
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
});

function calculate_percent(frm) {
	const current_rent = flt(frm.doc.current_rent);
	const proposed_rent = flt(frm.doc.proposed_rent);

	if (!current_rent) {
		frm.set_value("rent_change_percent", 0);
		frm.set_value("data_gisi", 0);
		return;
	}

	const rent_change_percent = ((proposed_rent - current_rent) / current_rent) * 100;
	frm.set_value("rent_change_percent", rent_change_percent);
	frm.set_value("data_gisi", rent_change_percent);
}
