
import frappe
import json

@frappe.whitelist()
def get_goal_assessment_summary(year=None, manager=None):
    try:
        if not year:
            settings = frappe.get_single("PMS Settings")
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
                (SELECT full_name FROM `tabJH User Master` WHERE email = u.name LIMIT 1) AS manager_name,
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


@frappe.whitelist()
def get_goal_assessment_summary_org(year=None, manager=None):
    try:
        if not year:
            settings = frappe.get_single("PMS Settings")
            year = settings.assesment_year

        if not manager:
            frappe.throw("Manager email is required")

        hierarchy_rows = frappe.db.get_all(
            "Manager Hierarchy",
            filters={"reporting_manager_email": manager},
            fields=["manager_id", "manager_name"]
        )

        if not hierarchy_rows:
            return {"message": [], "year": year}

        final_data = []

        for row in hierarchy_rows:
            mgr_code = row["manager_id"]
            mgr_name = frappe.db.get_value("JH User Master", {"employee_code": mgr_code}, "full_name")

            employees = frappe.db.get_all(
                "PMS Employees",
                filters={"manager_code": mgr_code, "pms_employee": 1},
                fields=["employee_code", "full_name as employee_name"]
            )

            employee_codes = [e["employee_code"] for e in employees]

            summary = {
                "manager_name": mgr_name,
                "manager_code": mgr_code,     

                "employee_count": len(employees),
                "employees_under_manager": employees,

                "goals_pending": 0,
                "goals_started": 0,
                "goals_submitted": 0,
                "evaluation_pending": 0,
                "evaluation_started": 0,
                "evaluation_submitted": 0,

                "goals_pending_employees": [],
                "goals_started_employees": [],
                "goals_submitted_employees": [],
                "evaluation_pending_employees": [],
                "evaluation_started_employees": [],
                "evaluation_submitted_employees": [],
            }

            if not employee_codes:
                final_data.append(summary)
                continue

            ga_records = frappe.db.get_all(
                "Goal Assessment",
                filters={"year": year, "employee_code": ["in", employee_codes]},
                fields=["employee_code", "employee_name", "status"]
            )

            classified = {
                "Goal Started": "goals_started_employees",
                "Goal Submitted": "goals_submitted_employees",
                "Evaluation Pending": "evaluation_pending_employees",
                "Evaluation Started": "evaluation_started_employees",
                "Evaluation Submitted": "evaluation_submitted_employees",
            }

            for ga in ga_records:
                emp = {"employee_code": ga["employee_code"], "employee_name": ga["employee_name"]}
                key = classified.get(ga["status"])
                if key:
                    summary[key].append(emp)

            summary["goals_started"] = len(summary["goals_started_employees"])
            summary["goals_submitted"] = len(summary["goals_submitted_employees"])
            summary["evaluation_pending"] = len(summary["evaluation_pending_employees"])
            summary["evaluation_started"] = len(summary["evaluation_started_employees"])
            summary["evaluation_submitted"] = len(summary["evaluation_submitted_employees"])

            taken = set()
            for key in [
                "goals_started_employees",
                "goals_submitted_employees",
                "evaluation_pending_employees",
                "evaluation_started_employees",
                "evaluation_submitted_employees",
            ]:
                for e in summary[key]:
                    taken.add(e["employee_code"])

            pending = [e for e in employees if e["employee_code"] not in taken]

            summary["goals_pending"] = len(pending)
            summary["goals_pending_employees"] = pending

            final_data.append(summary)

        return {"message": final_data, "year": year}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_goal_assessment_summary_org_error")
        return {"error": str(e)}



