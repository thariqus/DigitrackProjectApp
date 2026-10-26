from io import BytesIO

import frappe
from frappe import _
from frappe.utils import flt
from frappe.utils.file_manager import save_file

ALLOWED_EXTENSIONS = {"xlsx", "xls"}
ALL_SUCCESS_MESSAGE = "All records have been successfully updated"

HEADER_ALIASES = {
    "employee_code": {"employee code", "emp code", "employee id", "emp id", "employee_code"},
    "manager_code": {"manager code", "mgr code", "manager id", "mgr id", "manager_code"},
    "hr_rating": {"hr rating", "rating", "hr_rating"},
    "hr_comment": {"hr comment", "comment", "comments", "remarks", "hr_comment"},
}


def _is_super_admin(user):
    return frappe.db.get_value("PMS Employees", {"employee_email": user}, "super_admin") == 1


def _is_yearly_appraisal_enabled():
    ae=bool(frappe.db.get_single_value("PMS Settings", "enable_yearly_appraisal"))
    print("Yearly Appraisal Enabled:", ae)
    return bool(frappe.db.get_single_value("PMS Settings", "enable_yearly_appraisal"))


def _get_current_settings_row():
    return frappe.db.get_value(
        "PMS Settings Table",
        {"parent": "PMS Settings", "is_current": 1},
        ["name", "year", "quaterly", "check_appraisal_cycle", "remark"],
        as_dict=True,
    )


def _closed_cycle_info(row):
    """Who closed the cycle, when, and the remarks. close_appraisal_cycle saves
    these inside the row's remark text as "<remarks>\nBy: <name>\nAt: <time>"."""
    remarks_lines, closed_by, closed_at = [], "", ""
    for line in (row.remark or "").splitlines():
        if line.startswith("By: "):
            closed_by = line[len("By: "):].strip()
        elif line.startswith("At: "):
            closed_at = line[len("At: "):].strip()
        else:
            remarks_lines.append(line)
    return {
        "year": row.year,
        "closed_by": closed_by,
        "closed_at": closed_at,
        "remarks": "\n".join(remarks_lines).strip(),
    }


def _is_cycle_closed_for_year(year):
    rows = frappe.get_all(
        "PMS Settings Table",
        filters={"parent": "PMS Settings", "year": year},
        fields=["check_appraisal_cycle"],
    )
    return bool(rows) and any(row.check_appraisal_cycle for row in rows)


def _normalize_header(value):
    text = str(value or "").strip().lower()
    text = text.replace("_", " ").replace("-", " ")
    return " ".join(text.split())


def _normalize_code(value):
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _read_excel_rows(content, extension):
    rows = []
    if extension == "xlsx":
        from openpyxl import load_workbook

        workbook = load_workbook(filename=BytesIO(content), data_only=True, read_only=True)
        sheet = workbook.active
        for row in sheet.iter_rows(values_only=True):
            rows.append(list(row))
    else:
        import xlrd

        workbook = xlrd.open_workbook(file_contents=content)
        sheet = workbook.sheet_by_index(0)
        for row_idx in range(sheet.nrows):
            rows.append(sheet.row_values(row_idx))
    return rows


def _map_columns(header_row):
    column_map = {}
    for idx, cell in enumerate(header_row):
        normalized = _normalize_header(cell)
        for key, aliases in HEADER_ALIASES.items():
            if key not in column_map and normalized in aliases:
                column_map[key] = idx
    return column_map


