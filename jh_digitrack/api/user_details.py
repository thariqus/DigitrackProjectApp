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

        response = requests.post(url, headers=headers, data=data)
        
        response.raise_for_status()

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

        local_payload = {
            "Data": {
                "Employee Data": hr_data[0].get("Data", {}).get("Employee Data", [])
            }
        }

        # pass base_url in the site config.json inorder to fetch the exact url
        delete_existing_hrms_users()
        
        base_url = frappe.get_site_config().get("base_url")
        print("base_url", base_url)
        user = frappe.get_doc("User", "Administrator")  
        api_key = user.api_key
        api_secret = frappe.utils.password.get_decrypted_password("User", "Administrator", "api_secret")
        
        authorization_token = f"Token {api_key}:{api_secret}"
        print("authorization",authorization_token)
        local_api_url = f"{base_url}/api/method/jh_digitrack.api.user_details.create_hrms_users"
        post_response = requests.post(
            local_api_url,
            json=local_payload,
            headers={
                "Authorization": authorization_token,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Expect": "" 
            }
        )
        post_response.raise_for_status()

        frappe.log_error("Internal HRMS User Creation Response", post_response.text)

        return {
            "status": "success",
            "message": "HRMS Users created successfully",
            "external_api_response": hr_data,
            "internal_api_response": post_response.json()
        }

    except Exception:
        frappe.log_error("HRMS Data Fetch Error", frappe.get_traceback())
        frappe.response["http_status_code"] = 500
        frappe.response["message"] = "Error fetching or posting HRMS data"

@frappe.whitelist(allow_guest=True)
def create_hrms_users():
    try:
        data = frappe.request.get_json()
        employees = data.get("Data", {}).get("Employee Data", [])

        if not employees:
            frappe.response["http_status_code"] = 400
            frappe.response["message"] = "No employee data received"
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
        "mobile_no": emp.get("PER_MOBILE"),
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


import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
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
