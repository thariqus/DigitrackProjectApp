import frappe
from frappe import _

GOAL_BASED_QUERY = """
    SELECT
        ga.name AS docname,
        ga.employee_name,
        ga.employee_code,
        pe.designation_name,
        pe.band AS grade,
        pe.yearly_appraisal_employee,
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
        END AS status,
        ga.manager,
        JH.full_name AS manager_name,
        ga.manager_submitted_on AS submitted_on,
        COALESCE(ga.functional_manager_rating, 0) * 5 AS functional_manager_rating,
        ga.functional_manager_comment,
        FM.full_name AS functional_manager_name,
        ga.functional_manager_submitted_on,
        COALESCE(ga.skip_level_manager_rating, 0) * 5 AS skip_level_manager_rating,
        ga.skip_level_manager_comment,
        SM.full_name AS skip_level_manager_name,
        ga.skip_level_manager_submitted_on,
        COALESCE(ga.hr_rating, 0) * 5 AS hr_rating,
        ga.hr_comment,
        ga.hr_submitted_by,
        ga.hr_submitted_on
    FROM
        `tabGoal Assessment` ga
    LEFT JOIN
        `tabPMS Employees` pe
        ON pe.employee_code = ga.employee_code
    LEFT JOIN
        `tabJH User Master` JH
        ON JH.email = ga.manager
    LEFT JOIN
        `tabJH User Master` FM
        ON FM.email = pe.functional_manager_email
    LEFT JOIN
        `tabJH User Master` SM
        ON SM.email = pe.skip_level_manager_email
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
        COALESCE(ga.status, 'Evaluation Pending') AS status,
        ga.manager,
        JH.full_name AS manager_name,
        ga.manager_submitted_on AS submitted_on,
        COALESCE(ga.functional_manager_rating, 0) * 5 AS functional_manager_rating,
        ga.functional_manager_comment,
        FM.full_name AS functional_manager_name,
        ga.functional_manager_submitted_on,
        COALESCE(ga.skip_level_manager_rating, 0) * 5 AS skip_level_manager_rating,
        ga.skip_level_manager_comment,
        SM.full_name AS skip_level_manager_name,
        ga.skip_level_manager_submitted_on,
        COALESCE(ga.hr_rating, 0) * 5 AS hr_rating,
        ga.hr_comment,
        ga.hr_submitted_by,
        ga.hr_submitted_on
    FROM
        `tabPMS Employees` pe
    LEFT JOIN
        `tabGoal Assessment` ga
        ON ga.employee_code = pe.employee_code
        AND ga.year = %s
    LEFT JOIN
        `tabJH User Master` JH
        ON JH.email = ga.manager
    LEFT JOIN
        `tabJH User Master` FM
        ON FM.email = pe.functional_manager_email
    LEFT JOIN
        `tabJH User Master` SM
        ON SM.email = pe.skip_level_manager_email
    WHERE
        pe.manager_email = %s
        AND pe.pms_employee = 1
        AND pe.yearly_appraisal_employee = 1
"""

FUNCTIONAL_OR_SKIP_LEVEL_QUERY = """
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
        ga.status,
        ga.manager,
        JH.full_name AS manager_name,
        ga.manager_submitted_on AS submitted_on,
        COALESCE(ga.functional_manager_rating, 0) * 5 AS functional_manager_rating,
        ga.functional_manager_comment,
        FM.full_name AS functional_manager_name,
        ga.functional_manager_submitted_on,
        COALESCE(ga.skip_level_manager_rating, 0) * 5 AS skip_level_manager_rating,
        ga.skip_level_manager_comment,
        SM.full_name AS skip_level_manager_name,
        ga.skip_level_manager_submitted_on,
        CASE
            WHEN pe.functional_manager_email = %(user)s THEN 'functional'
            WHEN pe.skip_level_manager_email = %(user)s THEN 'skip_level'
            ELSE NULL
        END AS reviewer_role
    FROM
        `tabGoal Assessment` ga
    LEFT JOIN
        `tabPMS Employees` pe
        ON pe.employee_code = ga.employee_code
    LEFT JOIN
        `tabJH User Master` JH
        ON JH.email = ga.manager
    LEFT JOIN
        `tabJH User Master` FM
        ON FM.email = pe.functional_manager_email
    LEFT JOIN
        `tabJH User Master` SM
        ON SM.email = pe.skip_level_manager_email
    WHERE
        (
            (ga.status = 'Functional Manager Review' AND pe.functional_manager_email = %(user)s)
            OR (
                ga.status = 'Skip Level Manager Review'
                AND (pe.functional_manager_email = %(user)s OR pe.skip_level_manager_email = %(user)s)
            )
            OR (
                ga.status IN ('HR Review', 'HR Submitted', 'Evaluation Submitted')
                AND (pe.functional_manager_email = %(user)s OR pe.skip_level_manager_email = %(user)s)
            )
        )
        AND ga.year = %(year)s
    ORDER BY
        ga.creation DESC
"""

