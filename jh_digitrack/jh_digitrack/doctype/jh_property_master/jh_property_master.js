// Copyright (c) 2026, Bytsolv and contributors
// For license information, please see license.txt

// frappe.ui.form.on("JH Property Master", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on('JH Property Master', {

    division_used: function(frm) {
        if (frm.doc.division_used) {
            frappe.db.get_doc('JH Division Master', frm.doc.division_used)
                .then(doc => {
                    // If Head exists
                    if (doc.division_head) {
                        frm.set_value('approver_1', doc.division_head);
                        frm.set_value('approver_2', doc.division_gm);
                    } 
                    // If Head NOT exists → fallback
                    else {
                        frm.set_value('approver_1', doc.division_gm);
                        frm.set_value('approver_2', null);
                    }

                });
        }
    }

});