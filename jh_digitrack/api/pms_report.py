
import frappe
import json

# Report columns in workflow order: (summary key, column label). Each employee
# is counted in exactly one column, based on where their evaluation is now.
STATUS_BUCKETS = [
    ("goals_pending", "Goals Pending"),
    ("goals_started", "Goals Started"),
    ("goals_submitted", "Goals Submitted"),
    ("rpt_manager_started", "RPT Manager Started"),
    ("rpt_manager_submitted", "RPT Manager Submitted"),
    ("fm_manager_started", "FM Manager Started"),
    ("fm_manager_submitted", "FM Manager Submitted"),
    ("sm_manager_started", "SM Manager Started"),
    ("sm_manager_submitted", "SM Manager Submitted"),
    ("evaluation_started", "Eval Started"),
    ("evaluation_submitted", "Eval Submitted"),
]


def _has_review(rating, comment):
    return bool(rating) or bool((comment or "").strip())


def _status_bucket(ga):
    """Report column for one Goal Assessment (None = no assessment yet)."""
    status = ga.status if ga else None

    if status == "Goal Started":
        return "goals_started"
    if status == "Goal Submitted":
        return "goals_submitted"
    if status == "Evaluation Started":
        return "rpt_manager_started"
    if status == "Functional Manager Review":
        # Reporting manager has submitted; "started" once the functional manager saves
        if _has_review(ga.functional_manager_rating, ga.functional_manager_comment):
            return "fm_manager_started"
        return "rpt_manager_submitted"
    if status == "Skip Level Manager Review":
        # Functional stage done; "started" once the skip-level manager saves
        if _has_review(ga.skip_level_manager_rating, ga.skip_level_manager_comment):
            return "sm_manager_started"
        return "fm_manager_submitted"
    if status == "HR Review":
        return "sm_manager_submitted"
    if status == "HR Submitted":
        return "evaluation_started"
    if status == "Evaluation Submitted":
        return "evaluation_submitted"
    return "goals_pending"


def _summarize_employee_statuses(employees, year):
    """Counts and employee lists per report column for the given employees
    (list of {employee_code, employee_name})."""
    summary = {}
    for key, _label in STATUS_BUCKETS:
        summary[key] = 0
        summary[f"{key}_employees"] = []
    # No longer a separate stage; kept so older consumers still get the keys
    summary["evaluation_pending"] = 0
    summary["evaluation_pending_employees"] = []

    codes = [e["employee_code"] for e in employees if e.get("employee_code")]
    ga_by_code = {}
    if codes:
        for ga in frappe.get_all(
            "Goal Assessment",
            filters={"year": year, "employee_code": ["in", codes]},
            fields=[
                "employee_code", "employee_name", "status",
                "functional_manager_rating", "functional_manager_comment",
                "skip_level_manager_rating", "skip_level_manager_comment",
            ],
        ):
            ga_by_code[ga.employee_code] = ga

    for emp in employees:
        ga = ga_by_code.get(emp.get("employee_code"))
        key = _status_bucket(ga)
        summary[f"{key}_employees"].append({
            "employee_code": emp.get("employee_code"),
            "employee_name": emp.get("employee_name") or (ga.employee_name if ga else ""),
        })

    for key, _label in STATUS_BUCKETS:
        summary[key] = len(summary[f"{key}_employees"])

    return summary


