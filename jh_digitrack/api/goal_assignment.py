import frappe
from frappe import _
from frappe.utils.data import nowdate
import json
@frappe.whitelist()
def get_goals():
    return frappe.get_all(
        "JH Goal Master",
        fields=["name", "goal_name", "goal_description as description", "measurement_criteria as measurement"]
    )



@frappe.whitelist()
def get_default_assignment_year():
    settings = frappe.get_single("JH Goal Settings")  
    return {"assignment_year": settings.assesment_year}



@frappe.whitelist()
def get_employees_for_manager(user):


    employees = frappe.get_all(
        "PMS Employees",
        filters={"manager_email": user},
        fields=["employee_code as id", "full_name as name"]
    )

    
    return {"employees": employees}


import frappe
from frappe import _

@frappe.whitelist()
def get_employee_goals(employee_id, year=None):
    """
    Fetch all goal assignments for a specific employee and year.
    """
    filters = {"employee_id": employee_id}
    if year:
        filters["year"] = year

    goals = frappe.get_all(
        "Employee Goal Assignment Detail",
        filters=filters,
        fields=["goal_name as name", "description as desc", "measurement", "target_value as targetvalue", "uom"]
    )

    return {"goals": goals}


@frappe.whitelist(allow_guest=True)
def get_employees_with_status(user, year=None):
    settings = frappe.get_single("JH Goal Settings")
    assignment_year = year or settings.assesment_year  

    employees = frappe.db.sql(
        """
        SELECT 
            e.employee_code AS id,
            e.full_name AS name,
            COALESCE(g.status, 'Goal Pending') AS status
        FROM 
            `tabPMS Employees` e
        LEFT JOIN 
            `tabGoal Assessment` g 
        ON 
            g.employee_code = e.employee_code 
            AND g.year = %s
        WHERE 
            e.manager_email = %s
        """,
        (assignment_year, user),
        as_dict=True
    )

    return {"assignment_year": assignment_year, "employees": employees}
