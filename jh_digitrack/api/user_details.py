import frappe
from frappe import _
import requests
import json
import csv
import re
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO, StringIO
from datetime import datetime, timedelta
from frappe.utils.file_manager import save_file


HRMS_BASE_URL = frappe.conf.get("hrms_base_url")
USERNAME = frappe.conf.get("hrms_api_username")
PASSWORD = frappe.conf.get("hrms_api_password")
APINO = frappe.conf.get("api_no")
DATE_FORMAT = "%Y-%m-%d"

def is_scheduler_allowed():
    return frappe.db.get_single_value(
        "Configuration Settings",
        "allow_scheduler"
    )
@frappe.whitelist(methods=["POST"])
def get_access_token():
    """Fetch access token from HRMS and trigger data fetch."""
    if not is_scheduler_allowed():
        frappe.log_error(
            title="HRMS Scheduler Disabled",
            message="HRMS Scheduler skipped because allow_scheduler is unchecked in Configuration Settings"
        )
        return
    try:
        url = f"{HRMS_BASE_URL}/AdrenalinToken"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "username": USERNAME,
            "password": PASSWORD,
            "grant_type": "password"
        }
        response = requests.post(url, headers=headers, data=data, timeout=30)
        
        access_token = response.json().get("access_token")
        if not access_token:
            frappe.log_error("Access token not found", response.text)
            frappe.throw(_("Could not retrieve access token from HRMS"))

        fetch_hr_data(access_token)

    except requests.exceptions.RequestException as e:
        frappe.log_error(f"HRMS Access Token Request Error: {str(e)}", frappe.get_traceback())
        frappe.throw(_("Failed to connect to HRMS server"))
    except Exception:
        frappe.log_error("HRMS Access Token Error", frappe.get_traceback())
        frappe.throw(_("Unexpected error while fetching HRMS access token"))




"""Fetch HR data from HRMS and update HRMS Users in ERPNext."""
@frappe.whitelist(methods=["POST"])
def fetch_hr_data(token):

    end_date = datetime.today()
    start_date = end_date - timedelta(days=90)
    start_str = start_date.strftime("%d-%b-%Y").lower()
    end_str = end_date.strftime("%d-%b-%Y").lower()
    try:

        url = f"{HRMS_BASE_URL}/HRdata/Getdata/"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        payload = [{
            "Apino": APINO,
            "Param": f"{start_str}~{end_str}"
        }]
        response = requests.post(url, headers=headers, json=payload, timeout=60)

        hr_data = response.json()
        frappe.log_error("External HR API Response", json.dumps(hr_data, indent=2))

        new_users = hr_data[0].get("Data", {}).get("Employee Data", [])
        if not new_users or all(not user for user in new_users):
            frappe.throw(_("No employee data received from HRMS — existing records kept intact"))
            return

        frappe.db.sql("DELETE FROM `tabHRMS Users`")
        for emp in new_users:

            doc = frappe.new_doc("HRMS Users")
            for field, value in map_employee_fields(emp).items():
                
                setattr(doc, field, value)
            doc.insert(ignore_permissions=True)

        frappe.db.commit()
        run_post_hrms_sync()

    except requests.exceptions.RequestException as e:
        frappe.db.rollback()
        frappe.log_error(f"HRMS Data Fetch Request Error: {str(e)}", frappe.get_traceback())
        frappe.throw(_("Failed to fetch HR data from HRMS"))

    except Exception:
        frappe.db.rollback()
        frappe.log_error("HRMS Data Fetch Error", frappe.get_traceback())
        frappe.throw(_("Unexpected error while fetching HRMS data"))


def map_employee_fields(emp):
    """Map HRMS API employee fields to ERPNext HRMS Users fields."""
    gender_map = {"M": "Male", "F": "Female"}
    return {
        "employee_code": emp.get("EMPLOYEE_CODE"),
        "first_name": emp.get("FIRST_NAME"),
        "last_name": emp.get("LAST_NAME"),
        "middle_name": emp.get("MIDDLE_NAME"),
        "company_name": emp.get("COMPANY_NAME"),
        "mobile_no": emp.get("WORK_TELEPHONE_NO"),
        "date_of_joining": format_date(emp.get("DATE_OF_JOINING")),
        "dob": format_date(emp.get("DOB")),
        "gender": gender_map.get(emp.get("GENDER"), emp.get("GENDER") or "N/A"),
        "mail_id": emp.get("MAIL_ID"),
        "reporting_manager": emp.get("REPORTING_MANAGER"),
        "funcational_reporting_manager": emp.get("FUNCATIONAL_REPORTING_MANAGER"),
        "skip_level_reporting_manager": emp.get("SKIP_LEVEL_REPORTING_MANAGER"),
        "ou_name": emp.get("OU_NAME"),
        "department_name": emp.get("DEPARTMENT_NAME"),
        "location_name": emp.get("LOCATION_NAME"),
        "designation_name": emp.get("DESIGNATION_NAME"),
        "grade_name": emp.get("GRADE_NAME"),
        "region": emp.get("REGION"),
        "country": emp.get("COUNTRY"),
        "city": emp.get("CITY"),
        "desk_no": emp.get("EXTENSION_NO"),
        "position": emp.get("POSITION"),
        "cost_center": emp.get("COST_CENTER"),
        "pay_group": emp.get("PAY_GROUP"),
        "employee_status": emp.get("EMPLOYEE_STATUS"),
        "vis_expiry_date": emp.get("vis_expiryDate"),
        "ic_valid_till_date": emp.get("lc_valid_till_date"),
        "active": emp.get("ACTIVE"),
        "effctive_from": emp.get("EFFCTIVE_FROM"),
        "created_on": emp.get("CREATED_ON"),
        "created_by": emp.get("CREATED_BY"),
        "modified_on": emp.get("MODIFIED_ON"),
        "modified_by1": emp.get("MODIFIED_BY"),
        "company_sponsor": emp.get("COMPANY_SPONSOR"),
        "visa_designation": emp.get("Visa_Designation"),
        "passport_number": emp.get("Passport_Number"),
        "passport_expiry_date": emp.get("Passport_Expiry_Date"),
        "personal_code": emp.get("Personal_Code"),
        "work_permit_number": emp.get("WORK_PERMIT_NUMBER"),
        "nationality": emp.get("NATIONALITY"),
        "eid_number": emp.get("EID_NUMBER"),
        "entity_name": emp.get("ENTITY_NAME"),
        "coi_expiry_date": emp.get("COI_Expiry_Date"),
        "coi_no": emp.get("COI_No"),
        "vis_sponsor": emp.get("VIS_SPONSOR"),
        "emp_salutation": emp.get("EMP_SALUTATION"),
        "emp_confirmationdate": emp.get("EMP_CONFIRMATIONDATE"),
        "emp_confirmation_due_on": emp.get("EMP_CONFIRMATION_DUE_ON"),
        "emp_notice_period": emp.get("EMP_NOTICE_PERIOD"),
        "cost_center_name": emp.get("COST_CENTER_NAME"),
        "employee_job_status": emp.get("EMPLOYEE_JOB_STATUS"),
    }

def format_date(value):
    """Return date in DD-MM-YYYY format from YYYY-MM-DD or datetime string."""
    if not value:
        return None
    try:
        date_str = value.split("T")[0] if "T" in value else value
        dt = datetime.strptime(date_str, DATE_FORMAT)
        return dt.strftime("%d-%m-%Y")
    except Exception:
        return value

@frappe.whitelist(methods=["GET"])
def has_pms_role(email=None):
    if not email:
        frappe.throw(_("Email is required"))

    result = frappe.db.sql(
        """
        SELECT COUNT(*) 
        FROM `tabHas Role`
        WHERE parent=%s AND role='PMS User'
        """,
        (email,),
        as_dict=True,
    )

    has_access = result[0]["COUNT(*)"] > 0 if result else False

    return {"message": {"has_access": has_access}}


