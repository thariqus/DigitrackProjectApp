
import frappe
from frappe import _ 
import requests
import json
from frappe.utils.error import log_error

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

        created_docs = []

        for emp in employees:
            doc = frappe.new_doc("HRMS Users")
            doc.employee_code = emp.get("EMPLOYEE_CODE")
            doc.first_name = emp.get("FIRST_NAME")
            doc.last_name = emp.get("LAST_NAME")
            doc.middle_name = emp.get("MIDDLE_NAME")
            doc.company_name = emp.get("COMPANY_NAME")
            doc.date_of_joining = emp.get("DATE_OF_JOINING")
            doc.dob = emp.get("DOB")
            doc.gender = emp.get("GENDER")
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
            created_docs.append(doc.name)

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "HRMS Users Bulk Creation Error")
        frappe.response["http_status_code"] = 500
        frappe.response["message"] = "Error while creating HRMS Users"

def delete_existing_hrms_users():
    frappe.db.sql("DELETE FROM `tabHRMS Users`")
    frappe.db.commit()