def _process_hr_excel(content, extension, year):
    rows = _read_excel_rows(content, extension)
    rows = [row for row in rows if any(cell not in (None, "") for cell in row)]

    if not rows:
        frappe.throw(_("The uploaded file is empty."))

    column_map = _map_columns(rows[0])

    missing = [key for key in ("employee_code", "manager_code", "hr_rating") if key not in column_map]
    if missing:
        frappe.throw(
            _("Could not find required column(s) in the uploaded file: {0}").format(
                ", ".join(missing)
            )
        )

    updated = 0
    skipped = []

    for row_num, row in enumerate(rows[1:], start=2):

        def cell(key):
            idx = column_map.get(key)
            return row[idx] if idx is not None and idx < len(row) else None

        employee_code = _normalize_code(cell("employee_code"))
        if not employee_code:
            continue

        manager_code_in_file = _normalize_code(cell("manager_code"))
        rating_value = cell("hr_rating")
        comment_value = cell("hr_comment")

        pms_employee = frappe.db.get_value(
            "PMS Employees", employee_code, ["name", "manager_code"], as_dict=True
        )
        if not pms_employee:
            skipped.append(
                {"row": row_num, "employee_code": employee_code, "reason": _("Employee code not found.")}
            )
            continue

        if not manager_code_in_file:
            skipped.append(
                {
                    "row": row_num,
                    "employee_code": employee_code,
                    "reason": _("Manager code is required."),
                }
            )
            continue

        if _normalize_code(pms_employee.manager_code) != manager_code_in_file:
            skipped.append(
                {
                    "row": row_num,
                    "employee_code": employee_code,
                    "reason": _("Manager code mismatch (file: {0}, on record: {1}).").format(
                        manager_code_in_file, pms_employee.manager_code
                    ),
                }
            )
            continue

        goal_assessment_name = frappe.db.get_value(
            "Goal Assessment", {"employee_code": employee_code, "year": year}, "name"
        )
        if not goal_assessment_name:
            skipped.append(
                {
                    "row": row_num,
                    "employee_code": employee_code,
                    "reason": _("No Goal Assessment found for {0}.").format(year),
                }
            )
            continue

        rating = flt(rating_value)
        if rating <= 0 or rating > 5:
            skipped.append(
                {
                    "row": row_num,
                    "employee_code": employee_code,
                    "reason": _("HR rating must be between 1 and 5."),
                }
            )
            continue

        doc = frappe.get_doc("Goal Assessment", goal_assessment_name)
        # HR is the last review stage: evaluations waiting for HR (HR Review) or
        # already HR-rated but not yet finalised (HR Submitted) can be updated.
        # HR rating/comment lock once Close Appraisal Cycle submits the evaluation.
        if doc.docstatus == 1 or doc.status == "Evaluation Submitted":
            skipped.append(
                {
                    "row": row_num,
                    "employee_code": employee_code,
                    "reason": _("Evaluation already submitted; HR rating and comment cannot be changed."),
                }
            )
            continue

        if doc.status not in ("HR Review", "HR Submitted"):
            skipped.append(
                {
                    "row": row_num,
                    "employee_code": employee_code,
                    "reason": _("Evaluation is not ready for HR review (current status: {0}).").format(
                        doc.status or "-"
                    ),
                }
            )
            continue

        # The "Rating" fieldtype stores a 0-1 fraction (5 stars = 1.0), but the
        # uploaded sheet works in a plain 1-5 scale, matching the manager/
        # functional-manager/skip-level-manager rating fields on this doctype.
        # doc.hr_rating = rating / 5
        # if comment_value not in (None, ""):
        #     doc.hr_comment = str(comment_value).strip()

        # # "Eval Started" on the reports; finalised when the appraisal cycle is closed
        # doc.status = "HR Submitted"
        doc.hr_rating = rating / 5

        if comment_value not in (None, ""):
            doc.hr_comment = str(comment_value).strip()

        # Store the HR user who submitted the review
        user = frappe.session.user

        doc.hr_submitted_by = frappe.db.get_value(
            "User",
            user,
            "full_name"
        ) or user

        # Store the date and time of HR submission
        doc.hr_submitted_on = frappe.utils.now_datetime()

        # "Eval Started" on the reports; finalised when the appraisal cycle is closed
        doc.status = "HR Submitted"
        doc.save(ignore_permissions=True, ignore_version=True)
        updated += 1

    return {
        "total_rows": len(rows) - 1,
        "updated": updated,
        "skipped": skipped,
    }


@frappe.whitelist(methods=["GET"])
def has_super_admin_role():
    user = frappe.session.user
    if user == "Guest":
        return {"has_access": False}
    return {"has_access": bool(_is_super_admin(user))}


@frappe.whitelist(methods=["GET"])
def get_hr_submission_access():
    user = frappe.session.user
    if user == "Guest":
        return {"has_access": False, "yearly_appraisal_enabled": False, "cycle_closed": False}

    current_row = _get_current_settings_row()
    cycle_closed = bool(current_row and current_row.check_appraisal_cycle)
    return {
        "has_access": bool(_is_super_admin(user)),
        "yearly_appraisal_enabled": _is_yearly_appraisal_enabled(),
        "cycle_closed": cycle_closed,
        "closed_info": _closed_cycle_info(current_row) if cycle_closed else None,
    }


