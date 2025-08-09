import frappe
from frappe import _ 
import requests
import json
from frappe.utils.error import log_error
from datetime import datetime

@frappe.whitelist(allow_guest=True)
def get_access_token():
    try:
        url = 'https://hrms.jaleelholdings.com/cloudapi/AdrenalinToken'
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        data = {
            'username': 'JALEEL',
            'password': 'jaleel123',
            'grant_type': 'password'
        }

        response = requests.post(url, headers=headers, data=data)
        response.raise_for_status()

        access_token = response.json().get("access_token")

        if not access_token:
            frappe.log_error("Access token not found", response.text)
            return
        
        fetch_hr_data(access_token)

    except Exception:
        frappe.log_error("HRMS Access Token Error", frappe.get_traceback())


@frappe.whitelist(allow_guest=True)
def fetch_hr_data(token):
    try:
        url = "https://hrms.jaleelholdings.com/cloudapi/HRdata/Getdata/"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        payload = [{
            "Apino": "API0001",
            "Param": "01-jun-2025~30-jun-2025"
        }]

        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        hr_data = response.json()

        frappe.log_error("External HR API Response", json.dumps(hr_data, indent=2))

        new_users = hr_data[0].get("Data", {}).get("Employee Data", [])
        if not new_users:
            frappe.throw("No employee data received from HRMS")
            return

        frappe.db.sql("DELETE FROM `tabHRMS Users`")

        for emp in new_users:
            doc = frappe.new_doc("HRMS Users")
            doc.employee_code = emp.get("EMPLOYEE_CODE")
            doc.first_name = emp.get("FIRST_NAME")
            doc.last_name = emp.get("LAST_NAME")
            doc.middle_name = emp.get("MIDDLE_NAME")
            doc.company_name = emp.get("COMPANY_NAME")
            doc.date_of_joining = format_date(emp.get("DATE_OF_JOINING"))
            doc.dob = format_date(emp.get("DOB"))
            gender_map = {"M": "Male", "F": "Female"}
            doc.gender = gender_map.get(emp.get("GENDER"), emp.get("GENDER") or "N/A")
            doc.mail_id = emp.get("MAIL_ID")
            doc.reporting_manager = emp.get("REPORTING_MANAGER")
            doc.funcational_reporting_manager = emp.get("FUNCATIONAL_REPORTING_MANAGER")
            doc.ou_name = emp.get("OU_NAME")
            doc.department_name = emp.get("DEPARTMENT_NAME")
            doc.location_name = emp.get("LOCATION_NAME")
            doc.designation_name = emp.get("DESIGNATION_NAME")
            doc.grade_name = emp.get("GRADE_NAME")
            doc.region = emp.get("REGION")
            doc.country = emp.get("COUNTRY")
            doc.city = emp.get("CITY")
            doc.position = emp.get("POSITION")
            doc.cost_center = emp.get("COST_CENTER")
            doc.pay_group = emp.get("PAY_GROUP")
            doc.employee_status = emp.get("EMPLOYEE_STATUS")
            doc.vis_expiry_date = emp.get("vis_expiryDate")
            doc.ic_valid_till_date = emp.get("lc_valid_till_date")
            doc.active = emp.get("ACTIVE")
            doc.effctive_from = emp.get("EFFCTIVE_FROM")
            doc.created_on = emp.get("CREATED_ON")
            doc.created_by = emp.get("CREATED_BY")
            doc.modified_on = emp.get("MODIFIED_ON")
            doc.modified_by1 = emp.get("MODIFIED_BY")
            doc.company_sponsor = emp.get("COMPANY_SPONSOR")
            doc.visa_designation = emp.get("Visa_Designation")
            doc.passport_number = emp.get("Passport_Number")
            doc.passport_expiry_date = emp.get("Passport_Expiry_Date")
            doc.personal_code = emp.get("Personal_Code")
            doc.work_permit_number = emp.get("WORK_PERMIT_NUMBER")
            doc.nationality = emp.get("NATIONALITY")
            doc.eid_number = emp.get("EID_NUMBER")
            doc.entity_name = emp.get("ENTITY_NAME")
            doc.coi_expiry_date = emp.get("COI_Expiry_Date")
            doc.coi_no = emp.get("COI_No")
            doc.vis_sponsor = emp.get("VIS_SPONSOR")
            doc.emp_salutation = emp.get("EMP_SALUTATION")
            doc.emp_confirmationdate = emp.get("EMP_CONFIRMATIONDATE")
            doc.emp_confirmation_due_on = emp.get("EMP_CONFIRMATION_DUE_ON")
            doc.emp_notice_period = emp.get("EMP_NOTICE_PERIOD")
            doc.cost_center_name = emp.get("COST_CENTER_NAME")
            doc.employee_job_status = emp.get("EMPLOYEE_JOB_STATUS")
            doc.insert(ignore_permissions=True)

        frappe.db.commit()

    except Exception:
        frappe.db.rollback()  
        frappe.log_error("HRMS Data Fetch Error", frappe.get_traceback())
        frappe.response["http_status_code"] = 500
        frappe.response["message"] = "Error fetching or posting HRMS data"


def format_date(value):
    """Return date in DD-MM-YYYY format from a datetime or date string."""
    if not value:
        return None
    try:
        date_str = value.split("T")[0] if "T" in value else value
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%d-%m-%Y")
    except Exception:
        return value 


