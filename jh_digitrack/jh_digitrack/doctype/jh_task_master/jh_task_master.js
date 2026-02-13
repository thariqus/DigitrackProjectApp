// Copyright (c) 2025, Bytsolv and contributors
// For license information, please see license.txt

frappe.ui.form.on("JH Task Master", {
	refresh(frm) {
        jh_attach_sanitizer(frm, ['description', "assignee_comments"]);
	},
});
