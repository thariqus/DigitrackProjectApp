// Copyright (c) 2025, Bytsolv and contributors
// For license information, please see license.txt

const REQUEST_STATUS = [
  {
    label: "Approval Pending",
    color: "yellow",
  },
  {
    label: "Approved",
    color: "blue",
  },
  {
    label: "Denied",
    color: "red",
  },
  {
    label: "Completed",
    color: "green",
  },
  {
    label: "Urgent",
    color: "orange",
  },
];

frappe.ui.form.on("JH Travel Request", {
  refresh(frm) {
    const request_status = REQUEST_STATUS.find(
      (status) => status.label === frm.doc.request_status
    );
    frm.page.set_indicator(__(request_status.label), request_status.color);

    if (!frm.is_new()) {
      frappe
        .call({
          method: "jh_digitrack.api.travel.whoami",
          args: {
            req_id: frm.doc.name,
          },
        })
        .then((r) => {
          const role = r?.message.role;
          console.log(role);
          // roles: cc_holder, travel_request_owner, reporting_manager
          if (
            role === "cc_holder" &&
            ["Approved", "Urgent"].includes(frm.doc.request_status)
          ) {
            // If request is approved by Reporting Manager and role is cc_holder, add a button to complete the request
            frm.add_custom_button(__("Complete"), function () {
              frm.set_value("request_status", "Completed");
              frm.save();
            });
          }
          if (
            role === "reporting_manager" &&
            frm.doc.request_status === "Approval Pending"
          ) {
            // If request is approved by Reporting Manager and role is cc_holder, add a button to complete the request
            frm.add_custom_button(__("Approve"), function () {
              frm.set_value("request_status", "Approved");
              frm.save();
            });
            frm.add_custom_button(__("Deny"), function () {
              frm.set_value("request_status", "Denied");
              frm.save();
            });
          }
          if (
            role === "travel_request_owner" &&
            frm.doc.request_status === "Denied"
          ) {
            // If request is approved by Reporting Manager and role is cc_holder, add a button to complete the request
            frm.add_custom_button(__("Re Request"), function () {
              frm.set_value("request_status", "Approval Pending");
              frm.save();
            });
          }
        });
    }
  },
});
