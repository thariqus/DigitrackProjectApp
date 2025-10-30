import frappe

@frappe.whitelist()
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
                
                COALESCE(SUM(CASE WHEN ga.status = 'Goals Pending' THEN 1 ELSE 0 END), 0) AS goals_pending,
                COALESCE(SUM(CASE WHEN ga.status = 'Goals Started' THEN 1 ELSE 0 END), 0) AS goals_started,
                COALESCE(SUM(CASE WHEN ga.status = 'Goals Submitted' THEN 1 ELSE 0 END), 0) AS goals_submitted,
                COALESCE(SUM(CASE WHEN ga.status = 'Evaluation Pending' THEN 1 ELSE 0 END), 0) AS evaluation_pending,
                COALESCE(SUM(CASE WHEN ga.status = 'Evaluation Started' THEN 1 ELSE 0 END), 0) AS evaluation_started,
                COALESCE(SUM(CASE WHEN ga.status = 'Evaluation Submitted' THEN 1 ELSE 0 END), 0) AS evaluation_submitted,

                JSON_ARRAYAGG(
                    CASE WHEN ga.status = 'Goals Pending' 
                        THEN JSON_OBJECT('employee_code', ga.employee_code, 'employee_name', ga.employee_name)
                    END
                ) AS goals_pending_employees,

                JSON_ARRAYAGG(
                    CASE WHEN ga.status = 'Goals Started' 
                        THEN JSON_OBJECT('employee_code', ga.employee_code, 'employee_name', ga.employee_name)
                    END
                ) AS goals_started_employees,

                JSON_ARRAYAGG(
                    CASE WHEN ga.status = 'Goals Submitted' 
                        THEN JSON_OBJECT('employee_code', ga.employee_code, 'employee_name', ga.employee_name)
                    END
                ) AS goals_submitted_employees,

                JSON_ARRAYAGG(
                    CASE WHEN ga.status = 'Evaluation Pending' 
                        THEN JSON_OBJECT('employee_code', ga.employee_code, 'employee_name', ga.employee_name)
                    END
                ) AS evaluation_pending_employees,

                JSON_ARRAYAGG(
                    CASE WHEN ga.status = 'Evaluation Started' 
                        THEN JSON_OBJECT('employee_code', ga.employee_code, 'employee_name', ga.employee_name)
                    END
                ) AS evaluation_started_employees,

                JSON_ARRAYAGG(
                    CASE WHEN ga.status = 'Evaluation Submitted' 
                        THEN JSON_OBJECT('employee_code', ga.employee_code, 'employee_name', ga.employee_name)
                    END
                ) AS evaluation_submitted_employees

            FROM `tabUser` u
            LEFT JOIN (
                SELECT 
                    manager_email,
                    COUNT(name) AS employee_count
                FROM `tabPMS Employees`
                GROUP BY manager_email
            ) AS emp ON emp.manager_email = u.name

            LEFT JOIN `tabGoal Assessment` ga 
                ON ga.manager = u.name AND ga.year = %s

            WHERE u.name IN (
                SELECT parent 
                FROM `tabHas Role`
                WHERE role = 'PMS User'
            )
        """

        params = [year]

        if not has_pms_manager_role:
            query += " AND u.name = %s"
            params.append(manager)

        query += " GROUP BY u.name, u.full_name, emp.employee_count"

        data = frappe.db.sql(query, tuple(params), as_dict=True)

        return {"message": data, "year": year}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_goal_assessment_summary_error")
        return {"error": str(e)}