@frappe.whitelist(methods=["GET"])
def download_hr_template():
    """Blank HR review sheet with the headers submit_hr_excel expects."""
    if not _is_super_admin(frappe.session.user):
        frappe.throw(_("You are not allowed to download the HR template."), frappe.PermissionError)

    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.worksheet.datavalidation import DataValidation
    from werkzeug.wrappers import Response

    wb = Workbook()
    ws = wb.active
    ws.title = "HR Review"

    headers = ["Emp ID", "Manager ID", "HR Rating", "HR Comment"]
    ws.append(headers)
    header_fill = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    for col, width in zip("ABCD", (15, 15, 12, 60)):
        ws.column_dimensions[col].width = width
    ws.freeze_panes = "A2"

    # Codes as text so Excel keeps them exactly as typed
    for row in ws.iter_rows(min_row=2, max_row=1000, min_col=1, max_col=2):
        for cell in row:
            cell.number_format = "@"

    rating_rule = DataValidation(
        type="whole",
        operator="between",
        formula1="1",
        formula2="5",
        showErrorMessage=True,
        errorTitle="Invalid HR Rating",
        error="HR Rating must be a whole number from 1 to 5.",
        showInputMessage=True,
        promptTitle="HR Rating",
        prompt="Enter a rating from 1 to 5.",
    )
    ws.add_data_validation(rating_rule)
    rating_rule.add("C2:C1000")

    output = BytesIO()
    wb.save(output)

    response = Response(output.getvalue())
    response.headers["Content-Type"] = \
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    response.headers["Content-Disposition"] = 'attachment; filename="HR_Review_Template.xlsx"'
    return response


@frappe.whitelist(methods=["GET"])
def get_pending_reviews(year=None):
    """Evaluations for the year that will NOT be submitted when the appraisal
    cycle is closed (HR has not uploaded for them yet), shown as a warning."""
    if not _is_super_admin(frappe.session.user):
        frappe.throw(_("You are not allowed to view pending reviews."))

    if not year:
        current_row = _get_current_settings_row()
        year = current_row.year if current_row else None
    if not year:
        frappe.throw(_("Year is required."))

    return frappe.get_all(
        "Goal Assessment",
        filters={"year": year, "status": ["not in", ["HR Submitted", "Evaluation Submitted"]]},
        fields=["employee_code", "employee_name", "status"],
        order_by="status asc, employee_code asc",
    )


@frappe.whitelist(methods=["POST"])
def close_appraisal_cycle():
    user = frappe.session.user
    if not _is_super_admin(user):
        frappe.throw(_("You are not allowed to close the appraisal cycle."))

    current_row = _get_current_settings_row()
    if not current_row:
        frappe.throw(_("No current appraisal period is configured in PMS Settings."))

    if current_row.check_appraisal_cycle:
        frappe.throw(_("The appraisal cycle for {0} is already closed.").format(current_row.year))
    remarks = (frappe.form_dict.get("remarks") or "").strip()

    if len(remarks) < 3:
        frappe.throw(_("Remarks must contain at least 3 characters."))

    # Get the user who closed the appraisal cycle
    user_name = frappe.db.get_value(
        "User",
        frappe.session.user,
        "full_name"
    ) or frappe.session.user

    # Get current date and time
    timestamp = frappe.utils.now_datetime().strftime("%d-%m-%Y %I:%M %p")

    # Save remark with user and time
    remarks_with_details = (
        f"{remarks}\n"
        f"By: {user_name}\n"
        f"At: {timestamp}"
    )    
    # Finalise every evaluation HR has rated ("Eval Started" -> "Eval Submitted").
    # Evaluations still in an earlier stage are left as they are. All-or-nothing:
    # any failure rolls back the whole close.
    submitted = 0
    for name in frappe.get_all(
        "Goal Assessment",
        filters={"year": current_row.year, "status": "HR Submitted", "docstatus": 0},
        pluck="name",
    ):
        doc = frappe.get_doc("Goal Assessment", name)
        doc.status = "Evaluation Submitted"
        doc.flags.ignore_permissions = True
        doc.submit()
        submitted += 1

    frappe.db.set_value(
        "PMS Settings Table",
        current_row.name,
        {
            "check_appraisal_cycle": 1,
            "remark": remarks_with_details,
        }
    )
    frappe.db.commit()

    return {
        "year": current_row.year,
        "quaterly": current_row.quaterly,
        "cycle_closed": True,
        "evaluations_submitted": submitted,
        "closed_by": user_name,
        "closed_at": timestamp,
        "remarks": remarks,
    }


