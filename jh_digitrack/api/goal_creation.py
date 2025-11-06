import frappe

@frappe.whitelist()
def get_employee_goals(employee_code, year):
    """
    Return goals assigned for an employee from the child table using SQL
    """
    try:
        query = """
            SELECT 
                g.goal_name,
                g.goal_id,
                g.description,
                g.measurement_criteria,
                g.target,
                g.uom,
                g.upwarddownward AS upward_downward
            
            FROM `tabEmployee Goals` g
            INNER JOIN `tabGoal Assessment` ga ON ga.name = g.parent
            WHERE ga.employee_code = %s
              AND ga.year = %s
        """

        goals = frappe.db.sql(query, (employee_code, year), as_dict=True)
        return goals

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_employee_goals_sql_error")
        return {"error": str(e)}



@frappe.whitelist()
def save_employee_goals(employee_code, year, goals):
    """Save or update employee goals"""
    import json
    goals = json.loads(goals)

    frappe.db.delete("Goal Assessment Detail", {"employee_code": employee_code, "year": year})

    for g in goals:
        doc = frappe.new_doc("Goal Assessment Detail")
        doc.employee_code = employee_code
        doc.year = year
        doc.goal_name = g.get("name")
        doc.goal_description = g.get("desc")
        doc.measurement = g.get("measurement")
        doc.target_value = g.get("targetvalue")
        doc.uom = g.get("uom")
        doc.direction = g.get("seletedvalueOfUorD")
        doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "success"}


@frappe.whitelist()
def submit_employee_goals(employee_code, year):
    """Mark goals as submitted"""
    frappe.db.set_value("Goal Assessment", {"employee_code": employee_code, "year": year}, "status", "Goal Submitted")
    frappe.db.commit()
    return {"status": "submitted"}

import frappe
from frappe.utils import now
from frappe import _

@frappe.whitelist()
def create_goal_assessment(data=None, session_user=None):
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)

        if not data:
            frappe.throw(_("No data received for goal assessment."))

        employee_code = data.get("employee_code")
        year = data.get("year")
        goals = data.get("goals") or []
        session_user = session_user or frappe.session.user
        timestamp = now()

        if not employee_code or not year:
            frappe.throw(_("Employee code and year are required."))

        existing_name = frappe.db.get_value(
            "Goal Assessment",
            {"employee_code": employee_code, "year": year},
            "name"
        )

        if existing_name:
            doc = frappe.get_doc("Goal Assessment", existing_name)
            doc.manager = session_user

            if doc.status != "Goal Started":
                doc.status = "Goal Started"

            doc.set("employee_goals", [])

            msg = f"Updated Goal Assessment"

        else:
            doc = frappe.new_doc("Goal Assessment")
            doc.employee_code = employee_code
            doc.year = year
            doc.manager = session_user
            doc.status = "Goal Started"
            msg = "Created new Goal Assessment"

        for g in goals:
            doc.append("employee_goals", {
                "goal_id": g.get("goal_name"),
                "description": g.get("description"),
                "measurement_criteria": g.get("measurement_criteria"),
                "target": g.get("target"),
                "uom": g.get("uom"),
                "upwarddownward": g.get("upward_downward")
            })

        doc.save(ignore_permissions=True, ignore_version=True)
        frappe.db.commit()

        return {"message": msg, "name": doc.name}

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Goal Assessment Creation Failed")
        return {"error": str(e)}

import frappe
from frappe import _
from frappe.utils import now

@frappe.whitelist()
def submit_goal_assessment(employee_code=None, year=None, new_goals=None):
    try:
        frappe.logger().info(f" Submit Goal Assessment: emp={employee_code}, year={year}")

        if not employee_code or not year:
            frappe.throw(_("Employee code and year are required."))

        if isinstance(new_goals, str):
            new_goals = frappe.parse_json(new_goals)

        year = str(year)
        employee_code = str(employee_code)

        goal_assessment_name = frappe.db.get_value(
            "Goal Assessment",
            {"employee_code": employee_code, "year": year},
            "name"
        )

        if not goal_assessment_name:
            frappe.throw(_(f"You need to save the Goal Assignment before it can be submitted."))

        doc = frappe.get_doc("Goal Assessment", goal_assessment_name)

        doc.set("employee_goals", [])

        if new_goals:
            for g in new_goals:
                doc.append("employee_goals", {
                    "goal_id": g.get("goal_id"),  
                    "description": g.get("description"),
                    "measurement_criteria": g.get("measurement_criteria"),
                    "target": g.get("target"),
                    "uom": g.get("uom"),
                })

        settings = frappe.get_single("JH Goal Settings")
        min_goals = settings.minimum_no_of_goals or 0

        total_goals = len(doc.employee_goals)
        if total_goals < min_goals:
            frappe.throw(
                _(f"Minimum {min_goals} goals are required to submit.")
            )

        doc.status = "Goal Submitted"
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        frappe.logger().info(f"Successfully submitted Goal Assessment: {doc.name}")
        return {
            "message": {
                "status": "success",
                "message": f"Goal Assessment {doc.name} submitted successfully."
            }
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Goal Assessment Submit Failed")
        frappe.logger().error(f" Error submitting Goal Assessment: {str(e)}")
        return {"error": str(e)}

import frappe
from frappe import _

@frappe.whitelist()
def delete_employee_goals(employee_code, year, goal_ids):
    goal_ids = frappe.parse_json(goal_ids)

    doc = frappe.get_doc("Goal Assessment", {"employee_code": employee_code, "year": year})
    if not doc:
        return {"error": "Goal Assessment not found"}

    remaining = [d for d in doc.employee_goals if d.goal_id not in goal_ids]

    if not remaining:
        frappe.delete_doc("Goal Assessment", doc.name, force=1, ignore_permissions=True)
        frappe.db.commit()
        return {"message": "All goals deleted. Goal Assessment removed as well."}

    doc.set("employee_goals", remaining)
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"message": "Selected goals deleted"}

