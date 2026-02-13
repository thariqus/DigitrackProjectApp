import frappe

@frappe.whitelist(allow_guest=True, methods=["GET"])
def search_employees(search):
    if not search or search.startswith("@"):
        return {"message": []}

    search = search.split("@", 1)[0] if "@" in search else search

    search_like = f"%{search}%"

    employees = frappe.db.sql("""
        SELECT 
            name,
            first_name,
            last_name,
            employee_code,
            mail_id,
            location_name,
            department_name,                  
            mobile_no  
        FROM `tabHRMS Users`
        WHERE 
            first_name LIKE %(search)s
            OR last_name LIKE %(search)s
            OR employee_code LIKE %(search)s
            OR SUBSTRING_INDEX(mail_id, '@', 1) LIKE %(search)s
        ORDER BY
          CASE
            WHEN first_name LIKE %(search)s THEN 1
            WHEN last_name LIKE %(search)s THEN 2
            WHEN employee_code LIKE %(search)s THEN 3
            WHEN SUBSTRING_INDEX(mail_id, '@', 1) LIKE %(search)s THEN 4
            ELSE 5
          END,
          first_name ASC,
          last_name ASC
        LIMIT 50
    """, {"search": search_like}, as_dict=True)

    return {"message": employees}



@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_employee_details(name):
    if not name:
        return {"message": {}}

    employee_doc = frappe.get_doc("HRMS Users", name).as_dict()

    def get_employee_display(code):
        if not code:
            return None
        emp = frappe.db.get_value(
            "HRMS Users",
            {"employee_code": code},
            ["first_name", "middle_name", "last_name","employee_code"],
            as_dict=True,
        )
        if emp:
            full_name = " ".join(filter(None, [emp.first_name, emp.middle_name, emp.last_name]))
            return f"{full_name} ({emp.employee_code})"
        return code  

    employee_doc["reporting_manager"] = get_employee_display(employee_doc.get("reporting_manager"))
    employee_doc["funcational_reporting_manager"] = get_employee_display(employee_doc.get("funcational_reporting_manager"))
    employee_doc["skip_level_reporting_manager"] = get_employee_display(employee_doc.get("skip_level_reporting_manager"))

    return {"message": employee_doc}

