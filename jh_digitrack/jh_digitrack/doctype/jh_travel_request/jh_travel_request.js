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
  {
    label: "Reconfirmation Pending",
    color: "yellow",
  },
  {
    label: "Reconfirmed",
    color: "blue",
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
          if (role === "cc_holder") {
            // role is cc_holder
            if (
              ["Approved", "Urgent", "Reconfirmed"].includes(
                frm.doc.request_status
              )
            ) {
              // if request is approved or urgent,check if reconfirmation is required
              if (
                frm.doc.request_status !== "Reconfirmed" &&
                frm.doc.reconfirmation_required
              ) {
                // if reconfirmation is required, add a button to reconfirm with initiator
                frm.add_custom_button(
                  __("Reconfirm with Initiator"),
                  function () {
                    frm.set_value("request_status", "Reconfirmation Pending");
                    frm.save();
                  }
                );
              } else {
                // if reconfirmation is not required, add a button to complete the request
                frm.add_custom_button(__("Complete"), function () {
                  frm.set_value("request_status", "Completed");
                  frm.save();
                });
              }
            }
          }
          if (
            role === "reporting_manager" &&
            frm.doc.request_status === "Approval Pending"
          ) {
            // role is reporting_manager
            // if request is approval pending, add a button to approve or deny the request
            frm.add_custom_button(__("Approve"), function () {
              frm.set_value("request_status", "Approved");
              frm.save();
            });
            frm.add_custom_button(__("Deny"), function () {
              frm.set_value("request_status", "Denied");
              frm.save();
            });
          }
          if (role === "travel_request_owner") {
            // role is travel_request_owner
            // if request is denied, add a button to re-request the request
            if (frm.doc.request_status === "Denied") {
              frm.add_custom_button(__("Re Request"), function () {
                frm.set_value("request_status", "Approval Pending");
                frm.save();
              });
            }
            // if request is reconfirmation pending, add a button to reconfirm the request
          }
        });
    }
  },
});