@frappe.whitelist(methods=["GET"])
def has_jrc_permission(email=None):
    if not email:
        frappe.throw(_("Email is required"))

    # Role-based check used for upload-only controls in JRC page.
    has_access = _has_jrc_permission_role(email)
    return {"message": {"has_access": has_access}}


def _get_session_email():
    # Resolve login user to JH User Master email; fallback keeps API working for non-mapped users.
    user_email = frappe.db.get_value("JH User Master", {"user": frappe.session.user}, "email")
    return user_email or frappe.session.user


def _get_user_identity_emails():
    """Collect all possible email identities for current user for permission matching."""
    identity_emails = set()

    resolved_email = (_get_session_email() or "").strip().lower()
    if resolved_email and "@" in resolved_email:
        identity_emails.add(resolved_email)

    session_user = (frappe.session.user or "").strip().lower()
    if session_user and "@" in session_user:
        identity_emails.add(session_user)

    user_doc_email = (frappe.db.get_value("User", frappe.session.user, "email") or "").strip().lower()
    if user_doc_email and "@" in user_doc_email:
        identity_emails.add(user_doc_email)

    return identity_emails


def _has_jrc_permission_role(email):
    # Check both email and session user because Has Role parent may be stored in either format.
    session_user = frappe.session.user or ""
    parent_values = [email]
    if session_user and session_user != email:
        parent_values.append(session_user)

    placeholders = ", ".join(["%s"] * len(parent_values))
    result = frappe.db.sql(
        f"""
        SELECT COUNT(*) as role_count
        FROM `tabHas Role`
        WHERE role='JRC Permission' AND parent IN ({placeholders})
        """,
        tuple(parent_values),
        as_dict=True,
    )
    return bool(result and (result[0].get("role_count") or 0) > 0)


def _has_jrc_table_access(email):
    # Table/preview is open to all authenticated users.
    return bool(frappe.session.user and frappe.session.user != "Guest")


def _get_or_create_latest_jrc_files_doc():
    # Prefer the canonical parent document name if it exists.
    # This keeps upload/read APIs aligned even when doctype mode changes over time.
    if frappe.db.exists("JRC files", "JRC files"):
        return frappe.get_doc("JRC files", "JRC files")

    # Single doctype must always resolve to the fixed document name "JRC files".
    jrc_meta = frappe.get_meta("JRC files")
    if jrc_meta.issingle:
        return frappe.get_doc("JRC files")

    # Non-single fallback path (kept for backward compatibility).
    parent_rows = frappe.get_all(
        "JRC files",
        fields=["name"],
        order_by="modified desc",
        limit_page_length=1,
    )
    if parent_rows:
        return frappe.get_doc("JRC files", parent_rows[0]["name"])

    parent_doc = frappe.new_doc("JRC files")
    parent_doc.insert(ignore_permissions=True)
    return parent_doc


def _resolve_jrc_dmail_table_field():
    """Resolve distribute-mail child table field on JRC files doctype."""
    jrc_files_meta = frappe.get_meta("JRC files")
    if jrc_files_meta.has_field("dmail"):
        return "dmail"
    frappe.throw(_("JRC files doctype does not have dmail child table field."))


def _upload_file_to_jrc_child_table(upload, child_table_field):
    # Shared uploader used by both primary (test) and distribute-mail (dmail) upload APIs.
    parent_doc = _get_or_create_latest_jrc_files_doc()

    # Child row stores metadata; actual binary file is attached to that child row via File doctype.
    child_data = {}
    jrc_meta = frappe.get_meta("JRC Uploads")
    if jrc_meta.has_field("test"):
        child_data["test"] = upload.filename
    if jrc_meta.has_field("date"):
        child_data["date"] = frappe.utils.today()

    parent_doc.append(child_table_field, child_data)
    parent_doc.save(ignore_permissions=True)
    jrc_upload_row = parent_doc.get(child_table_field)[-1]

    file_doc = save_file(
        upload.filename,
        upload.stream.read(),
        "JRC Uploads",
        jrc_upload_row.name,
        is_private=0,
    )

    # Persist file URL into child table field "test" so frontend can resolve it.
    if jrc_meta.has_field("test"):
        jrc_upload_row.test = file_doc.file_url
        if jrc_meta.has_field("date"):
            jrc_upload_row.date = frappe.utils.today()
        parent_doc.save(ignore_permissions=True)

    return {
        "jrc_files_name": parent_doc.name,
        "jrc_upload_name": jrc_upload_row.name,
        "file_name": file_doc.file_name,
        "file_url": file_doc.file_url,
        "date": jrc_upload_row.get("date") if hasattr(jrc_upload_row, "get") else getattr(jrc_upload_row, "date", None),
    }


@frappe.whitelist()
def upload_jrc_file():
    if frappe.session.user == "Guest":
        frappe.throw(_("You must be logged in to upload files."))

    upload = frappe.request.files.get("file")
    if not upload:
        frappe.throw(_("Please select a file to upload."))

    user_email = _get_session_email()
    # Upload is restricted to users who have the "JRC Permission" role.
    upload_access = _has_jrc_permission_role(user_email)
    if not upload_access:
        frappe.throw(_("You are not allowed to upload files in JRC Permission."))

    # Main JRC permission upload goes to child table field "test".
    return _upload_file_to_jrc_child_table(upload=upload, child_table_field="test")


@frappe.whitelist()
def upload_jrc_dmail_file():
    if frappe.session.user == "Guest":
        frappe.throw(_("You must be logged in to upload files."))

    upload = frappe.request.files.get("file")
    if not upload:
        frappe.throw(_("Please select a file to upload."))

    user_email = _get_session_email()
    upload_access = _has_jrc_permission_role(user_email)
    if not upload_access:
        frappe.throw(_("You are not allowed to upload distribute mail files in JRC Permission."))

    # Distribute-mail upload is stored in dmail table.
    dmail_table_field = _resolve_jrc_dmail_table_field()
    return _upload_file_to_jrc_child_table(upload=upload, child_table_field=dmail_table_field)


@frappe.whitelist(methods=["GET"])
def search_jh_user_master_employees(query=None, limit=10):
    user_email = _get_session_email()
    if not _has_jrc_table_access(user_email):
        frappe.throw(_("You are not allowed to search employees."))

    search_text = (query or "").strip()
    if len(search_text) < 2:
        return {"message": {"employees": []}}

    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = 10
    limit = max(1, min(limit, 50))

    like_text = f"%{search_text}%"
    rows = frappe.db.sql(
        """
        SELECT
            employee_code,
            full_name,
            first_name,
            middle_name,
            last_name,
            email
        FROM `tabJH User Master`
        WHERE IFNULL(email, '') != ''
          AND (
              IFNULL(full_name, '') LIKE %(like_text)s
              OR IFNULL(first_name, '') LIKE %(like_text)s
              OR IFNULL(middle_name, '') LIKE %(like_text)s
              OR IFNULL(last_name, '') LIKE %(like_text)s
              OR IFNULL(employee_code, '') LIKE %(like_text)s
          )
        ORDER BY modified DESC
        LIMIT %(limit)s
        """,
        {"like_text": like_text, "limit": limit * 3},
        as_dict=True,
    )

    employees = []
    seen = set()
    for row in rows:
        email = (row.get("email") or "").strip()
        if not email:
            continue
        # Deduplicate by email to avoid repeated names from multiple JH User Master rows.
        key = email.lower()
        if key in seen:
            continue
        seen.add(key)

        name_parts = [
            (row.get("first_name") or "").strip(),
            (row.get("middle_name") or "").strip(),
            (row.get("last_name") or "").strip(),
        ]
        fallback_name = " ".join(part for part in name_parts if part).strip()
        employee_name = (row.get("full_name") or "").strip() or fallback_name or (row.get("employee_code") or "").strip() or email

        employees.append(
            {
                "employee_name": employee_name,
                "email": email,
                "employee_code": row.get("employee_code") or "",
            }
        )

        if len(employees) >= limit:
            break

    return {"message": {"employees": employees}}


