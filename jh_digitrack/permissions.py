import frappe

def travel_request_query(user):
    if not user:
        user = frappe.session.user

    jh_user = frappe.db.get_value("JH User Master", {"user": user}, ["name"])

    return f"""
        (`tabJH Travel Request`.owner = {frappe.db.escape(user)}
        OR `tabJH Travel Request`.assigned_to = {frappe.db.escape(jh_user)})
    """
