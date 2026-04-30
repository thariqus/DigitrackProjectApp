const WORKFLOW_STATE_COLORS = {
  Draft: "grey",
  "Pending Approver 1": "orange",
  "Pending Approver 2": "yellow",
  "Pending Cheque Details": "cyan",
  "Pending CFO": "blue",
  "Pending MD": "purple",
  "Pending Property PO": "green",
  "Pending MIRO": "darkgrey",
  Completed: "green",
  Rejected: "red",
  Withdrawn: "red",
};

frappe.listview_settings["JH Property Rental Renewal"] = {
  add_fields: ["workflow_state"],
  refresh(listview) {
    setTimeout(() => {
      listview.$result.find(".list-row-head .list-subject level-item").show();
      listview.$result.find('[data-fieldname="status"]').hide();
    }, 100);
  },
  get_indicator(doc) {
    const workflow_state = doc.workflow_state || "Draft";
    const color = WORKFLOW_STATE_COLORS[workflow_state] || "grey";

    return [__(workflow_state), color, `workflow_state,=,${workflow_state}`];
  },
};
