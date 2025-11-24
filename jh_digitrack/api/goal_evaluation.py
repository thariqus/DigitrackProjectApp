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
            COALESCE(total_score, 0) AS total_score,
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
from frappe.utils import flt
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

        if not employee_code or not year:
            frappe.throw(_("Employee code and year are required."))

        doc_name = frappe.db.get_value(
            "Goal Assessment",
            {"employee_code": employee_code, "year": year},
            "name"
        )
        if not doc_name:
            frappe.throw(_("Goal Assessment not found for Employee {0}, Year {1}").format(employee_code, year))

        doc = frappe.get_doc("Goal Assessment", doc_name)
        doc.manager = session_user

        if doc.status != "Evaluation Started":
            doc.status = "Evaluation Started"

        settings = frappe.get_single("JH Goal Settings")
        min_value = flt(settings.min_value or 10)
        max_value = flt(settings.max_value or 100)

        total_score = 0.0
        achieved_map = {}  
        for g in goals:
            goal_id = g.get("goal_name")
            achievement_score = flt(g.get("achievement_score") or 0)
            remark = g.get("remarks") or ""


            goal_row = next((row for row in doc.employee_goals if row.goal_id == goal_id), None)

            if not goal_row:
                continue  
            target = flt(goal_row.target)
            upwarddownward = (goal_row.upwarddownward or "").upper()
            weightage = flt(goal_row.weightage or 0)

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


import frappe

@frappe.whitelist(allow_guest=True)
def get_employee_goals(employee_code, year):
    try:
        goal_assessment = frappe.db.sql("""
            SELECT 
                name,
                attach1,
                attach2,
                attach3,
                comment                       
            FROM `tabGoal Assessment`
            WHERE employee_code = %s AND year = %s
            LIMIT 1
        """, (employee_code, year), as_dict=True)

        if not goal_assessment:
            return {"goals": [], "attachments": [], "comment": ""}

        goal_assessment = goal_assessment[0]

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

        attachments_query = """
            SELECT file_url, SUBSTRING_INDEX(file_url, '/', -1) AS file_name
            FROM (
                SELECT %(a1)s AS file_url
                UNION ALL
                SELECT %(a2)s
                UNION ALL
                SELECT %(a3)s
            ) AS files
            WHERE file_url IS NOT NULL AND file_url != ''
        """

        attachments = frappe.db.sql(attachments_query, {
            "a1": goal_assessment.attach1 or "",
            "a2": goal_assessment.attach2 or "",
            "a3": goal_assessment.attach3 or "",
        }, as_dict=True)

        return {"goals": goals, "attachments": attachments,"comment": goal_assessment.comment or ""}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_employee_goals_sql_error")
        return {"error": str(e)}




import frappe
from frappe import _

@frappe.whitelist()
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


import frappe
from frappe import _

@frappe.whitelist()
def submit_goal_evaluation(employee_code, year, goals=None, comment=None):

    if not employee_code or not year:
        frappe.throw(_("Employee code and year are required."))

    if isinstance(goals, str):
        goals = frappe.parse_json(goals)

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

    # ==========================
    # 🆕 UPDATE EMPLOYEE GOALS
    # ==========================
    if goals:
        doc.set("employee_goals", [])
        for g in goals:
            doc.append("employee_goals", {
                "goal_id": g.get("goal_id"),
                "description": g.get("description"),
                "measurement_criteria": g.get("measurement_criteria"),
                "target": g.get("target"),
                "uom": g.get("uom"),
                "achievement_score": g.get("achievement_score"),
                "achieved": g.get("achieved"),
                "remark": g.get("remark"),
                "upwarddownward": g.get("upwarddownward")
            })

    # ==========================
    # STATUS + COMMENT
    # ==========================
    doc.status = "Evaluation Submitted"

    if comment:
        doc.comment = comment

    doc.flags.ignore_permissions = True
    doc.submit()

    frappe.db.commit()
    return {"message": "Goal Evaluation submitted successfully.", "docname": doc.name}


import frappe
from frappe.utils.file_manager import save_file
from frappe import _
import mimetypes

ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx", "jpg", "jpeg", "png", "csv", "svg"}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "text/csv",
    "image/svg+xml",
}
@frappe.whitelist(allow_guest=False)
def upload_goal_attachment(employee_code, year):
    """Upload a single attachment and link it to the Goal Assessment."""
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

        files = frappe.request.files
        if not files:
            frappe.throw(_("No file received."))

        file_obj = list(files.values())[0]
        filename = file_obj.filename.lower()

        extension = filename.rsplit(".", 1)[-1] if "." in filename else ""
        if extension not in ALLOWED_EXTENSIONS:
            frappe.throw(_("File type not allowed: {0}").format(extension))

        detected_mime, _ = mimetypes.guess_type(filename)
        if detected_mime not in ALLOWED_MIME_TYPES:
            frappe.throw(_("Invalid or mismatched file format."))

        if file_obj.content_type not in ALLOWED_MIME_TYPES:
            frappe.throw(_("Invalid MIME type: {0}").format(file_obj.content_type))
        content = file_obj.read()
        if len(content) > 2 * 1024 * 1024:
            frappe.throw(_(f"{file_obj.filename} exceeds the 2MB limit."))
        file_obj.seek(0)

        saved_file = save_file(file_obj.filename, content, "Goal Assessment", goal_assessment_name)

        doc = frappe.get_doc("Goal Assessment", goal_assessment_name)
        if not doc.attach1:
            doc.attach1 = saved_file.file_url
        elif not doc.attach2:
            doc.attach2 = saved_file.file_url
        elif not doc.attach3:
            doc.attach3 = saved_file.file_url
        else:
            frappe.throw(_("Maximum 3 attachments allowed."))

        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return {
            "message": f"File {file_obj.filename} uploaded successfully.",
            "file_url": saved_file.file_url,
            "file_name": file_obj.filename
        }


    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Goal Attachment Upload Failed")
        if isinstance(e, frappe.ValidationError):
            raise
        frappe.throw(str(e))

@frappe.whitelist(allow_guest=False)
def delete_goal_attachment(employee_code, year, file_url):
    """Delete an attachment from Goal Assessment and clear the corresponding attach field."""
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

        doc = frappe.get_doc("Goal Assessment", goal_assessment_name)

        for field in ["attach1", "attach2", "attach3"]:
            if getattr(doc, field) == file_url:
                setattr(doc, field, None)
                frappe.db.sql("DELETE FROM `tabFile` WHERE file_url=%s", file_url)
                break
        else:
            frappe.throw(_("Attachment not found in record."))

        doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {"message": f"Attachment deleted successfully.", "file_url": file_url}

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Goal Attachment Delete Failed")
        frappe.throw(str(e))
