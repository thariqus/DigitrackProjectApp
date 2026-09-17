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
frappe.listview_settings["JH Travel Request"] = {
  add_fields: ["request_status", "current_status"],
  get_indicator(doc) {
    const request_status = REQUEST_STATUS.find(
      (status) => status.label === doc.request_status
    );
    const label = doc.current_status || (request_status ? request_status.label : "unknown");
    if (request_status) {
      return [label, request_status.color];
    }
    return [__("unknown"), "grey"];
  },
  formatters: {
    current_status(value, df, doc) {
      const request_status = REQUEST_STATUS.find(
        (status) => status.label === doc.request_status
      );
      const color = request_status ? request_status.color : "grey";
      const label = value || (request_status ? request_status.label : __("unknown"));
      return `<span class="indicator-pill ${color} ellipsis">
        <span class="ellipsis">${frappe.utils.escape_html(label)}</span>
      </span>`;
    },
  },
};
