// Copyright (c) 2025, Bytsolv and contributors
// For license information, please see license.txt

frappe.ui.form.on("JH TS Projects", {
	refresh(frm) {
        jh_attach_sanitizer(frm, [
			'description',
			'action',
			'learning',
			'project_folder',
			"rfp_document_folder",
			"bc_document_folder",
			"contract__document_folder",
			"nda_document_folder",
			"project_plan_document_folder",
			'technical_spoc',
			'nda_signed',
			'allocated_by',
			'allocated_to',
		]);
	},
});