ALLOWED_EVALUATION_STATUSES = (
    "Evaluation Pending",
    "Evaluation Started",
    "Functional Manager Review",
    "Skip Level Manager Review",
    "HR Review",
    "HR Submitted",
    "Evaluation Submitted",
    "Goal Submitted",
)

HR_REVIEW_FIELDS = ("hr_rating", "hr_comment", "hr_submitted_by", "hr_submitted_on")


def _is_hr_review_released(status, year):
    """HR's review is shown only once Close Appraisal Cycle has submitted the evaluation."""
    from jh_digitrack.api.hr_submission import _is_cycle_closed_for_year

    return status == "Evaluation Submitted" and _is_cycle_closed_for_year(year)


def _hide_unreleased_hr_reviews(result, year):
    from jh_digitrack.api.hr_submission import _is_cycle_closed_for_year

    cycle_closed = _is_cycle_closed_for_year(year)
    for row in result:
        if not (cycle_closed and row.get("status") == "Evaluation Submitted"):
            for field in HR_REVIEW_FIELDS:
                row[field] = None


def _attach_documents(result):
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

def _get_evaluation_period(year):
    settings_row = frappe.db.get_value(
        "PMS Settings Table",
        {"parent": "PMS Settings", "is_current": 1},
        ["year", "from_date", "to_date"],
        as_dict=True
    )
    assessment_year = year or settings_row.get("year")
    enable_yearly_appraisal = frappe.db.get_single_value("PMS Settings", "enable_yearly_appraisal")
    return assessment_year, settings_row, enable_yearly_appraisal


def _evaluation_response(assessment_year, settings_row, enable_yearly_appraisal, evaluations):
    return {
        "assessment_year": assessment_year,
        "from_date": settings_row.get("from_date"),
        "to_date": settings_row.get("to_date"),
        "enable_yearly_appraisal": bool(enable_yearly_appraisal),
        "evaluations": evaluations,
    }


def _fetch_evaluations(user, year, include_all_employees):
    if not user:
        frappe.throw(_("User email is required"))

    assessment_year, settings_row, enable_yearly_appraisal = _get_evaluation_period(year)

    result = frappe.db.sql(
        GOAL_BASED_QUERY,
        (user, assessment_year, ALLOWED_EVALUATION_STATUSES),
        as_dict=True
    )

    if include_all_employees:
        result = [row for row in result if row.get("yearly_appraisal_employee")]

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

    for row in result:
        row.pop("yearly_appraisal_employee", None)

    _hide_unreleased_hr_reviews(result, assessment_year)
    _attach_documents(result)

    return _evaluation_response(assessment_year, settings_row, enable_yearly_appraisal, result)


@frappe.whitelist(methods=["GET"])
def get_goal_evaluation(user, year=None):
    return _fetch_evaluations(user, year, include_all_employees=False)


@frappe.whitelist(methods=["GET"])
def get_yearly_submission(user, year=None):
    return _fetch_evaluations(user, year, include_all_employees=True)

