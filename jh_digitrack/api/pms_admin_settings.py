import frappe

@frappe.whitelist(methods=["GET"])
def get_pms_settings():
    settings = frappe.get_single("PMS Settings")

    return {
        "min_no_of_goals": settings.minimum_no_of_goals,
        "min_value": settings.min_value,
        "max_value": settings.max_value,
        "enable_goal_submission": settings.enable_goal_submission,
        "enable_goal_evaluation": settings.enable_goal_evaluation,
        "email_template": settings.email_template,
        "rows": [
            {
                "year": row.year,
                "from": row.from_date,
                "to": row.to_date,
                "current": row.is_current,
            }
            for row in settings.pms_settings_table
        ]
    }


import frappe

@frappe.whitelist(methods=["POST"])
def save_pms_settings(
    min_no_of_goals=None,
    min_value=None,
    max_value=None,
    enable_goal_submission=None,
    enable_goal_evaluation=None,
    email_template=None,
    rows=None
):
    settings = frappe.get_single("PMS Settings")

    settings.minimum_no_of_goals = min_no_of_goals
    settings.min_value = min_value
    settings.max_value = max_value
    settings.enable_goal_submission = enable_goal_submission
    settings.enable_goal_evaluation = enable_goal_evaluation
    settings.email_template = email_template

    settings.set("pms_settings_table", [])

    for row in rows or []:
        settings.append("pms_settings_table", {
            "year": row.get("year"),
            "from_date": row.get("from"),
            "to_date": row.get("to"),
            "is_current": row.get("current"),
        })

    settings.save(ignore_permissions=True)
    frappe.db.commit()

    return {"message": "PMS Settings updated successfully"}
