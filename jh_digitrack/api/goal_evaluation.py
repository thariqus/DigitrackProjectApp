import frappe
from frappe import _

GOAL_BASED_QUERY = """
    SELECT
        ga.name AS docname,
        ga.employee_name,
        ga.employee_code,
        pe.designation_name,
        pe.band AS grade,
        COALESCE(ga.total_score, 0) AS total_score,
        COALESCE(ga.rating, 0) * 5 AS rating,
        ga.comment,
        ga.eligible_for_increment,
        ga.training_requirement_identified,
        ga.eligible_for_promotion,
        CASE
            WHEN ga.status = 'Goal Submitted'
                THEN 'Evaluation Pending'
            ELSE ga.status
        END AS status
    FROM
        `tabGoal Assessment` ga
    LEFT JOIN
        `tabPMS Employees` pe
        ON pe.employee_code = ga.employee_code
    WHERE
        ga.manager = %s
        AND ga.year = %s
        AND ga.status IN %s
    ORDER BY
        ga.creation DESC
"""

ALL_EMPLOYEES_QUERY = """
    SELECT
        ga.name AS docname,
        pe.full_name AS employee_name,
        pe.employee_code AS employee_code,
        pe.designation_name AS designation_name,
        pe.band AS grade,
        COALESCE(ga.total_score, 0) AS total_score,
        COALESCE(ga.rating, 0) * 5 AS rating,
        ga.comment AS comment,
        ga.eligible_for_increment,
        ga.training_requirement_identified,
        ga.eligible_for_promotion,
        COALESCE(ga.status, 'Evaluation Pending') AS status
    FROM
        `tabPMS Employees` pe
    LEFT JOIN
        `tabGoal Assessment` ga
        ON ga.employee_code = pe.employee_code
        AND ga.year = %s
    WHERE
        pe.manager_email = %s
        AND pe.pms_employee = 1
"""

ALLOWED_EVALUATION_STATUSES = (
    "Evaluation Pending",
    "Evaluation Started",
    "Evaluation Submitted",
    "Goal Submitted",
)


def _fetch_evaluations(user, year, include_all_employees):
    if not user:
        frappe.throw(_("User email is required"))

    settings_row = frappe.db.get_value(
        "PMS Settings Table",
        {"parent": "PMS Settings", "is_current": 1},
        ["year", "from_date", "to_date"],
        as_dict=True
    )
    assessment_year = year or settings_row.get("year")
    enable_yearly_appraisal = frappe.db.get_single_value("PMS Settings", "enable_yearly_appraisal")

    result = frappe.db.sql(
        GOAL_BASED_QUERY,
        (user, assessment_year, ALLOWED_EVALUATION_STATUSES),
        as_dict=True
    )

    if include_all_employees:
        all_employees_result = frappe.db.sql(
            ALL_EMPLOYEES_QUERY,
            (assessment_year, user),
            as_dict=True
        )
        seen_employee_codes = {row["employee_code"] for row in result}
        result += [
            row for row in all_employees_result
            if row["employee_code"] not in seen_employee_codes
        ]

    docnames = [row["docname"] for row in result if row["docname"]]
    attachments_by_parent = {}
    if docnames:
        doc_rows = frappe.get_all(
            "JH Documet",
            filters={"parent": ["in", docnames]},
            fields=["name", "parent", "document_type", "attachment"],
        )
        for row in doc_rows:
            if not row["attachment"]:
                continue
            attachments_by_parent.setdefault(row["parent"], []).append({
                "row_name": row["name"],
                "file_name": row["attachment"].split("/")[-1],
                "file_url": row["attachment"],
                "document_type": row["document_type"],
            })

    for row in result:
        row["attachments"] = attachments_by_parent.get(row["docname"], [])

    return {
        "assessment_year": assessment_year,
        "from_date": settings_row.get("from_date"),
        "to_date": settings_row.get("to_date"),
        "enable_yearly_appraisal": bool(enable_yearly_appraisal),
        "evaluations": result
    }


@frappe.whitelist(methods=["GET"])
def get_goal_evaluation(user, year=None):
    return _fetch_evaluations(user, year, include_all_employees=False)


@frappe.whitelist(methods=["GET"])
def get_yearly_submission(user, year=None):
    return _fetch_evaluations(user, year, include_all_employees=True)

import frappe
from frappe.utils import flt
from frappe import _