@frappe.whitelist(methods=["GET"])
def get_goal_assessment_summary(year=None, manager=None):
    try:

        current_year, current_quarterly, years = get_pms_years()
        if year is None:
            year = current_year


        if not year:
            return {"error": "Assessment year not found"}


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
                emp.employees_under_manager
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
            WHERE u.name IN (
                SELECT parent
                FROM `tabHas Role`
                WHERE role = 'PMS User'
            )
        """

        params = []
        if not has_pms_manager_role:
            query += " AND u.name = %s"
            params.append(manager)

        data = frappe.db.sql(query, tuple(params), as_dict=True)

        for d in data:
            try:
                d["employees_under_manager"] = json.loads(d.get("employees_under_manager") or "[]")
            except Exception:
                d["employees_under_manager"] = []

            d.update(_summarize_employee_statuses(d["employees_under_manager"], year))

        # return {
        #     "message": data, 
        #     "year": year,
        #     "from_date": settings_row.get("from_date"),
        #     "to_date": settings_row.get("to_date"),
        #     }
        return {
            "message": data,
            "current_year": current_year,
            "current_quarterly": current_quarterly,
            "years": years,
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_goal_assessment_summary_error")
        return {"error": str(e)}


@frappe.whitelist(methods=["GET"])
def get_goal_assessment_summary_org(year=None, manager=None):
    try:

        current_year, current_quarterly, years = get_pms_years()
        if year is None:
            year = current_year

        if not year:
            return {"error": "Assessment year not found"}

        if not manager:
            frappe.throw("Manager email is required")

        hierarchy_rows = frappe.db.get_all(
            "Manager Hierarchy",
            filters={"reporting_manager_email": manager},
            fields=["manager_id", "manager_name"]
        )

        if not hierarchy_rows:
            # return {
            #     "message": [],
            #     "year": year,
            #     "from_date": settings_row.get("from_date"),
            #     "to_date": settings_row.get("to_date"),
            # }
            return {
                "message": [],
                "current_year": current_year,
                "current_quarterly": current_quarterly,
                "years": years,
            }

        final_data = []

        for row in hierarchy_rows:
            mgr_code = row["manager_id"]
            mgr_name = frappe.db.get_value("JH User Master", {"employee_code": mgr_code}, "full_name")

            employees = frappe.db.get_all(
                "PMS Employees",
                filters={"manager_code": mgr_code, "pms_employee": 1},
                fields=["employee_code", "full_name as employee_name"]
            )

            summary = {
                "manager_name": mgr_name,
                "manager_code": mgr_code,
                "employee_count": len(employees),
                "employees_under_manager": employees,
            }
            summary.update(_summarize_employee_statuses(employees, year))

            final_data.append(summary)

        # return {
        #     "message": final_data, 
        #     "year": year,
        #     "from_date": settings_row.get("from_date"),
        #     "to_date": settings_row.get("to_date"),
        #     }
    
        return {
            "message": final_data,
            "current_year": current_year,
            "current_quarterly": current_quarterly,
            "years": years,
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_goal_assessment_summary_org_error")
        return {"error": str(e)}



@frappe.whitelist(methods=["GET"])
def get_goal_assessment_summary_admin(year=None, manager=None):
    try:

        current_year, current_quarterly, years = get_pms_years()
        if year is None:
            year = current_year

        if not year:
            return {"error": "Assessment year not found"}


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
            return {
                "message": [],
                "current_year": current_year,
                "current_quarterly": current_quarterly,
                "years": years,
            }

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

                summary = {
                    "manager_email": mgr_email,
                    "manager_name": mgr_name,
                    "manager_code": mgr_code,
                    "department": department,
                    "employee_count": len(employees),
                    "employees_under_manager": employees,
                }
                summary.update(_summarize_employee_statuses(employees, year))

                final_data.append(summary)

        # return {
        #     "message": final_data, 
        #     "year": year,
        #     "from_date": settings_row.get("from_date"),
        #     "to_date": settings_row.get("to_date"),
            # }
        return {
            "message": final_data,
            "current_year": current_year,
            "current_quarterly": current_quarterly,
            "years": years,
        }


    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_goal_assessment_summary_admin_error")
        return {"error": str(e)}


@frappe.whitelist(methods=["GET"])
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

@frappe.whitelist(allow_guest=True,methods=["GET"])
def get_pms_years():
    # Each PMS Settings Table row is one (year, quarter) period, e.g.
    # year="2026", quaterly="2026 Q1". The dropdown lists these quarterly
    # periods; the "year" filter used against Goal Assessment stays the
    # plain year of whichever period is selected.
    rows = frappe.db.get_all(
        "PMS Settings Table",
        filters={"parent": "PMS Settings"},
        fields=["year", "quaterly", "from_date", "to_date", "is_current"],
        order_by="year desc, quaterly desc",
        ignore_permissions=True
    )
    current_year = None
    current_quarterly = None
    years = []

    for r in rows:
        years.append({
            "year": r.year,
            "quaterly": r.quaterly,
            "from_date": r.from_date,
            "to_date": r.to_date,
            "is_current": bool(r.is_current),
        })
        if r.is_current:
            current_year = r.year
            current_quarterly = r.quaterly

    return current_year, current_quarterly, years


from frappe.utils import get_url
import frappe

@frappe.whitelist(allow_guest=True, methods=["POST"])
def send_pending_evaluation_emails(emails, year, cc_email=None):
    if isinstance(emails, str):
        emails = frappe.parse_json(emails)

    if not emails:
        frappe.throw("No recipients found")

    settings = frappe.get_single("PMS Settings")

    if not settings.email_template:
        frappe.throw("Email content not configured in PMS Settings")

    template_body = settings.email_template

    for email, manager_name in emails:  
        if not email:
            frappe.log_error(f"No recipient email found for sending PMS reminder", "Email Send Error")
            continue

        message = (
            f"<strong>Dear {manager_name},</strong><br><br>"
            f"<strong>{template_body.replace(chr(10), '<br>')}</strong>"
        )


        frappe.sendmail(
            expose_recipients="header",
            recipients=[email],
            cc=[cc_email] if cc_email else None,
            subject="J-Reflect Reminder",  
            message=message,
            delayed=False,
            now=True,  
            sender=None, 
        )

    frappe.db.commit()
    return {"status": "success"}