@frappe.whitelist(methods=["POST"])
def submit_hr_excel():
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("You must be logged in to upload files."))

    if not _is_super_admin(user):
        frappe.throw(_("You are not allowed to submit HR data."))

    if not _is_yearly_appraisal_enabled():
        frappe.throw(_("Yearly Appraisal is not enabled in PMS Settings."))

    current_row = _get_current_settings_row()
    if current_row and current_row.check_appraisal_cycle:
        frappe.throw(_("The appraisal cycle for {0} is closed.").format(current_row.year))

    year = frappe.form_dict.get("year")
    if not year:
        frappe.throw(_("Year is required."))

    upload = frappe.request.files.get("file")
    if not upload:
        frappe.throw(_("Please select a file to upload."))

    extension = upload.filename.rsplit(".", 1)[-1].lower() if "." in upload.filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        frappe.throw(_("Only Excel files (.xlsx, .xls) are allowed."))

    content = upload.stream.read()

    # result = _process_hr_excel(content, extension, year)

    # doc = frappe.get_doc(
    #     {
    #         "doctype": "JH HR Submission",
    #         "assessment_year": year,
    #         "uploaded_by": user,
    #     }
    # )
    result = _process_hr_excel(content, extension, year)

    # Create Result text using pipe (|)
    result_lines = [
        "Row | Employee Code | Reason"
    ]

    for item in result.get("skipped", []):
        result_lines.append(
            f'{item.get("row", "")} | '
            f'{item.get("employee_code", "")} | '
            f'{item.get("reason", "")}'
        )

    result_text = "\n".join(result_lines)

    # Every data row was applied — store a plain success message instead of an empty table
    if result["total_rows"] > 0 and not result.get("skipped") and result["updated"] == result["total_rows"]:
        result_text = ALL_SUCCESS_MESSAGE

    doc = frappe.get_doc(
        {
            "doctype": "JH HR Submission",
            "assessment_year": year,
            "uploaded_by": user,
            "result": result_text,
        }
    )    
    doc.insert(ignore_permissions=True)

    file_doc = save_file(
        upload.filename,
        content,
        "JH HR Submission",
        doc.name,
        is_private=1,
        df="attachment",
    )

    doc.attachment = file_doc.file_url
    doc.save(ignore_permissions=True)

    frappe.db.commit()

    return {
        "name": doc.name,
        "file_name": file_doc.file_name,
        "file_url": file_doc.file_url,
        "total_rows": result["total_rows"],
        "updated": result["updated"],
        "skipped": result["skipped"],
    }


@frappe.whitelist(methods=["GET"])
def get_hr_submissions(year=None):
    user = frappe.session.user
    if not _is_super_admin(user):
        frappe.throw(_("You are not allowed to view HR submissions."))

    filters = {}
    if year:
        filters["assessment_year"] = year

    return frappe.get_all(
        "JH HR Submission",
        filters=filters,
        fields=[
            "name",
            "assessment_year",
            "attachment",
            "uploaded_by",
            "creation",
            "result",
        ],        
        order_by="creation desc",
    )


# @frappe.whitelist(methods=["POST"])
# def delete_hr_submission(name):
#     user = frappe.session.user
#     if not _is_super_admin(user):
#         frappe.throw(_("You are not allowed to delete HR submissions."))

#     if not name:
#         frappe.throw(_("HR Submission name is required."))

#     if not frappe.db.exists("JH HR Submission", name):
#         frappe.throw(_("HR Submission not found."))

#     assessment_year = frappe.db.get_value("JH HR Submission", name, "assessment_year")
#     if _is_cycle_closed_for_year(assessment_year):
#         frappe.throw(_("The appraisal cycle for {0} is closed.").format(assessment_year))

#     file_url = frappe.db.get_value("JH HR Submission", name, "attachment")

#     frappe.delete_doc("JH HR Submission", name, ignore_permissions=True, force=True)

#     if file_url:
#         for file_name in frappe.get_all("File", filters={"file_url": file_url}, pluck="name"):
#             frappe.delete_doc("File", file_name, ignore_permissions=True, force=True)

#     frappe.db.commit()

#     return {"deleted": name}
