import frappe
from frappe import _
from frappe.utils.data import nowdate
import json
@frappe.whitelist(methods=["GET"])
def get_goals():
    return frappe.get_all(
        "JH Goal Master",
        fields=["name", "goal_name", "goal_description as description", "measurement_criteria as measurement"]
    )


@frappe.whitelist(methods=["GET"])
def get_default_assignment_year():
    year = frappe.db.get_value(
        "PMS Settings Table",
        {"parent": "PMS Settings", "is_current": 1},
        "year"
    )

    if not year:
        frappe.throw("No current assessment year found")

    return {"assignment_year": year}



@frappe.whitelist(methods=["GET"])
def get_employees_for_manager(user):


    employees = frappe.get_all(
        "PMS Employees",
        filters={"manager_email": user},
        fields=["employee_code as id", "full_name as name"]
    )

    
    return {"employees": employees}


import frappe
from frappe import _

@frappe.whitelist(methods=["GET"])
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


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_employees_with_status(user, year=None):
 
    settings_row = frappe.db.get_value(
        "PMS Settings Table",
        {"parent": "PMS Settings", "is_current": 1},
        ["year", "from_date", "to_date"],
        as_dict=True
    )
    assignment_year = year or settings_row.get("year")
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
            AND e.pms_employee = 1
        """,
        (assignment_year, user),
        as_dict=True
    )

    return {"assignment_year": assignment_year,
            "from_date": settings_row.get("from_date"),
            "to_date": settings_row.get("to_date"),
            "employees": employees}
