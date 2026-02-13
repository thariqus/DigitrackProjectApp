// Copyright (c) 2025, Bytsolv and contributors
// For license information, please see license.txt

frappe.ui.form.on("JH Audit Master", {
	refresh(frm) {
        jh_attach_sanitizer(frm, [
            'audit_description', 
            "additional_comments", 
            "remarks",
            "file_name",
            "folder_name",
            
        ]);
	},
});
