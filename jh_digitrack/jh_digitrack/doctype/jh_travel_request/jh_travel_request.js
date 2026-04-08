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
  {
    label: "Assigned for PO / IEM",
    color: "blue",
  },
  {
    label: "Assigned for GRN / Miro",
    color: "blue",
  },
];

const required_fields = [
  "company_code",
  "plant",
  "assignment",
  "cost_center",
  "qty",
  "gl",
];

frappe.ui.form.on("JH Travel Request", {
  refresh(frm) {
    if (!frappe._jh_travel_email_patch) {
      const original_make = frappe.views.CommunicationComposer.prototype.make;

      frappe.views.CommunicationComposer.prototype.make = function () {
        original_make.call(this);

        if (this.frm && this.frm.doctype === "JH Travel Request") {
          const wrapper = this.dialog && this.dialog.wrapper;
          if (!wrapper) return;

          const check_all_attachments = () => {
            $(wrapper).find("[data-file-name]").prop("checked", true);
          };

          check_all_attachments();

          if (window.MutationObserver) {
            const observer = new MutationObserver(() => check_all_attachments());
            observer.observe(wrapper, { childList: true, subtree: true });
            if (!this._jh_travel_email_observer) {
              this._jh_travel_email_observer = observer;
            }
          }
        }
      };

      frappe._jh_travel_email_patch = true;
    }

    // HTML Injection Protection - sanitize text input fields
    jh_attach_sanitizer(frm, ['passenger_information', "description"]);

    const request_status = REQUEST_STATUS.find(
      (status) => status.label === frm.doc.request_status
    );
    frm.page.set_indicator(__(request_status.label), request_status.color);

    frappe
      .call({
        method: "jh_digitrack.api.travel.whoami",
        args: {
          req_id: frm.doc.name,
          is_new: frm.is_new(),
        },
        type: "GET",
      })
      .then((r) => {
        const role = r?.message.role;
        console.log(role);

        if (frm.is_new()) {
          frm.set_value("request_status", "Approval Pending");
          if (role !== "cc_holder") {
            for (const field of required_fields) {
              frm.toggle_reqd(field, true);
            }
          }
        }

        if (!frm.is_new()) {
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
                frm.add_custom_button(__("Complete & Assign"), function () {
                  frappe.prompt(
                    [
                      {
                        label: "Assign To",
                        fieldname: "po_assigned_to",
                        fieldtype: "Link",
                        options: "JH User Master",
                        reqd: 1,
                      },
                      {
                        label: "Final Amount",
                        fieldname: "final_amount",
                        fieldtype: "Data",
                        reqd: 1,
                      },
                    ],
                    (values) => {
                      frm.set_value("po_assigned_to", values.po_assigned_to);
                      frm.set_value("final_amount", values.final_amount);
                      frm.set_value("request_status", "Assigned for PO / IEM");
                      frm.save();
                    }
                  );
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
            if (frm.doc.request_status === "Reconfirmation Pending") {
              frm.add_custom_button(__("Reconfirm"), function () {
                frm.set_value("request_status", "Reconfirmed");
                frm.save();
              });
            }
          }
          if (role === "po_assignee") {
            // role is assignee
            // if request is assigned for PO / IEM, add a button to complete the request
            if (frm.doc.request_status === "Assigned for PO / IEM") {
              frm.add_custom_button(__("PO / IEM Completed"), function () {
                frappe.prompt(
                  [
                    {
                      label: "Assign To",
                      fieldname: "assigned_to",
                      fieldtype: "Link",
                      options: "JH User Master",
                      reqd: 1,
                    },
                    {
                      label: "PO / IEM",
                      fieldname: "po_iem",
                      fieldtype: "Data",
                      reqd: 1,
                    },
                  ],
                  (values) => {
                    console.log(values.grn_assigned_to, values.po_iem);
                    frm.set_value("request_status", "Assigned for GRN / Miro");
                    frm.set_value("assigned_to", values.assigned_to);
                    frm.set_value("po_iem", values.po_iem);
                    frm.save();
                  }
                );
              });
            }
          }
          if (role === "assignee") {
            if (frm.doc.request_status === "Assigned for GRN / Miro") {
              frm.add_custom_button(__("Complete"), function () {
                frappe.prompt(
                  [
                    {
                      label: "GRN / Miro",
                      fieldname: "grn_miro",
                      fieldtype: "Data",
                    },
                  ],
                  (values) => {
                    console.log(values.grn_miro);
                    frm.set_value("request_status", "Completed");
                    frm.set_value("grn_miro", values.grn_miro);
                    frm.save();
                  }
                );
              });
            }
          }
        }
      });
  },
});