@frappe.whitelist(methods=["GET"])
def get_jrc_upload_preview(file_url=None, limit=None):
    if not file_url:
        frappe.throw(_("File URL is required."))

    user_email = _get_session_email()
    has_access = _has_jrc_table_access(user_email)
    if not has_access:
        frappe.throw(_("You are not allowed to preview uploaded files."))
    can_view_all = _has_jrc_permission_role(user_email)
    identity_emails = _get_user_identity_emails()

    # Default to full sheet so folder filtering is based on complete data.
    # UI can still pass an explicit limit when a bounded preview is needed.
    try:
        parsed_limit = int(limit) if limit is not None else None
    except (TypeError, ValueError):
        parsed_limit = None

    effective_limit = None if (parsed_limit is None or parsed_limit <= 0) else max(1, min(parsed_limit, 50000))

    # Build a lightweight Excel preview (headers + limited rows) for frontend table rendering.
    headers, rows = _build_excel_preview_from_file_url(file_url=file_url, limit=effective_limit)
    # Non-role users are restricted to folders where their email is present.
    rows = _filter_jrc_rows_by_user_email(
        headers=headers,
        rows=rows,
        user_email=user_email,
        can_view_all=can_view_all,
        identity_emails=identity_emails,
    )
    # Add a display-friendly Name column by resolving Email from JH User Master.
    headers, rows = _append_jrc_name_column_from_email(headers, rows)
    return {"message": {"headers": headers, "rows": rows}}


@frappe.whitelist(methods=["GET"])
def get_latest_jrc_upload_preview(limit=None):
    user_email = _get_session_email()
    has_access = _has_jrc_table_access(user_email)
    if not has_access:
        frappe.throw(_("You are not allowed to preview uploaded files."))
    can_view_all = _has_jrc_permission_role(user_email)
    identity_emails = _get_user_identity_emails()

    # Default to full sheet so folder filtering is based on complete data.
    # UI can still pass an explicit limit when a bounded preview is needed.
    try:
        parsed_limit = int(limit) if limit is not None else None
    except (TypeError, ValueError):
        parsed_limit = None

    effective_limit = None if (parsed_limit is None or parsed_limit <= 0) else max(1, min(parsed_limit, 50000))

    # Resolve latest valid Excel from main upload table.
    latest_main_upload = _get_latest_jrc_child_upload_meta("test")
    try:
        dmail_table_field = _resolve_jrc_dmail_table_field()
        latest_dmail_upload = _get_latest_jrc_child_upload_meta(dmail_table_field)
    except Exception:
        # Keep API backward compatible in sites where dmail field is not configured.
        latest_dmail_upload = {
            "file_url": "",
            "file_name": "",
            "jrc_upload_name": "",
            "jrc_files_name": "",
            "date": "",
            "table_field": "",
        }

    if not latest_main_upload.get("file_url"):
        return {
            "message": {
                "headers": [],
                "rows": [],
                "file_url": "",
                "file_name": "",
                "jrc_upload_name": "",
                "jrc_files_name": "",
                "date": "",
                # Expose latest dmail upload metadata so frontend can show it by default.
                "dmail_upload": latest_dmail_upload,
            }
        }

    # If newest row points to a broken/non-Excel file, fallback to the next valid candidate.
    headers, rows = _build_excel_preview_from_file_url(
        file_url=latest_main_upload["file_url"],
        limit=effective_limit,
        silent_invalid=True,
    )
    if headers is None and rows is None:
        latest_main_upload = _get_latest_valid_jrc_excel_upload_meta("test", effective_limit)
        if not latest_main_upload.get("file_url"):
            return {
                "message": {
                    "headers": [],
                    "rows": [],
                    "file_url": "",
                    "file_name": "",
                    "jrc_upload_name": "",
                    "jrc_files_name": "",
                    "date": "",
                    "dmail_upload": latest_dmail_upload,
                }
            }
        headers, rows = _build_excel_preview_from_file_url(
            file_url=latest_main_upload["file_url"],
            limit=effective_limit,
        )
    # Apply same folder-scope visibility in latest preview API.
    rows = _filter_jrc_rows_by_user_email(
        headers=headers,
        rows=rows,
        user_email=user_email,
        can_view_all=can_view_all,
        identity_emails=identity_emails,
    )
    # Keep Name column available in latest preview response as well.
    headers, rows = _append_jrc_name_column_from_email(headers, rows)

    return {
        "message": {
            "headers": headers,
            "rows": rows,
            "file_url": latest_main_upload.get("file_url", ""),
            "file_name": latest_main_upload.get("file_name", ""),
            "jrc_upload_name": latest_main_upload.get("jrc_upload_name", ""),
            "jrc_files_name": latest_main_upload.get("jrc_files_name", ""),
            "date": latest_main_upload.get("date"),
            # Expose latest dmail upload metadata so frontend can show it by default.
            "dmail_upload": latest_dmail_upload,
        }
    }


@frappe.whitelist(methods=["GET"])
def get_latest_jrc_dmail_upload():
    """Return latest distribute-mail upload metadata for default UI load."""
    user_email = _get_session_email()
    has_access = _has_jrc_table_access(user_email)
    if not has_access:
        frappe.throw(_("You are not allowed to view uploaded files."))

    try:
        dmail_table_field = _resolve_jrc_dmail_table_field()
    except Exception:
        return {"message": {"file_url": "", "file_name": "", "date": "", "jrc_upload_name": "", "jrc_files_name": ""}}

    latest_dmail_upload = _get_latest_jrc_child_upload_meta(dmail_table_field)
    return {"message": latest_dmail_upload}


@frappe.whitelist(methods=["GET"])
def get_jrc_group_members(group_email=None):
    """Return members (email + employee name) for a clicked group/distributed mail ID."""
    user_email = _get_session_email()
    if not _has_jrc_table_access(user_email):
        frappe.throw(_("You are not allowed to view group members."))

    raw_group_email = (group_email or "").strip()
    if not raw_group_email:
        frappe.throw(_("Group email is required."))

    # Input can contain one or many emails from a single table cell.
    # Normalize once so frontend can safely pass raw email-cell text.
    candidate_group_emails = _extract_emails_from_cell(raw_group_email)
    if not candidate_group_emails and "@" in raw_group_email:
        candidate_group_emails = [raw_group_email.lower()]
    candidate_group_emails = list(dict.fromkeys(candidate_group_emails))
    if not candidate_group_emails:
        return {"message": {"group_email": "", "members": [], "member_count": 0}}

    headers, rows = _get_latest_dmail_mapping_headers_rows()
    if not headers or not rows:
        return {
            "message": {
                "group_email": candidate_group_emails[0],
                "members": [],
                "member_count": 0,
            }
        }

    group_index, individual_index = _resolve_dmail_group_member_indexes(headers)
    if group_index < 0 or individual_index < 0:
        return {
            "message": {
                "group_email": candidate_group_emails[0],
                "members": [],
                "member_count": 0,
            }
        }

    member_emails = set()
    matched_group_email = ""
    candidate_set = set(candidate_group_emails)

    for row in rows:
        group_cell = row[group_index] if group_index < len(row) else ""
        row_group_emails = set(_extract_emails_from_cell(group_cell))
        if not row_group_emails:
            continue

        intersection = row_group_emails.intersection(candidate_set)
        if not intersection:
            continue

        # Keep deterministic group label in UI using clicked-email preference order.
        if not matched_group_email:
            for candidate in candidate_group_emails:
                if candidate in row_group_emails:
                    matched_group_email = candidate
                    break
            if not matched_group_email:
                matched_group_email = sorted(intersection)[0]

        individual_cell = row[individual_index] if individual_index < len(row) else ""
        member_emails.update(_extract_emails_from_cell(individual_cell))

    if not matched_group_email:
        matched_group_email = candidate_group_emails[0]

    member_emails = {email for email in member_emails if email and "@" in email}
    email_to_name = _get_jh_user_master_name_map(member_emails)

    members = [
        {
            "email": email,
            "employee_name": email_to_name.get(email) or email,
        }
        for email in sorted(member_emails)
    ]

    return {
        "message": {
            "group_email": matched_group_email,
            "members": members,
            "member_count": len(members),
        }
    }


