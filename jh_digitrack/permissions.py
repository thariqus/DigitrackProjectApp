import frappe


def travel_request_query(user):
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return ""
    jh_user = frappe.db.get_value("JH User Master", {"user": user}, ["name"])
    if not jh_user:
        frappe.throw("User is not a valid JH User")

    if "JH Credit Card Holder" in frappe.get_roles():
        # List all the requests that are approved or urgent if the user is a credit card holder
        # also list my requests
        return f"""
            (`tabJH Travel Request`.request_status not in ('Approval Pending', 'Denied')) or 
            (`tabJH Travel Request`.owner = {frappe.db.escape(user)})
        """

    reportees = frappe.db.get_list(
        "JH User Master",
        {"reporting_manager": jh_user, "user": ["is", "set"]},
        ["user"],
    )
    reportees = [user["user"] for user in reportees]
    if len(reportees) > 0:
        # List all my reportees requests that are not denied
        # also list my requests
        return f"""
        ((`tabJH Travel Request`.owner in ('{("', '".join(reportees))}') and 
        `tabJH Travel Request`.request_status not in ('Denied')) or 
        `tabJH Travel Request`.owner = {frappe.db.escape(user)})
        """
    else:
        # Finally if the user is not a credit card holder and has no reportees,
        # just list all my requests, that are in all statuses
        return f"""
        (`tabJH Travel Request`.owner = {frappe.db.escape(user)} or 
        (`tabJH Travel Request`.assigned_to = {frappe.db.escape(jh_user)} and `tabJH Travel Request`.request_status in ('Assigned for PO / IEM', 'Assigned for GRN / Miro', 'Completed')))
        """