@frappe.whitelist(methods=["GET"])
def get_functional_or_skiplevel_yearly_submission(user, year=None):
    """
    Yearly submission list for functional/skip-level managers: only employees
    where the logged-in user is assigned as the functional manager or the
    skip-level manager (per PMS Employees), never just the reporting manager.
    """
    if not user:
        frappe.throw(_("User email is required"))

    assessment_year, settings_row, enable_yearly_appraisal = _get_evaluation_period(year)

    result = frappe.db.sql(
        FUNCTIONAL_OR_SKIP_LEVEL_QUERY,
        {"user": user, "year": assessment_year},
        as_dict=True
    )

    _attach_documents(result)

    return _evaluation_response(assessment_year, settings_row, enable_yearly_appraisal, result)

import frappe
from frappe.utils import flt
from frappe import _

@frappe.whitelist(methods=["POST"])
def create_goal_evaluation(data=None, session_user=None):
    """
    Save (without submitting) a Goal Assessment. The evaluation's current
    status decides who is saving and which fields are touched:
      - reporting manager (no pending functional/skip-level review): rating,
        comment, eligibility flags, goals and attachments, as before.
      - "Functional Manager Review": only functional_manager_rating/comment.
      - "Skip Level Manager Review": only skip_level_manager_rating/comment.
    The role is derived from the doc's own status/manager chain, never
    trusted from the client, so a functional/skip-level save can never
    overwrite the reporting manager's data (goals, attachments, total_score).
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)

        if not data:
            frappe.throw(_("No data received for goal assessment."))

        employee_code = data.get("employee_code")
        year = data.get("year")
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

        if doc.status in ("Functional Manager Review", "Skip Level Manager Review"):
            if doc.status == "Functional Manager Review":
                manager_field, rating_field, comment_field = (
                    "functional_manager_email", "functional_manager_rating", "functional_manager_comment",
                )
            else:
                manager_field, rating_field, comment_field = (
                    "skip_level_manager_email", "skip_level_manager_rating", "skip_level_manager_comment",
                )

            managers = _get_manager_chain(employee_code)
            if managers.get(manager_field) != session_user:
                frappe.throw(_("You are not authorized to review this employee."), frappe.PermissionError)

            if "rating" in data:
                # The "rating" fieldtype stores a 0-1 fraction (5 stars = 1.0),
                # but the frontend works in a plain 1-5 star scale.
                setattr(doc, rating_field, flt(data.get("rating")) / 5)
            if "comment" in data:
                setattr(doc, comment_field, data.get("comment"))

            doc.save(ignore_permissions=True, ignore_version=True)
            frappe.db.commit()

            return {
                "message": _("Goal Evaluation updated successfully."),
                "name": doc.name,
                "status": doc.status,
                "total_score": doc.total_score,
                "achieved_scores": {},
            }

        total_score = None
        achieved_map = {}
        goals = data.get("goals") or []
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
        if "goal_name_for_yearly_assesment" in data and not doc.goal_name_for_yearly_assesment:
            doc.goal_name_for_yearly_assesment = data.get("goal_name_for_yearly_assesment")

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
            "status": doc.status,
            "total_score": total_score if total_score is not None else doc.total_score,
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
            ["name", "comment", "status", "hr_comment"],
            as_dict=True
        )
        settings = frappe.get_single("PMS Settings")
        enable_goal_evaluation = settings.enable_goal_evaluation or False
        if not goal_assessment:
            return {"goals": [], "attachments": [], "comment": "", "hr_comment": "", "enable_goal_evaluation": enable_goal_evaluation}

        # HR can still change its comment until the appraisal cycle is closed,
        # so only expose it once the evaluation is submitted.
        hr_comment = (
            goal_assessment.hr_comment or ""
            if _is_hr_review_released(goal_assessment.status, year)
            else ""
        )

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
            "hr_comment": hr_comment,
            "enable_goal_evaluation": enable_goal_evaluation
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "get_employee_goals_error")
        return {"error": str(e)}

import frappe
from frappe import _


def _get_manager_chain(employee_code):
    """Reporting/functional/skip-level manager emails for an employee, from PMS Employees."""
    return frappe.db.get_value(
        "PMS Employees",
        employee_code,
        ["manager_email", "functional_manager_email", "skip_level_manager_email"],
        as_dict=True,
    ) or {}


def _status_after_manager_review(employee_code):
    """
    Next status once the reporting manager submits their review.
    If the functional manager is the same person as the reporting manager,
    the functional review stage is skipped; if the skip-level manager is
    also the same person, the skip-level stage is skipped too and the
    evaluation goes to HR review.
    """
    managers = _get_manager_chain(employee_code)
    manager_email = managers.get("manager_email")
    functional_email = managers.get("functional_manager_email")
    skip_level_email = managers.get("skip_level_manager_email")

    if functional_email and functional_email == manager_email:
        if skip_level_email and skip_level_email == functional_email:
            return "HR Review"
        return "Skip Level Manager Review"
    return "Functional Manager Review"


def _status_after_functional_review(employee_code):
    """
    Next status once the functional manager submits their review.
    If the skip-level manager is the same person as the functional manager,
    the skip-level stage is skipped and the evaluation goes to HR review.
    """
    managers = _get_manager_chain(employee_code)
    functional_email = managers.get("functional_manager_email")
    skip_level_email = managers.get("skip_level_manager_email")

    if skip_level_email and skip_level_email == functional_email:
        return "HR Review"
    return "Skip Level Manager Review"


def _finalize_or_save(doc, next_status):
    doc.status = next_status
    doc.flags.ignore_permissions = True
    if next_status == "Evaluation Submitted":
        doc.submit()
    else:
        doc.save()
    frappe.db.commit()


@frappe.whitelist(methods=["POST"])
def submit_goal_evaluation(employee_code, year, rating=None, comment=None):
    """
    Submit (advance the status of) a Goal Assessment. Which stage is being
    submitted, and by whom, is derived from the evaluation's own status:
      - "Functional Manager Review": requires the caller to be the
        employee's functional manager, and rating + comment are required.
      - "Skip Level Manager Review": requires the caller to be the
        employee's skip-level manager, and rating + comment are required.
      - anything else: the original reporting-manager submission, which
        only requires a comment (rating/eligibility flags are saved
        separately via create_goal_evaluation before this is called).
    """
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

    if doc.status == "Functional Manager Review":
        managers = _get_manager_chain(employee_code)
        if managers.get("functional_manager_email") != frappe.session.user:
            frappe.throw(_("You are not authorized to submit this review."), frappe.PermissionError)
        if not rating or flt(rating) <= 0:
            frappe.throw(_("Rating is required."))
        if not comment or not comment.strip():
            frappe.throw(_("Comment is required."))

        doc.functional_manager_rating = flt(rating) / 5
        doc.functional_manager_comment = comment
        doc.functional_manager_submitted_on = frappe.utils.now_datetime()

        next_status = _status_after_functional_review(employee_code)
        _finalize_or_save(doc, next_status)

        return {"message": "Functional manager review submitted successfully.", "docname": doc.name, "status": next_status}

    if doc.status == "Skip Level Manager Review":
        managers = _get_manager_chain(employee_code)
        if managers.get("skip_level_manager_email") != frappe.session.user:
            frappe.throw(_("You are not authorized to submit this review."), frappe.PermissionError)
        if not rating or flt(rating) <= 0:
            frappe.throw(_("Rating is required."))
        if not comment or not comment.strip():
            frappe.throw(_("Comment is required."))

        doc.skip_level_manager_rating = flt(rating) / 5
        doc.skip_level_manager_comment = comment
        doc.skip_level_manager_submitted_on = frappe.utils.now_datetime()

        # The evaluation is finalised (submitted) only after HR uploads its
        # rating/comment via the HR Submission Excel upload.
        _finalize_or_save(doc, "HR Review")

        return {"message": "Skip-level manager review submitted successfully.", "docname": doc.name, "status": "HR Review"}

    if doc.status == "Goal Submitted":
        frappe.throw(_("Please save the evaluation before submitting."))
    if comment:
        doc.comment = comment
    doc.manager_submitted_on = frappe.utils.now_datetime()

    next_status = _status_after_manager_review(employee_code)
    _finalize_or_save(doc, next_status)

    return {"message": "Goal Evaluation submitted successfully.", "docname": doc.name, "status": next_status}


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



