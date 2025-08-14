import frappe
from frappe import _
import requests
import json
from datetime import datetime, timedelta


HRMS_BASE_URL = frappe.conf.get("hrms_base_url")
USERNAME = frappe.conf.get("hrms_api_username")
PASSWORD = frappe.conf.get("hrms_api_password")
APINO = frappe.conf.get("api_no")
DATE_FORMAT = "%Y-%m-%d"


@frappe.whitelist(allow_guest=True)
def get_access_token():
    """Fetch access token from HRMS and trigger data fetch."""
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
@frappe.whitelist(allow_guest=True)
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
        "date_of_joining": format_date(emp.get("DATE_OF_JOINING")),
        "dob": format_date(emp.get("DOB")),
        "gender": gender_map.get(emp.get("GENDER"), emp.get("GENDER") or "N/A"),
        "mail_id": emp.get("MAIL_ID"),
        "reporting_manager": emp.get("REPORTING_MANAGER"),
        "funcational_reporting_manager": emp.get("FUNCATIONAL_REPORTING_MANAGER"),
        "ou_name": emp.get("OU_NAME"),
        "department_name": emp.get("DEPARTMENT_NAME"),
        "location_name": emp.get("LOCATION_NAME"),
        "designation_name": emp.get("DESIGNATION_NAME"),
        "grade_name": emp.get("GRADE_NAME"),
        "region": emp.get("REGION"),
        "country": emp.get("COUNTRY"),
        "city": emp.get("CITY"),
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
