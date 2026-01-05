

import frappe

def validate_pms_user(doc, method=None):
   
    roles = [r.role for r in doc.roles or []]
    if "PMS User" not in roles:
        return

    jh_user = frappe.db.get_value(
        "JH User Master",
        {"email": doc.name},
        ["name", "employee_code"],
        as_dict=True
    )

    if not jh_user:
        frappe.throw(
            f"No JH User Master found for email <b>{doc.name}</b>"
        )

    if not jh_user.employee_code:
        frappe.throw(
            f"Employee code missing in JH User Master for <b>{doc.name}</b>"
        )

    employee_code = jh_user.employee_code

    if not frappe.db.exists("PMS Employees", employee_code):
        frappe.throw(
            f"No PMS Employees record found for Employee Code <b>{employee_code}</b>"
        )