@frappe.whitelist(methods=["POST"])
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

        if not employee_code or not year:
            frappe.throw(_("Employee code and year are required."))

        doc_name = frappe.db.get_value(
            "Goal Assessment",
            {"employee_code": employee_code, "year": year},
            "name"
        )
        if doc_name:
            doc = frappe.get_doc("Goal Assessment", doc_name)
        else:
            doc = frappe.new_doc("Goal Assessment")
            doc.employee_code = employee_code
            doc.year = year

        doc.manager = session_user

        if doc.status != "Evaluation Started":
            doc.status = "Evaluation Started"

        if "rating" in data:
            # The "rating" fieldtype stores a 0-1 fraction (5 stars = 1.0),
            # but the frontend works in a plain 1-5 star scale.
            doc.rating = flt(data.get("rating")) / 5
        if "comment" in data:
            doc.comment = data.get("comment")
        if "eligible_for_increment" in data:
            doc.eligible_for_increment = 1 if data.get("eligible_for_increment") else 0
        if "training_requirement_identified" in data:
            doc.training_requirement_identified = 1 if data.get("training_requirement_identified") else 0
        if "eligible_for_promotion" in data:
            doc.eligible_for_promotion = 1 if data.get("eligible_for_promotion") else 0

        for attachment in data.get("attachments") or []:
            if isinstance(attachment, str):
                file_url, document_type = attachment, ""
            else:
                file_url = attachment.get("file_url")
                document_type = attachment.get("document_type") or ""

            if not file_url:
                continue

            doc.append("table_mwyo", {
                "document_type": document_type,
                "attachment": file_url,
            })

        settings = frappe.get_single("PMS Settings")
        min_value = flt(settings.min_value or 10)
        max_value = flt(settings.max_value or 100)

        total_score = 0.0
        achieved_map = {}  
        for g in goals:
            goal_id = g.get("goal_name")
            achievement_score = flt(g.get("achievement_score") or 0)
            manual_achieved = flt(g.get("achieved") or 0)
            remark = g.get("remarks") or ""


            goal_row = next((row for row in doc.employee_goals if row.goal_id == goal_id), None)

            if not goal_row:
                continue  
            target = flt(goal_row.target)
            upwarddownward = (goal_row.upwarddownward or "").upper()
            weightage = flt(goal_row.weightage or 0)
            if goal_row.uom == "Text":
                achieved_score = manual_achieved
            else:
                achieved_score = 0
                if target > 0 and achievement_score > 0:
                    if upwarddownward == "U":
                        achieved_score = (achievement_score / target) * 100
                    elif upwarddownward == "D":
                        achieved_score = (target / achievement_score) * 100

            achieved_score = max(min_value, min(max_value, achieved_score))

            frappe.log_error(
                f"CALC DEBUG: goal_id={goal_id}, target={target}, "
                f"achievement_score={achievement_score}, upwarddownward={upwarddownward}, "
                f"achieved_score={achieved_score}",
                "Goal Evaluation Debug"
            )

            achieved_map[goal_id] = achieved_score   

            goal_row.achievement_score = achievement_score
            goal_row.achieved_score = achieved_score
            goal_row.remark = remark
            weighted_score = (achieved_score * weightage) / 100
            total_score += weighted_score
        doc.total_score = total_score

        doc.save(ignore_permissions=True, ignore_version=True)
        frappe.db.commit()

        return {
            "message": _("Goal Evaluation updated successfully."),
            "name": doc.name,
            "total_score": total_score,
            "achieved_scores": achieved_map,  
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Goal Evaluation Update Failed")
        frappe.throw(_("Failed to update goal evaluation."))



@frappe.whitelist(methods=["GET"])
def get_employee_goals(employee_code, year):
    try:
        goal_assessment = frappe.db.get_value(
            "Goal Assessment",
            {"employee_code": employee_code, "year": year},
            ["name", "comment"],
            as_dict=True
        )
        settings = frappe.get_single("PMS Settings")
        enable_goal_evaluation = settings.enable_goal_evaluation or False
        if not goal_assessment:
            return {"goals": [], "attachments": [], "comment": "","enable_goal_evaluation": enable_goal_evaluation}

        goals = frappe.db.sql("""
            SELECT 
                goal_name,
                goal_id,
                description,
                measurement_criteria,
                target,
                uom,
                weightage,             
                upwarddownward,              
                achievement_score,
                achieved_score as achieved,             
                remark
            FROM `tabEmployee Goals`
            WHERE parent = %s
        """, (goal_assessment.name,), as_dict=True)

        attachments = frappe.get_all(
            "File",
            filters={
                "attached_to_doctype": "Goal Assessment",
                "attached_to_name": goal_assessment.name
            },
            fields=["file_url", "file_name"]
        )

        return {
            "goals": goals,
            "attachments": attachments,
            "comment": goal_assessment.comment or "",
            "enable_goal_evaluation": enable_goal_evaluation
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_employee_goals_error")
        return {"error": str(e)}

import frappe
from frappe import _

@frappe.whitelist(methods=["POST"])
def submit_goal_evaluation(employee_code, year, comment=None):
  
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
    if doc.status == "Goal Submitted":
        frappe.throw(_("Please save the evaluation before submitting."))
    if doc.docstatus == 1:
        return {"message": "Goal Evaluation already submitted."}
    doc.status = "Evaluation Submitted"
    if comment:
        doc.comment = comment
    doc.flags.ignore_permissions = True

    doc.submit()

    frappe.db.commit()
    return {"message": "Goal Evaluation submitted successfully.", "docname": doc.name}


@frappe.whitelist(methods=["POST"])
def delete_goal_attachment(employee_code, year, file_url):
    """Delete an attachment from Goal Assessment (attachments section) and remove the File record."""
    try:
        if not employee_code or not year:
            frappe.throw(_("Employee code and year are required."))

        goal_assessment_name = frappe.db.get_value(
            "Goal Assessment",
            {"employee_code": employee_code, "year": year},
            "name"
        )

        if not goal_assessment_name:
            frappe.throw(_("Goal Assessment not found for the given employee and year."))

        file_name = file_url.split("/")[-1]
        doc = frappe.get_doc("Goal Assessment", goal_assessment_name)
        row_to_remove = next(
            (row for row in doc.table_mwyo if row.attachment and row.attachment.split("/")[-1] == file_name),
            None
        )
 
        if not row_to_remove:
            frappe.throw(_("Attachment not found in Goal Assessment."))
 
        doc.remove(row_to_remove)
        doc.save(ignore_permissions=True)

        files = frappe.get_all(
            "File",
            filters={"attached_to_doctype": "Goal Assessment", "attached_to_name": goal_assessment_name},
            fields=["name", "file_url", "file_name"]
        )

        for f in files:
            if f["file_name"] == file_name or f["file_url"].endswith(file_name):
                frappe.get_doc("File", f["name"]).delete(ignore_permissions=True)
                frappe.db.commit()
                return {"message": "Attachment deleted successfully.", "file_url": file_url}

        # frappe.throw(_("Attachment not found in Goal Assessment."))

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Goal Attachment Delete Failed")
        frappe.throw(str(e))



