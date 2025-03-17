// Copyright (c) 2025, Bytsolv and contributors
// For license information, please see license.txt

frappe.ui.form.on("JH User Master", {
  business(frm) {
    frm.set_value("division", null);
    frm.set_query("division", function () {
      return {
        filters: {
          business: frm.doc.business,
        },
      };
    });
  },

  refresh(frm) {
    if (!frm.doc.user) {
      frm.add_custom_button(__("Attach User"), () => {
        frappe.call({
          method:
            "jh_digitrack.jh_digitrack.doctype.jh_user_master.jh_user_master.create_user",
          args: {
            jh_user_id: frm.doc.name,
            email: frm.doc.email,
          },
          freeze: true,
          freeze_message: __("Creating User..."),
          callback: function (r) {
            frm.reload_doc();
          },
        });
      });
    }
  },
});
