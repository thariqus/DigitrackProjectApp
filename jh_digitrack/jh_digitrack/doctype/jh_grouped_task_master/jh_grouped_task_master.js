// Copyright (c) 2025, Bytsolv and contributors
// For license information, please see license.txt

const autoname = (frm) => {
  frm.set_value("naming_series", "MEETING-");
  if (frm.doc.type == "group_task") {
    frm.set_value("naming_series", "GRPTSK-");
  }
};
frappe.ui.form.on("JH Grouped Task Master", {
  type(frm) {
    autoname(frm);
  },
  refresh(frm) {
    autoname(frm);
  },
});
