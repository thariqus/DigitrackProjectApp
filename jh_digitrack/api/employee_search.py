import frappe

@frappe.whitelist(allow_guest=True)
def search_employees(search):
    if not search:
        return {"message": []}

    employees = frappe.get_all(
        "HRMS Users",
        filters={"first_name": ["like", f"%{search}%"]},
        fields=["name", "first_name", "last_name", "employee_code", "mail_id"]
    )
    if isinstance(employees, dict):
        employees = list(employees.values())
    return {"message": employees}

@frappe.whitelist(allow_guest=True)
def get_employee_details(name):
    """Fetch all fields for a single employee using the docname"""
    if not name:
        return {"message": {}}

    employee_doc = frappe.get_doc("HRMS Users", name)
    return {"message": employee_doc.as_dict()}

