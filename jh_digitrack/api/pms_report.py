
import frappe
import json

@frappe.whitelist(allow_guest=True)
def get_goal_assessment_summary(year=None, manager=None):
    try:
        if not year:
            settings = frappe.get_single("JH Goal Settings")
            year = settings.assesment_year

        if not year:
            return {"error": "Assessment year not found."}

        if not manager:
            frappe.throw("Manager email is required")

        has_pms_manager_role = frappe.db.exists(
            "Has Role", {"parent": manager, "role": "PMS Manager"}
        )

        query = """
            SELECT
                u.name AS manager_email,
                u.full_name AS manager_name,
                COALESCE(emp.employee_count, 0) AS employee_count,
                emp.employees_under_manager,

                COALESCE(gp.goals_pending, 0) AS goals_pending,
                COALESCE(gs.goals_started, 0) AS goals_started,
                COALESCE(gsu.goals_submitted, 0) AS goals_submitted,
                COALESCE(ep.evaluation_pending, 0) AS evaluation_pending,
                COALESCE(es.evaluation_started, 0) AS evaluation_started,
                COALESCE(esu.evaluation_submitted, 0) AS evaluation_submitted,

                gp.goals_pending_employees,
                gs.goals_started_employees,
                gsu.goals_submitted_employees,
                ep.evaluation_pending_employees,
                es.evaluation_started_employees,
                esu.evaluation_submitted_employees

            FROM `tabUser` u
            LEFT JOIN (
                SELECT 
                    manager_email,
                    COUNT(employee_code) AS employee_count,
                    JSON_ARRAYAGG(
                        JSON_OBJECT('employee_code', employee_code, 'employee_name', full_name)
                    ) AS employees_under_manager
                FROM `tabPMS Employees`
                WHERE pms_employee = 1
                GROUP BY manager_email
            ) AS emp ON emp.manager_email = u.name

            LEFT JOIN (
                SELECT manager, COUNT(*) AS goals_pending,
                    JSON_ARRAYAGG(JSON_OBJECT('employee_code', employee_code, 'employee_name', employee_name)) AS goals_pending_employees
                FROM `tabGoal Assessment`
                WHERE year = %s AND status = 'Goals Pending'
                GROUP BY manager
            ) AS gp ON gp.manager = u.name

            LEFT JOIN (
                SELECT manager, COUNT(*) AS goals_started,
                    JSON_ARRAYAGG(JSON_OBJECT('employee_code', employee_code, 'employee_name', employee_name)) AS goals_started_employees
                FROM `tabGoal Assessment`
                WHERE year = %s AND status = 'Goal Started'
                GROUP BY manager
            ) AS gs ON gs.manager = u.name

            LEFT JOIN (
                SELECT manager, COUNT(*) AS goals_submitted,
                    JSON_ARRAYAGG(JSON_OBJECT('employee_code', employee_code, 'employee_name', employee_name)) AS goals_submitted_employees
                FROM `tabGoal Assessment`
                WHERE year = %s AND status = 'Goal Submitted'
                GROUP BY manager
            ) AS gsu ON gsu.manager = u.name

            LEFT JOIN (
                SELECT manager, COUNT(*) AS evaluation_pending,
                    JSON_ARRAYAGG(JSON_OBJECT('employee_code', employee_code, 'employee_name', employee_name)) AS evaluation_pending_employees
                FROM `tabGoal Assessment`
                WHERE year = %s AND status = 'Evaluation Pending'
                GROUP BY manager
            ) AS ep ON ep.manager = u.name

            LEFT JOIN (
                SELECT manager, COUNT(*) AS evaluation_started,
                    JSON_ARRAYAGG(JSON_OBJECT('employee_code', employee_code, 'employee_name', employee_name)) AS evaluation_started_employees
                FROM `tabGoal Assessment`
                WHERE year = %s AND status = 'Evaluation Started'
                GROUP BY manager
            ) AS es ON es.manager = u.name

            LEFT JOIN (
                SELECT manager, COUNT(*) AS evaluation_submitted,
                    JSON_ARRAYAGG(JSON_OBJECT('employee_code', employee_code, 'employee_name', employee_name)) AS evaluation_submitted_employees
                FROM `tabGoal Assessment`
                WHERE year = %s AND status = 'Evaluation Submitted'
                GROUP BY manager
            ) AS esu ON esu.manager = u.name

            WHERE u.name IN (
                SELECT parent 
                FROM `tabHas Role`
                WHERE role = 'PMS User'
            )
        """

        params = [year] * 6
        if not has_pms_manager_role:
            query += " AND u.name = %s"
            params.append(manager)

        data = frappe.db.sql(query, tuple(params), as_dict=True)

        for d in data:

            json_fields = [
                "employees_under_manager",
                "goals_started_employees",
                "goals_submitted_employees",
                "evaluation_pending_employees",
                "evaluation_started_employees",
                "evaluation_submitted_employees",
            ]
            for field in json_fields:
                if d.get(field):
                    try:
                        d[field] = json.loads(d[field])
                    except:
                        d[field] = []
                else:
                    d[field] = []

            all_emps = {emp["employee_code"]: emp for emp in d["employees_under_manager"]}

            ga_lists = [
                d["goals_started_employees"],
                d["goals_submitted_employees"],
                d["evaluation_pending_employees"],
                d["evaluation_started_employees"],
                d["evaluation_submitted_employees"],
            ]

            ga_employees = set()
            for grp in ga_lists:
                for emp in grp:
                    ga_employees.add(emp["employee_code"])

            pending = []
            for code, emp in all_emps.items():
                if code not in ga_employees:
                    pending.append(emp)

            d["goals_pending"] = len(pending)
            d["goals_pending_employees"] = pending


        return {"message": data, "year": year}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_goal_assessment_summary_error")
        return {"error": str(e)}
