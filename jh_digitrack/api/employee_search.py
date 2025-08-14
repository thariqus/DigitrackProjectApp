import frappe

@frappe.whitelist(allow_guest=True)
def search_employees(search):
    if not search:
        return {"message": []}

    search = f"%{search}%"

    employees = frappe.db.sql("""
        SELECT 
            name,
            first_name,
            last_name,
            employee_code,
            mail_id                 
        FROM `tabHRMS Users`
        WHERE 
            first_name LIKE %(search)s
            OR last_name LIKE %(search)s
            OR employee_code LIKE %(search)s
        
    """, {"search": search}, as_dict=True)

    return {"message": employees}

@frappe.whitelist(allow_guest=True)
def get_employee_details(name):
    """Fetch all fields for a single employee using the docname"""
    if not name:
        return {"message": {}}

    employee_doc = frappe.get_doc("HRMS Users", name)
    return {"message": employee_doc.as_dict()}