@frappe.whitelist(methods=["GET"])
def get_jrc_group_email_list():
    """Return unique group/distributed email IDs from latest dmail mapping upload."""
    user_email = _get_session_email()
    if not _has_jrc_table_access(user_email):
        frappe.throw(_("You are not allowed to view group emails."))

    headers, rows = _get_latest_dmail_mapping_headers_rows()
    if not headers or not rows:
        return {"message": {"group_emails": []}}

    group_index, _ = _resolve_dmail_group_member_indexes(headers)
    if group_index < 0:
        return {"message": {"group_emails": []}}

    # Frontend uses this list to decide which email cells are clickable as group IDs.
    group_emails = set()
    for row in rows:
        group_cell = row[group_index] if group_index < len(row) else ""
        group_emails.update(_extract_emails_from_cell(group_cell))

    return {"message": {"group_emails": sorted(group_emails)}}


def _get_latest_jrc_child_upload_meta(child_table_field):
    """Get latest uploaded file metadata for a specific JRC files child table field."""
    latest_entry = None
    file_url = ""
    parent_doc = _get_or_create_latest_jrc_files_doc()
    parent_name = parent_doc.name

    # First preference: read from the active parent document's child rows directly.
    # This keeps API output aligned with what user sees in the JRC files form grid.
    parent_rows = list(parent_doc.get(child_table_field) or [])
    for row in reversed(parent_rows):
        row_dict = row.as_dict() if hasattr(row, "as_dict") else row
        file_url = _resolve_jrc_upload_file_url(row_dict)
        if file_url:
            latest_entry = row_dict
            break

    # Fallback: DB query for robustness if parent_doc child list is empty/stale.
    if not latest_entry:
        # Resolve "latest" from JRC Uploads rows of the specific child table itself.
        # This avoids mixing unrelated uploads and avoids small limits that can miss true latest rows.
        latest_rows = frappe.get_all(
            "JRC Uploads",
            filters={
                "parent": parent_name,
                "parentfield": child_table_field,
                "parenttype": "JRC files",
            },
            fields=["name", "parent", "test", "date", "creation"],
            order_by="creation desc",
            limit_page_length=1000,
        )
        for row in latest_rows:
            file_url = _resolve_jrc_upload_file_url(row)
            if file_url:
                latest_entry = row
                break

    if not latest_entry or not file_url:
        return {
            "file_url": "",
            "file_name": "",
            "jrc_upload_name": "",
            "jrc_files_name": "",
            "date": "",
            "table_field": child_table_field,
        }

    file_name = file_url.split("/")[-1] if "/" in file_url else file_url
    return {
        "file_url": file_url,
        "file_name": file_name,
        "jrc_upload_name": latest_entry.get("name") or "",
        "jrc_files_name": latest_entry.get("parent") or "",
        "date": latest_entry.get("date"),
        "table_field": child_table_field,
    }


def _get_latest_dmail_mapping_headers_rows():
    """Load latest available dmail mapping sheet as headers+rows."""
    try:
        dmail_field = _resolve_jrc_dmail_table_field()
    except Exception:
        return [], []

    latest_dmail_upload = _get_latest_jrc_child_upload_meta(dmail_field)
    dmail_file_url = (latest_dmail_upload.get("file_url") or "").strip()
    if not dmail_file_url:
        return [], []

    # Use shared preview parser so XLSX/ODS/CSV all work through one path.
    headers, rows = _build_excel_preview_from_file_url(
        file_url=dmail_file_url,
        limit=None,
        silent_invalid=True,
    )
    if headers is None and rows is None:
        latest_dmail_upload = _get_latest_valid_jrc_excel_upload_meta(dmail_field, limit=None)
        dmail_file_url = (latest_dmail_upload.get("file_url") or "").strip()
        if not dmail_file_url:
            return [], []
        headers, rows = _build_excel_preview_from_file_url(
            file_url=dmail_file_url,
            limit=None,
            silent_invalid=True,
        )
        if headers is None and rows is None:
            return [], []

    return headers or [], rows or []


def _resolve_dmail_group_member_indexes(headers):
    """Resolve group/distributed mail and member mail columns from dmail upload headers."""
    if not headers:
        return -1, -1

    def normalize_header(value):
        return re.sub(r"[^a-z0-9]+", " ", (value or "").strip().lower()).strip()

    # Keep both normalized-with-spaces and compact variants to support formats like:
    # "Group Email", "group_email", and "GroupEmail" (camel-case, no delimiter).
    normalized_headers = [normalize_header(header) for header in headers]
    compact_headers = [header.replace(" ", "") for header in normalized_headers]
    group_header_candidates = {
        "groupdistributedmail",
        "groupmail",
        "distributedmail",
        "distributionmail",
        "groupemail",
    }
    individual_header_candidates = {
        "individualmail",
        "individualemail",
        "usermail",
        "useremail",
        "membermail",
        "memberemail",
        "employeeemail",
        "email",
    }

    def is_group_header(header_text):
        if header_text in group_header_candidates:
            return True
        return ("group" in header_text or "distributed" in header_text or "distribution" in header_text) and (
            "mail" in header_text or "email" in header_text
        )

    def is_individual_header(header_text):
        if header_text in individual_header_candidates:
            return True
        return (
            "individual" in header_text
            or "user" in header_text
            or "member" in header_text
            or "employee" in header_text
        ) and (
            "mail" in header_text or "email" in header_text
        )

    group_index = next(
        (index for index, header in enumerate(compact_headers) if is_group_header(header)),
        -1,
    )
    individual_index = next(
        (
            index
            for index, header in enumerate(compact_headers)
            if is_individual_header(header) and index != group_index
        ),
        -1,
    )

    # Header-only fallback: prefer email-like columns before generic positional fallback.
    email_like_indexes = [
        index
        for index, header in enumerate(compact_headers)
        if "email" in header or "mail" in header
    ]
    if group_index < 0:
        group_index = next(
            (
                index
                for index in email_like_indexes
                if (
                    "group" in compact_headers[index]
                    or "distributed" in compact_headers[index]
                    or "distribution" in compact_headers[index]
                )
            ),
            -1,
        )
    if individual_index < 0:
        individual_index = next(
            (
                index
                for index in email_like_indexes
                if index != group_index
                and (
                    "individual" in compact_headers[index]
                    or "user" in compact_headers[index]
                    or "member" in compact_headers[index]
                    or "employee" in compact_headers[index]
                )
            ),
            -1,
        )
    if individual_index < 0:
        individual_index = next(
            (index for index in email_like_indexes if index != group_index),
            -1,
        )

    # Last-resort fallback to first two columns for legacy sheets with fully generic headers.
    if group_index < 0 or individual_index < 0:
        if len(headers) >= 2:
            return 0, 1
        return -1, -1
    return group_index, individual_index


def _get_latest_valid_jrc_excel_upload_meta(child_table_field, limit):
    """Return latest child upload whose file is a readable Excel workbook."""
    parent_name = _get_or_create_latest_jrc_files_doc().name
    latest_rows = frappe.get_all(
        "JRC Uploads",
        filters={
            "parent": parent_name,
            "parentfield": child_table_field,
            "parenttype": "JRC files",
        },
        fields=["name", "parent", "test", "date", "creation"],
        order_by="creation desc",
        limit_page_length=1000,
    )

    for row in latest_rows:
        file_url = _resolve_jrc_upload_file_url(row)
        if not file_url:
            continue

        headers, rows = _build_excel_preview_from_file_url(
            file_url=file_url,
            limit=limit,
            silent_invalid=True,
        )
        if headers is None and rows is None:
            continue

        file_name = file_url.split("/")[-1] if "/" in file_url else file_url
        return {
            "file_url": file_url,
            "file_name": file_name,
            "jrc_upload_name": row.get("name") or "",
            "jrc_files_name": row.get("parent") or "",
            "date": row.get("date"),
            "table_field": child_table_field,
        }

    return {
        "file_url": "",
        "file_name": "",
        "jrc_upload_name": "",
        "jrc_files_name": "",
        "date": "",
        "table_field": child_table_field,
    }

