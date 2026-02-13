import frappe
from frappe import _

def validate_pms_user(doc, method=None):

    roles = [r.role for r in doc.roles or []]
    if "PMS User" not in roles:
        return

    # -------------------------------------------------
    # Fetch JH User Master
    # -------------------------------------------------
    jh_user = frappe.db.get_value(
        "JH User Master",
        {"email": doc.name},
        ["name", "employee_code"],
        as_dict=True
    )

    if not jh_user:
        frappe.throw(
            _("No JH User Master found for email <b>{0}</b>").format(doc.name)
        )

    if not jh_user.employee_code:
        frappe.throw(
            _("Employee code missing in JH User Master for <b>{0}</b>").format(doc.name)
        )

    employee_code = jh_user.employee_code

    # -------------------------------------------------
    # Fetch PMS Employees
    # -------------------------------------------------
    pms_employee = frappe.db.get_value(
        "PMS Employees",
        employee_code,
        ["pms_admin", "pms_manager", "pms_employee"],
        as_dict=True
    )

    if not pms_employee:
        frappe.throw(
            _("No PMS Employees record found for Employee Code <b>{0}</b>").format(employee_code)
        )

    # -------------------------------------------------
    # Validate PMS flags
    # -------------------------------------------------
    if not (
        pms_employee.pms_admin
        or pms_employee.pms_manager
        or pms_employee.pms_employee
    ):
        frappe.throw(
            _(
                "To assign <b>PMS User</b> role, enable at least one of the following "
                "in <b>PMS Employees</b>:<br>"
                "• PMS Admin<br>"
                "• PMS Manager<br>"
                "• PMS Employee"
            )
        )
