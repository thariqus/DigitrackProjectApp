// Copyright (c) 2025, Bytsolv and contributors
// For license information, please see license.txt

frappe.ui.form.on('Scheduled Emails', {  
    send(frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);

        frappe.call({
            method: "jh_digitrack.api.tasks.send_emails",
            args: {
                send_single_row: true,
                parent_docname: frm.doc.name,
                email_row_name: row.name
            },
            callback: function(r) {
                if (!r.exc) {
                    frm.reload_doc(); 
                }
            }
        });
    }
});