def _resolve_jrc_upload_file_url(jrc_upload_row):
    # Accept direct URL if a File row with the same URL still exists.
    # Attachment linkage can vary (manual desk edits, different attachment context), so
    # we do not require attached_to_doctype/name match at this stage.
    raw_value = (jrc_upload_row.get("test") or "").strip()
    if raw_value.startswith("/files/") or raw_value.startswith("/private/files/") or raw_value.startswith("http"):
        file_exists_by_url = frappe.get_all(
            "File",
            filters={
                "file_url": raw_value,
            },
            fields=["name"],
            limit_page_length=1,
        )
        if file_exists_by_url:
            return raw_value

    file_rows = frappe.get_all(
        "File",
        filters={
            "attached_to_doctype": "JRC Uploads",
            "attached_to_name": jrc_upload_row.get("name"),
        },
        fields=["file_url"],
        order_by="creation desc",
        limit_page_length=1,
    )
    return file_rows[0]["file_url"] if file_rows else ""


def _build_excel_preview_from_file_url(file_url, limit, silent_invalid=False):
    # Find latest File by URL and stream content from Frappe storage backend.
    file_rows = frappe.get_all(
        "File",
        filters={"file_url": file_url},
        fields=["name"],
        order_by="creation desc",
        limit_page_length=1,
    )

    if not file_rows:
        if silent_invalid:
            return None, None
        return [], []

    file_doc = frappe.get_doc("File", file_rows[0]["name"])
    file_content = file_doc.get_content()
    if isinstance(file_content, str):
        file_content = file_content.encode()

    try:
        from openpyxl import load_workbook
    except ImportError:
        # Backend supports multiple sheet formats. If openpyxl is unavailable,
        # still allow preview/mapping for ODS or CSV uploads.
        headers, rows = _build_ods_preview_from_file_content(file_content=file_content, limit=limit)
        if headers is not None and rows is not None:
            return headers, rows
        headers, rows = _build_csv_preview_from_file_content(file_content=file_content, limit=limit)
        if headers is not None and rows is not None:
            return headers, rows
        if silent_invalid:
            return None, None
        frappe.throw(_("Excel preview dependency is not available on server."))

    try:
        workbook = load_workbook(filename=BytesIO(file_content), data_only=True, read_only=True)
        sheet = workbook.active
        raw_rows = list(sheet.iter_rows(values_only=True))
        workbook.close()
    except Exception:
        # Some users upload LibreOffice sheets (ODS) with .xlsx extension.
        # Fallback parsers keep preview + group-mail mapping working for ODS/CSV uploads.
        # This same parser path is used by group-mail permission resolution.
        headers, rows = _build_ods_preview_from_file_content(file_content=file_content, limit=limit)
        if headers is None and rows is None:
            headers, rows = _build_csv_preview_from_file_content(file_content=file_content, limit=limit)
        if headers is None and rows is None:
            if silent_invalid:
                return None, None
            frappe.throw(_("Uploaded file is not a valid Excel/ODS/CSV file."))
        return headers, rows

    if not raw_rows:
        return [], []

    header_row = raw_rows[0] or []
    headers = []
    # Fill blank header cells with generic names so table columns stay stable in UI.
    for index, value in enumerate(header_row):
        if value is None or str(value).strip() == "":
            headers.append(f"Column {index + 1}")
        else:
            headers.append(str(value).strip())

    if not headers:
        return [], []

    rows = []
    for row in raw_rows[1:]:
        if limit is not None and len(rows) >= limit:
            break
        row_values = list(row or [])
        if len(row_values) < len(headers):
            row_values.extend([None] * (len(headers) - len(row_values)))
        parsed_row = ["" if value is None else str(value) for value in row_values[: len(headers)]]
        if any(cell != "" for cell in parsed_row):
            rows.append(parsed_row)

    return headers, rows


