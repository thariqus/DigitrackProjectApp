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

frappe.listview_settings["JH Travel Request"] = {
  add_fields: ["request_status"],
  get_indicator(doc) {
    const request_status = REQUEST_STATUS.find(
      (status) => status.label === doc.request_status
    );
    if (request_status) {
      return [__(request_status.label), request_status.color];
    }
    return [__("unknown"), "grey"];
  },
};
