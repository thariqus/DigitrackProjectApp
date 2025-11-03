import frappe
from frappe import _

@frappe.whitelist()
def get_goal_evaluation(user,year=None):
    if not user:
        frappe.throw(_("User email is required"))

    settings = frappe.get_single("JH Goal Settings")
    assessment_year = year or settings.assesment_year

    allowed_statuses = ("Evaluation Pending", "Evaluation Started", "Evaluation Submitted", "Goal Submitted")

    query = """
        SELECT
            name AS docname,
            employee_name,
            employee_code,
            CASE
                WHEN status = 'Goal Submitted' THEN 'Evaluation Pending'
                ELSE status
            END AS status
        FROM
            `tabGoal Assessment`
        WHERE
            manager = %s
            AND year = %s
            AND status IN %s
        ORDER BY
            creation DESC
    """

    result = frappe.db.sql(query, (user, assessment_year, allowed_statuses), as_dict=True)

    return {
        "assessment_year": assessment_year,
        "evaluations": result
    }


import frappe
from frappe.utils import now
from frappe import _

@frappe.whitelist()
def create_goal_evaluation(data=None, session_user=None):
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

            if doc.status != "Evaluation Started":
                doc.status = "Evaluation Started"

            doc.set("employee_goals", [])

            msg = f"Updated Goal Evaluation {existing_name}"

        else:
            doc = frappe.new_doc("Goal Assessment")
            doc.employee_code = employee_code
            doc.year = year
            doc.manager = session_user
            doc.status = "Evaluation Started"
            msg = "Created new Goal Assessment"

        for g in goals:
            doc.append("employee_goals", {
                "goal_id": g.get("goal_name"),
                "description": g.get("description"),
                "measurement_criteria": g.get("measurement_criteria"),
                "target": g.get("target"),
                "uom": g.get("uom"),
                "achievement_score": g.get("achievement_score"),
                "remark": g.get("remarks"),
            })

        doc.save(ignore_permissions=True, ignore_version=True)
        frappe.db.commit()

        return {"message": msg, "name": doc.name}

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Goal Evaluation Creation Failed")
        return {"error": str(e)}
    

import frappe

@frappe.whitelist()
def get_employee_goals(employee_code, year):
   
    try:
        query = """
            SELECT 
                g.goal_name,
                g.goal_id,
                g.description,
                g.measurement_criteria,
                g.target,
                g.uom,
                g.achievement_score,
                g.remark
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
    

import frappe
from frappe import _

@frappe.whitelist()
def submit_goal_evaluation(employee_code, year):
  
    if not employee_code or not year:
        frappe.throw(_("Employee code and year are required."))

    goal_eval = frappe.db.get_value(
        "Goal Assessment",
        {"employee_code": employee_code, "year": year},
        "name"
    )

    if not goal_eval:
        frappe.throw(_("Goal Evaluation record not found."))

    doc = frappe.get_doc("Goal Assessment", goal_eval)

    if doc.docstatus == 1:
        return {"message": "Goal Evaluation already submitted."}
    doc.status = "Evaluation Submitted"
    doc.submit(ignore_permissions=True)
    frappe.db.commit()
    return {"message": "Goal Evaluation submitted successfully.", "docname": doc.name}