@frappe.whitelist()
def get_goal_assessment_summary_admin(year=None, manager=None):
    try:
        if not year:
            settings = frappe.get_single("PMS Settings")
            year = settings.assesment_year

        if not manager:
            frappe.throw("Admin email is required")
      
        manager_code = frappe.db.get_value(
            "JH User Master",
            {"email": manager},
            "employee_code"
        )

        admin_rows = frappe.db.get_all(
            "PMS Admin Access List",
            filters={"admin_emp_id": manager_code},
            fields=["cost_center"]
        )

        if not admin_rows:
            return {"message": [], "year": year}

        final_data = []

        for row in admin_rows:
            cost_center = row["cost_center"]

            managers = frappe.db.get_all(
                "PMS Employees",
                filters={"cost_center_name": cost_center, "pms_manager": 1},
                fields=["employee_email as manager_email", "full_name as manager_name", "employee_code", "department_name"]
            )

            for mgr in managers:
                mgr_email = mgr["manager_email"]
                mgr_name = mgr["manager_name"]
                mgr_code = mgr["employee_code"]
                department = mgr["department_name"]


                employees = frappe.db.get_all(
                    "PMS Employees",
                    filters={"manager_code": mgr_code, "pms_employee": 1},
                    fields=["employee_code", "full_name as employee_name"]
                )

                employee_codes = [e["employee_code"] for e in employees]

                summary = {
                    "manager_email": mgr_email,
                    "manager_name": mgr_name,
                    "manager_code": mgr_code,
                    "department": department,

                    "employee_count": len(employees),
                    "employees_under_manager": employees,

                    "goals_pending": 0,
                    "goals_started": 0,
                    "goals_submitted": 0,
                    "evaluation_pending": 0,
                    "evaluation_started": 0,
                    "evaluation_submitted": 0,

                    "goals_pending_employees": [],
                    "goals_started_employees": [],
                    "goals_submitted_employees": [],
                    "evaluation_pending_employees": [],
                    "evaluation_started_employees": [],
                    "evaluation_submitted_employees": [],
                }

                if not employee_codes:
                    final_data.append(summary)
                    continue

                ga_records = frappe.db.get_all(
                    "Goal Assessment",
                    filters={"year": year, "employee_code": ["in", employee_codes]},
                    fields=["employee_code", "employee_name", "status"]
                )

                classified = {
                    "Goal Started": "goals_started_employees",
                    "Goal Submitted": "goals_submitted_employees",
                    "Evaluation Pending": "evaluation_pending_employees",
                    "Evaluation Started": "evaluation_started_employees",
                    "Evaluation Submitted": "evaluation_submitted_employees",
                }

                for ga in ga_records:
                    emp = {"employee_code": ga["employee_code"], "employee_name": ga["employee_name"]}
                    key = classified.get(ga["status"])
                    if key:
                        summary[key].append(emp)

                summary["goals_started"] = len(summary["goals_started_employees"])
                summary["goals_submitted"] = len(summary["goals_submitted_employees"])
                summary["evaluation_pending"] = len(summary["evaluation_pending_employees"])
                summary["evaluation_started"] = len(summary["evaluation_started_employees"])
                summary["evaluation_submitted"] = len(summary["evaluation_submitted_employees"])

                taken = set()
                for key in [
                    "goals_started_employees",
                    "goals_submitted_employees",
                    "evaluation_pending_employees",
                    "evaluation_started_employees",
                    "evaluation_submitted_employees",
                ]:
                    for e in summary[key]:
                        taken.add(e["employee_code"])

                pending = [e for e in employees if e["employee_code"] not in taken]

                summary["goals_pending"] = len(pending)
                summary["goals_pending_employees"] = pending

                final_data.append(summary)

        return {"message": final_data, "year": year}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_goal_assessment_summary_admin_error")
        return {"error": str(e)}


@frappe.whitelist()
def get_self_evaluation_history(current_user=None):
    try:
        if not current_user:
            frappe.throw("User email is required")

        jh_user = frappe.get_value(
            "JH User Master",
            {"email": current_user},
            ["name", "employee_code"],
            as_dict=True
        )

        if not jh_user:
            return {"error": "JH User Master not found for this email"}

        employee_code = jh_user.employee_code

        if not employee_code:
            return {"error": "Employee code missing in JH User Master"}

        assessments = frappe.get_all(
            "Goal Assessment",
            filters={
                "employee_code": employee_code,
                "status": ["not in", ["Goal Pending", "Goal Started"]]
            },
            fields=["name", "employee_code", "year", "status", "total_score", "comment"]
        )

        return {
            "employee_code": employee_code,
            "assessments": assessments
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_self_evaluation_history")
        return {"error": str(e)}



from frappe.utils import get_url

@frappe.whitelist()
def send_pending_evaluation_emails(emails, year):
    if isinstance(emails, str):
        emails = frappe.parse_json(emails)

    if not emails:
        return

    settings = frappe.get_single("PMS Settings")

    if not settings.email_template:
        frappe.throw("Email template not configured in PMS Settings")

    template = frappe.get_doc("Email Template", settings.email_template)

    subject = template.subject or "PMSLite-Reminder"
    message = template.response

    for email in emails:
        frappe.sendmail(
            recipients=email,
            subject=subject,
            message=message,
            # now=True,
        )
    frappe.db.commit()   
    return {"status": "success"}
