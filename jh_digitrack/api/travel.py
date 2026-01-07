import frappe


@frappe.whitelist()
def whoami(req_id: str, is_new: bool = False):
    user = frappe.session.user
    if user == "Administrator":
        return {
            "role": "Administrator",
        }
    jh_user = frappe.db.get_value("JH User Master", {"user": user}, ["name"])
    if not jh_user:
        frappe.throw("User is not a valid JH User")

    is_cc_holder = "JH Credit Card Holder" in frappe.get_roles(user)
    if is_new:
        if is_cc_holder:
            return {
                "role": "cc_holder",
            }
        else:
            return {
                "role": "travel_request_owner",
            }
    travel_request = frappe.get_doc("JH Travel Request", req_id)
    travel_requested_by = frappe.get_doc("JH User Master", travel_request.requested_by)
    is_travel_request_owner = travel_request.owner == user
    is_reporting_manager = travel_requested_by.reporting_manager == jh_user
    is_assigned_to = travel_request.assigned_to == jh_user
    is_po_assigned_to = travel_request.po_assigned_to == jh_user
    if is_assigned_to:
        return {
            "role": "assignee",
        }
    if is_po_assigned_to:
        return {
            "role": "po_assignee",
        }
    if is_cc_holder:
        return {
            "role": "cc_holder",
        }

    if is_travel_request_owner:
        return {
            "role": "travel_request_owner",
        }

    if is_reporting_manager:
        return {
            "role": "reporting_manager",
        }