def _build_ods_preview_from_file_content(file_content, limit):
    """Parse first sheet of ODS file and return headers + rows in same shape as Excel parser."""
    try:
        with zipfile.ZipFile(BytesIO(file_content)) as archive:
            if "content.xml" not in archive.namelist():
                return None, None
            content_xml = archive.read("content.xml")
    except Exception:
        return None, None

    try:
        root = ET.fromstring(content_xml)
    except Exception:
        return None, None

    ns = {
        "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
        "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
        "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    }

    spreadsheet = root.find(".//office:body/office:spreadsheet", ns)
    if spreadsheet is None:
        return [], []

    first_table = spreadsheet.find("table:table", ns)
    if first_table is None:
        return [], []

    office_ns = ns["office"]
    table_ns = ns["table"]
    text_ns = ns["text"]
    max_columns = 200
    raw_rows = []

    def get_int_attr(node, attr_name, default_value=1):
        raw = node.attrib.get(attr_name, str(default_value))
        try:
            value = int(raw)
        except (TypeError, ValueError):
            value = default_value
        return max(1, value)

    def extract_cell_value(cell):
        # Prefer visible text first.
        text_parts = []
        for paragraph in cell.findall(f".//{{{text_ns}}}p"):
            paragraph_text = "".join(paragraph.itertext()).strip()
            if paragraph_text:
                text_parts.append(paragraph_text)
        if text_parts:
            return " ".join(text_parts).strip()

        # Fallback to attribute values when cell text nodes are not present.
        for key in ("string-value", "value", "date-value", "time-value", "boolean-value"):
            attr_value = cell.attrib.get(f"{{{office_ns}}}{key}")
            if attr_value is not None:
                return str(attr_value).strip()
        return ""

    for table_row in first_table.findall(f"{{{table_ns}}}table-row"):
        repeated_rows = get_int_attr(table_row, f"{{{table_ns}}}number-rows-repeated", 1)
        row_values = []

        for cell in list(table_row):
            tag_name = cell.tag.rsplit("}", 1)[-1]
            if tag_name not in {"table-cell", "covered-table-cell"}:
                continue

            repeated_cols = get_int_attr(cell, f"{{{table_ns}}}number-columns-repeated", 1)
            value = extract_cell_value(cell)
            repeat_count = min(repeated_cols, max(1, max_columns - len(row_values)))
            if repeat_count <= 0:
                break
            row_values.extend([value] * repeat_count)
            if len(row_values) >= max_columns:
                break

        # Skip empty rows to avoid huge ODS repeated-blank sections.
        if not any(str(value or "").strip() for value in row_values):
            continue

        for _ in range(repeated_rows):
            raw_rows.append(list(row_values))

    if not raw_rows:
        return [], []

    header_row = raw_rows[0] or []
    headers = []
    for index, value in enumerate(header_row):
        if value is None or str(value).strip() == "":
            headers.append(f"Column {index + 1}")
        else:
            headers.append(str(value).strip())

    if not headers:
        return [], []

    rows = []
    for row in raw_rows[1:]:
        if limit is not None and len(rows) >= limit:
            break
        row_values = list(row or [])
        if len(row_values) < len(headers):
            row_values.extend([None] * (len(headers) - len(row_values)))
        parsed_row = ["" if value is None else str(value) for value in row_values[: len(headers)]]
        if any(cell != "" for cell in parsed_row):
            rows.append(parsed_row)

    return headers, rows


def _build_csv_preview_from_file_content(file_content, limit):
    """Parse CSV file content and return headers + rows in same shape as Excel parser."""
    decoded_text = None
    for encoding in ("utf-8-sig", "utf-16", "latin-1"):
        try:
            decoded_text = file_content.decode(encoding)
            break
        except Exception:
            continue

    if decoded_text is None:
        return None, None

    # Binary uploads can decode as garbage in permissive encodings; reject obvious binary-like text.
    if "\x00" in decoded_text:
        return None, None

    sample = decoded_text[:8192]
    try:
        sniffed = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        delimiter = sniffed.delimiter
    except Exception:
        delimiter = None
        lines = [line for line in decoded_text.splitlines() if line.strip()]
        if lines:
            first_line = lines[0]
            delimiter_candidates = [",", ";", "\t", "|"]
            delimiter_counts = [(candidate, first_line.count(candidate)) for candidate in delimiter_candidates]
            delimiter_counts.sort(key=lambda item: item[1], reverse=True)
            if delimiter_counts and delimiter_counts[0][1] > 0:
                delimiter = delimiter_counts[0][0]

    # If no delimiter was detected, this is likely not a CSV-like tabular upload.
    if not delimiter:
        return None, None

    reader = csv.reader(StringIO(decoded_text), delimiter=delimiter)
    raw_rows = []
    for row in reader:
        normalized_row = ["" if value is None else str(value).strip() for value in row]
        if any(cell != "" for cell in normalized_row):
            raw_rows.append(normalized_row)

    if not raw_rows:
        return [], []

    header_row = raw_rows[0]
    headers = []
    for index, value in enumerate(header_row):
        if value is None or str(value).strip() == "":
            headers.append(f"Column {index + 1}")
        else:
            headers.append(str(value).strip())

    if not headers:
        return [], []

    rows = []
    for row in raw_rows[1:]:
        if limit is not None and len(rows) >= limit:
            break
        row_values = list(row or [])
        if len(row_values) < len(headers):
            row_values.extend([""] * (len(headers) - len(row_values)))
        parsed_row = ["" if value is None else str(value) for value in row_values[: len(headers)]]
        if any(cell != "" for cell in parsed_row):
            rows.append(parsed_row)

    return headers, rows


def _split_jrc_folder_path(value):
    # Normalize folder delimiters from Excel values into one consistent segment list.
    text = (value or "").strip()
    if not text:
        return ["(Blank)"]

    if "\\" in text:
        segments = [segment.strip() for segment in text.split("\\")]
    elif "/" in text:
        segments = [segment.strip() for segment in text.split("/")]
    elif ">" in text:
        segments = [segment.strip() for segment in text.split(">")]
    else:
        segments = [text]

    segments = [segment for segment in segments if segment]
    return segments if segments else ["(Blank)"]


def _get_jrc_folder_key(row):
    # First column in Excel is treated as folder path source.
    folder_value = row[0] if row and len(row) > 0 else ""
    return "/".join(_split_jrc_folder_path(folder_value))


def _extract_emails_from_cell(value):
    """Extract and normalize one or many email IDs from a single cell value."""
    # Supports values like "a@x.com; b@y.com" or "Name <a@x.com>" in uploaded sheets.
    text = (value or "").strip().lower()
    if not text:
        return []

    # Some uploaded cells contain concatenated emails without separator
    # (e.g. "adminroot@jaleel.comadmin1@jaleel.com").
    # Insert a space between known TLD endings and the next local-part start.
    for tld in ("com", "org", "net", "edu", "gov", "co", "in", "ae", "uk"):
        text = re.sub(
            fr"(?<=\.{tld})(?=[a-z0-9._%+\-]+@)",
            " ",
            text,
        )

    # Prefer non-greedy matching for common TLDs to safely split concatenated values like:
    # "adminroot@jaleel.comadmin1@jaleel.com" -> ["adminroot@jaleel.com", "admin1@jaleel.com"].
    matches = re.findall(
        r"[a-z0-9._%+\-]+@[a-z0-9.\-]*?\.(?:com|org|net|edu|gov|co|in|ae|uk)",
        text,
    )
    if not matches:
        matches = re.findall(r"[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}", text)
    if matches:
        return list(dict.fromkeys(matches))

    # Fallback for uncommon values that still contain a mail-like token.
    return [text] if "@" in text else []


def _get_group_mail_ids_for_user(user_email):
    """Read latest dmail upload and return all group mails mapped to the given individual user mail."""
    normalized_user_email = (user_email or "").strip().lower()
    if not normalized_user_email or "@" not in normalized_user_email:
        return set()

    # Use same dmail parser path as group-member popup API.
    headers, rows = _get_latest_dmail_mapping_headers_rows()
    if not headers or not rows:
        return set()
    group_index, individual_index = _resolve_dmail_group_member_indexes(headers)
    if group_index < 0 or individual_index < 0:
        return set()

    group_emails = set()
    for row in rows:
        group_cell = row[group_index] if group_index < len(row) else ""
        individual_cell = row[individual_index] if individual_index < len(row) else ""
        individual_emails = set(_extract_emails_from_cell(individual_cell))

        # If this row maps the logged-in user, collect that row's group/distributed mail.
        if normalized_user_email in individual_emails:
            group_emails.update(_extract_emails_from_cell(group_cell))

    return group_emails


def _get_jh_user_master_name_map(emails):
    """Resolve email -> display name map from JH User Master."""
    normalized_emails = sorted(
        {str(email or "").strip().lower() for email in (emails or []) if str(email or "").strip()}
    )
    if not normalized_emails:
        return {}

    # Query enough rows to handle repeated historical records and keep newest per email.
    user_rows = frappe.get_all(
        "JH User Master",
        filters={"email": ["in", normalized_emails]},
        fields=[
            "email",
            "full_name",
            "first_name",
            "middle_name",
            "last_name",
            "employee_code",
            "modified",
        ],
        order_by="modified desc",
        limit_page_length=max(len(normalized_emails) * 5, 50),
    )

    email_to_name = {}
    for user_row in user_rows:
        email = (user_row.get("email") or "").strip().lower()
        if not email or email in email_to_name:
            continue

        full_name = (user_row.get("full_name") or "").strip()
        if not full_name:
            parts = [
                (user_row.get("first_name") or "").strip(),
                (user_row.get("middle_name") or "").strip(),
                (user_row.get("last_name") or "").strip(),
            ]
            full_name = " ".join(part for part in parts if part).strip()
        if not full_name:
            full_name = (user_row.get("employee_code") or "").strip()
        if full_name:
            email_to_name[email] = full_name

    return email_to_name


def _normalize_column_header(value):
    """Normalize uploaded header values for robust column matching."""
    return re.sub(r"[^a-z0-9]+", "", (value or "").strip().lower())


def _resolve_jrc_user_email_column_index(headers):
    """Resolve user-email column from main JRC permission sheet headers."""
    if not headers:
        return -1

    normalized_headers = [_normalize_column_header(header) for header in headers]

    # Preferred exact/header-specific matches in priority order.
    exact_candidates = (
        "email",
        "useremail",
        "usermail",
        "individualemail",
        "individualmail",
    )
    for candidate in exact_candidates:
        if candidate in normalized_headers:
            return normalized_headers.index(candidate)

    # Heuristic fallback to support minor naming variations.
    scored = []
    for index, header in enumerate(normalized_headers):
        has_email = "email" in header or "mail" in header
        if not has_email:
            continue

        # Prefer user-specific email columns over group/member columns.
        if "user" in header:
            score = 0
        elif "individual" in header:
            score = 1
        elif "group" in header or "distributed" in header or "distribution" in header:
            score = 3
        elif "member" in header:
            score = 4
        else:
            score = 2
        scored.append((score, index))

    if scored:
        scored.sort(key=lambda item: (item[0], item[1]))
        return scored[0][1]

    return -1


def _filter_jrc_rows_by_user_email(
    headers,
    rows,
    user_email,
    can_view_all=False,
    identity_emails=None,
):
    """Restrict preview rows by folder ownership unless user has full-view role."""
    if can_view_all:
        # JRC Permission role gets full table visibility.
        return rows

    normalized_user_email = (user_email or "").strip().lower()
    if not normalized_user_email:
        return []

    email_index = _resolve_jrc_user_email_column_index(headers or [])

    # Safe default: without Email column, do not expose rows to non-role users.
    if email_index < 0:
        return []

    # Access rule for non-role users:
    # 1) Direct email permissions from main sheet.
    # 2) Group/distributed email permissions mapped from latest dmail sheet.
    # A user must match one of these identities to open a folder scope.
    base_identity_emails = {normalized_user_email}
    base_identity_emails.update((email or "").strip().lower() for email in (identity_emails or set()))
    base_identity_emails = {email for email in base_identity_emails if email and "@" in email}

    mapped_group_email_ids = set()
    for identity_email in base_identity_emails:
        mapped_group_email_ids.update(_get_group_mail_ids_for_user(identity_email))

    # Final allow-list combines direct user emails + mapped group/distribution emails.
    allowed_email_ids = set(base_identity_emails)
    allowed_email_ids.update(mapped_group_email_ids)

    # Step 1: Find root folders where the user is explicitly listed (direct mail or mapped group mail).
    allowed_folder_keys = set()
    for row in rows or []:
        row_email = (row[email_index] if email_index < len(row) else "") or ""
        row_email_ids = set(_extract_emails_from_cell(row_email))
        if row_email_ids.intersection(allowed_email_ids):
            allowed_folder_keys.add(_get_jrc_folder_key(row))

    if not allowed_folder_keys:
        return []

    # Step 2: Expand visibility to every descendant row under those allowed root folders.
    filtered_rows = []
    for row in rows or []:
        row_folder_key = _get_jrc_folder_key(row)
        if any(
            row_folder_key == folder_key or row_folder_key.startswith(f"{folder_key}/")
            for folder_key in allowed_folder_keys
        ):
            filtered_rows.append(row)

    return filtered_rows


def _append_jrc_name_column_from_email(headers, rows):
    """Add/refresh Name column using JH User Master mapped by Email."""
    if not headers:
        return headers, rows

    email_index = _resolve_jrc_user_email_column_index(headers)

    if email_index < 0:
        # Without Email we cannot map names reliably.
        return headers, rows

    unique_emails = []
    seen_emails = set()
    for row in rows or []:
        email = (row[email_index] if email_index < len(row) else "") or ""
        normalized = email.strip().lower()
        if normalized and normalized not in seen_emails:
            seen_emails.add(normalized)
            unique_emails.append(email.strip())

    email_to_name = {}
    if unique_emails:
        # Fetch latest matching user records and build email -> display name map.
        user_rows = frappe.get_all(
            "JH User Master",
            filters={"email": ["in", unique_emails]},
            fields=[
                "email",
                "full_name",
                "first_name",
                "middle_name",
                "last_name",
                "employee_code",
                "modified",
            ],
            order_by="modified desc",
            limit_page_length=max(len(unique_emails) * 5, 50),
        )

        for user_row in user_rows:
            email = (user_row.get("email") or "").strip().lower()
            if not email or email in email_to_name:
                continue

            full_name = (user_row.get("full_name") or "").strip()
            if not full_name:
                parts = [
                    (user_row.get("first_name") or "").strip(),
                    (user_row.get("middle_name") or "").strip(),
                    (user_row.get("last_name") or "").strip(),
                ]
                full_name = " ".join(part for part in parts if part).strip()
            if not full_name:
                full_name = (user_row.get("employee_code") or "").strip()

            email_to_name[email] = full_name

    name_index = -1
    for index, header in enumerate(headers):
        if (header or "").strip().lower() == "name":
            name_index = index
            break

    updated_rows = []
    if name_index >= 0:
        # If Name column already exists in uploaded sheet, overwrite with canonical mapped value.
        updated_headers = headers
        for row in rows or []:
            row_values = list(row)
            if len(row_values) < len(updated_headers):
                row_values.extend([""] * (len(updated_headers) - len(row_values)))
            email = (row_values[email_index] if email_index < len(row_values) else "") or ""
            mapped_name = email_to_name.get(email.strip().lower(), "")
            row_values[name_index] = mapped_name
            updated_rows.append(row_values)
    else:
        # Otherwise inject Name column immediately after Email for readability.
        insert_index = email_index + 1
        updated_headers = headers[:insert_index] + ["Name"] + headers[insert_index:]
        for row in rows or []:
            row_values = list(row)
            if len(row_values) < len(headers):
                row_values.extend([""] * (len(headers) - len(row_values)))
            email = (row_values[email_index] if email_index < len(row_values) else "") or ""
            mapped_name = email_to_name.get(email.strip().lower(), "")
            updated_rows.append(
                row_values[:insert_index] + [mapped_name] + row_values[insert_index:]
            )

    return updated_headers, updated_rows

def run_post_hrms_sync():
    try:

        # 1. Delete inactive employees
        frappe.db.sql("""
            DELETE FROM `tabHRMS Users`
            WHERE ACTIVE = 'Inactive'
        """)

        # 2. Clear non-official email IDs
        frappe.db.sql("""
            UPDATE `tabHRMS Users`
            SET mail_id = ''
            WHERE employee_code NOT IN (
                SELECT employee_code FROM (
                    SELECT employee_code
                    FROM `tabHRMS Users`
                    WHERE mail_id LIKE '%@jaleel.%'
                       OR mail_id LIKE '%@crosswell.%'
                       OR mail_id LIKE '%@orbex.%'
                       OR mail_id LIKE '%@mfbfoods.%'
                       OR mail_id LIKE '%@albazil.%'
                ) t
            )
        """)
        
        # 2a. Set mail_id = '' only when: a) the employee is not a reporting manager, and b) the same mail_id already exists
        frappe.db.sql("""
            UPDATE `tabHRMS Users`
            SET mail_id = ''
            WHERE employee_code NOT IN (
                SELECT reporting_manager
                FROM (
                    SELECT reporting_manager
                    FROM `tabHRMS Users`
                    WHERE reporting_manager IS NOT NULL
                    AND reporting_manager <> ''
                ) mgr
            )
            AND mail_id IN (
                SELECT mail_id
                FROM (
                    SELECT mail_id
                    FROM `tabHRMS Users`
                    WHERE mail_id IS NOT NULL
                    AND mail_id <> ''
                    GROUP BY mail_id
                    HAVING COUNT(*) > 1
                ) dup
            );
        """)

        # 2b. Set mail_id = ''  when: the same mail_id already exists elsewhere in the system after the above step
        frappe.db.sql("""
            UPDATE `tabHRMS Users`
            SET mail_id = ''
            WHERE mail_id IN (
                SELECT mail_id
                FROM (
                    SELECT mail_id
                    FROM `tabHRMS Users`
                    WHERE mail_id IS NOT NULL
                    AND mail_id <> ''
                    GROUP BY mail_id
                    HAVING COUNT(*) > 1
                ) dup
            );
        """)

        # 3. Update JH User Master
        frappe.db.sql("""
            UPDATE `tabJH User Master` JH
            JOIN `tabHRMS Users` HR
              ON JH.employee_code = HR.employee_code
            SET
                JH.email = HR.mail_id,
                JH.location_name = HR.location_name,
                JH.designation_name = HR.designation_name,
                JH.department_name = HR.department_name,
                JH.region = HR.region,
                JH.country = HR.country,
                JH.city = HR.city,
                JH.position = HR.position,
                JH.cost_center = HR.cost_center,
                JH.employee_status = HR.employee_status,
                JH.first_name = HR.first_name,
                JH.middle_name = HR.middle_name,
                JH.last_name = HR.last_name,
                JH.full_name = HR.company_name,
                JH.reporting_manager = HR.reporting_manager,
                JH.active = CASE WHEN HR.active = 'Active' THEN 1 ELSE 0 END,
                JH.business = HR.entity_name     
        """)

        # 4. Insert missing JH users
        frappe.db.sql("""
            INSERT INTO `tabJH User Master` (
                email, location_name, designation_name, department_name,
                region, country, city, position, cost_center, employee_status,
                first_name, middle_name, last_name,full_name,
                reporting_manager, business, division,
                employee_code, active, name
            )
            SELECT
                HR.mail_id, HR.location_name, HR.designation_name,
                HR.department_name, HR.region, HR.country, HR.city,
                HR.position, HR.cost_center, HR.employee_status,
                HR.first_name, HR.middle_name, HR.last_name,
                HR.company_name,HR.reporting_manager,
                HR.entity_name, '', HR.employee_code, CASE WHEN HR.active = 'Active' THEN 1 ELSE 0 END, HR.employee_code
            FROM `tabHRMS Users` HR
            LEFT JOIN `tabJH User Master` JH
              ON HR.employee_code = JH.employee_code
            WHERE JH.employee_code IS NULL
              AND IFNULL(HR.mail_id, '') <> ''
              AND IFNULL(HR.employee_code, '') <> ''       
        """)

        # 5. Update PMS Employees
        frappe.db.sql("""
            UPDATE `tabPMS Employees` PMS
            JOIN `tabHRMS Users` HR
              ON PMS.employee_code = HR.employee_code
            LEFT JOIN `tabJH User Master` JH
              ON HR.reporting_manager = JH.name
            SET
                PMS.first_name = HR.first_name,
                PMS.middle_name = HR.middle_name,
                PMS.last_name = HR.last_name,
                PMS.full_name = HR.company_name,
                PMS.employee_email = HR.mail_id,
                PMS.band = HR.grade_name,
                PMS.business_unit = HR.ou_name,
                PMS.manager_name = HR.reporting_manager,
                PMS.manager_code = JH.employee_code,
                PMS.manager_email = JH.email,
                PMS.cost_center_name = HR.cost_center_name,
                PMS.entity_name = HR.entity_name,
                PMS.ou_name = HR.ou_name,
                PMS.designation_name = HR.designation_name,
                PMS.department_name = HR.department_name,
                PMS.grade_name = HR.grade_name
        """)

        # 6. Insert missing PMS Employees
        frappe.db.sql("""
            INSERT INTO `tabPMS Employees` (
                first_name, middle_name, last_name,full_name,
                employee_email, band, business_unit, manager_name, manager_code, manager_email,
                cost_center_name, entity_name, ou_name,
                designation_name, department_name, grade_name,
                employee_code, name
            )
            SELECT
                HR.first_name, HR.middle_name, HR.last_name,
                HR.company_name,HR.mail_id, HR.grade_name,
                HR.ou_name, HR.reporting_manager,JH.employee_code,JH.email,
                HR.cost_center_name, HR.entity_name,
                HR.ou_name, HR.designation_name,
                HR.department_name, HR.grade_name,
                HR.employee_code, HR.employee_code
            FROM `tabHRMS Users` HR
            LEFT JOIN `tabPMS Employees` PMS
              ON HR.employee_code = PMS.employee_code
            LEFT JOIN `tabJH User Master` JH
              ON HR.reporting_manager = JH.name
            WHERE PMS.employee_code IS NULL
              AND IFNULL(HR.employee_code, '') <> ''
        """)

        frappe.db.sql("UPDATE `tabPMS Employees` SET pms_employee = 0")
        frappe.db.sql("""
            UPDATE `tabPMS Employees`
            SET pms_employee = 1

            WHERE grade_name LIKE '%EL_'
               OR grade_name LIKE '%FL_'
               OR grade_name LIKE '%GL_'
               OR grade_name LIKE 'OFRL'
        """)
        frappe.db.sql("UPDATE `tabPMS Employees` SET pms_manager = 0")
        frappe.db.sql("""
            UPDATE `tabPMS Employees` PMS
            JOIN `tabHRMS Users` HR
              ON PMS.employee_code = HR.reporting_manager
            SET PMS.pms_manager = 1
        """)
       

        frappe.db.sql("UPDATE `tabPMS Employees` SET pms_master = 0")
        frappe.db.sql("""
            UPDATE `tabPMS Employees`
            SET pms_master = 1
            WHERE pms_master + pms_admin + pms_manager >= 1
        """)
        

        # ---------------------------------------------------------------------
        # 10. Create Manager Hierarchy in PMS Manager List (Frappe way)
        # ---------------------------------------------------------------------

        # 1. Clear existing hierarchy
        parent_doc = frappe.get_single("PMS Manager List")
        parent_doc.set("manager_hierarchy", [])
        parent_doc.save(ignore_permissions=True)

        # 2. Build raw manager hierarchy from PMS Employees
        manager_hierarchy = frappe.db.sql("""
            WITH RECURSIVE manager_hierarchy AS (
                SELECT
                    IFNULL(e.manager_code, '') AS reporting_manager_id,
                    IFNULL(e.employee_code, '') AS manager_id,
                    1 AS level
                FROM `tabPMS Employees` e
                WHERE e.manager_code IS NOT NULL
                AND e.employee_code IN (
                    SELECT DISTINCT manager_code FROM `tabPMS Employees`
                )

                UNION ALL

                SELECT
                    h.reporting_manager_id,
                    IFNULL(e.employee_code, '') AS manager_id,
                    h.level + 1 AS level
                FROM manager_hierarchy h
                JOIN `tabPMS Employees` e
                    ON e.manager_code = h.manager_id
                WHERE e.employee_code IN (
                    SELECT DISTINCT manager_code FROM `tabPMS Employees`
                )
            )
            SELECT reporting_manager_id, manager_id, level
            FROM manager_hierarchy
            WHERE IFNULL(reporting_manager_id, '') != ''
            ORDER BY reporting_manager_id, level
        """, as_dict=True)

        # 3. Create fresh parent doc
        parent_doc = frappe.get_doc({
            "doctype": "PMS Manager List",
            "manager": "ROOT",
            "manager_hierarchy": []
        })

        # 4. Apply business rules row by row
        for row in manager_hierarchy:

            manager_code = row["manager_id"]
            reporting_manager_code = row["reporting_manager_id"]

            # Rule 1: Manager must exist in JH User Master
            if not frappe.db.exists(
                "JH User Master",
                {"employee_code": manager_code}
            ):
                continue

            # Rule 2: Reporting manager must exist in JH User Master
            if not frappe.db.exists(
                "JH User Master",
                {"employee_code": reporting_manager_code}
            ):
                continue

            # Rule 3: Manager must have at least one PMS employee
            has_subordinates = frappe.db.exists(
                "PMS Employees",
                {
                    "manager_code": manager_code,
                    "pms_employee": 1
                }
            )

            if not has_subordinates:
                continue

            # Fetch HRMS details (optional metadata)
            hr_reporting = frappe.get_value(
                "HRMS Users",
                reporting_manager_code,
                ["company_name", "mail_id"],
                as_dict=True
            ) or {}

            hr_manager = frappe.get_value(
                "HRMS Users",
                manager_code,
                ["company_name", "mail_id"],
                as_dict=True
            ) or {}

            # Append valid hierarchy row
            parent_doc.append("manager_hierarchy", {
                "reporting_manager_name": reporting_manager_code,
                "reporting_manager_email": hr_reporting.get("mail_id"),
                "manager_name": manager_code,
                "manager_email": hr_manager.get("mail_id"),
                "level": row["level"]
            })

        # 5. Save once
        parent_doc.save(ignore_permissions=True)

        exception_doc = frappe.get_doc("PMS Employee Exception")

        for row in exception_doc.exceptions:

            emp_id = row.emp_id
            designation = row.designation
            action = row.action

            if not frappe.db.exists("PMS Employees", emp_id):
                continue

            pms_emp = frappe.get_doc("PMS Employees", emp_id)

            if action == "U":

                if not pms_emp.designation_name:
                    continue

                frappe.db.set_value(
                    "PMS Employees",
                    emp_id,
                    "designation_name",
                    designation
                )

            elif action == "D":

                if pms_emp.employee_email:
                    user_email = pms_emp.employee_email

                else:
                    if not frappe.db.exists("JH User Master", emp_id):
                        continue

                    user_email = frappe.get_value("JH User Master", emp_id,"email")

                if user_email and frappe.db.exists("User", user_email):

                    user_doc = frappe.get_doc("User", user_email)

                    user_doc.roles = [
                        r for r in user_doc.roles if r.role != "PMS User"
                    ]

                    user_doc.save(ignore_permissions=True)

                frappe.delete_doc(
                    "PMS Employees",
                    emp_id,
                    ignore_permissions=True
                )
    except Exception:
        frappe.db.rollback()
        frappe.log_error(
            frappe.get_traceback(),
            "Post HRMS Scheduler Sync Failed"
        )
        raise
