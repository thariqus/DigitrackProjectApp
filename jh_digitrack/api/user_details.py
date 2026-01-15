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


@frappe.whitelist()
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
        frappe.msgprint("username", USERNAME)
        frappe.msgprint("pasword", PASSWORD)
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
@frappe.whitelist()
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
        frappe.msgprint("entering run_post")               
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

def log_step(step, rows=None):
    msg = step if rows is None else f"{step} | rows affected: {rows}"
    frappe.log_error(msg, "HRMS SYNC DEBUG")

import frappe
from frappe import _

@frappe.whitelist()
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

def run_post_hrms_sync():
    try:
        log_step("Post HRMS sync started")

        # 1. Delete inactive employees
        frappe.db.sql("""
            DELETE FROM `tabHRMS Users`
            WHERE ACTIVE = 'Inactive'
        """)
        # log_step("Deleted inactive HRMS users", frappe.db.rowcount)
        affected = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        log_step("Deleted inactive HRMS users", affected)

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
        # log_step("Cleared non-official emails", frappe.db.rowcount)
        affected = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        log_step("Cleared non-official emails", affected)

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
        # log_step("Updated JH User Master", frappe.db.rowcount)
        affected = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        log_step("Updated JH User Master", affected)

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
        # log_step("Inserted missing JH users", frappe.db.rowcount)
        affected = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        log_step("Inserted missing JH users", affected)

        # 5. Update PMS Employees
        frappe.db.sql("""
            UPDATE `tabPMS Employees` PMS
            JOIN `tabHRMS Users` HR
              ON PMS.employee_code = HR.employee_code
            SET
                PMS.first_name = HR.first_name,
                PMS.middle_name = HR.middle_name,
                PMS.last_name = HR.last_name,
                PMS.full_name = HR.company_name,
                PMS.employee_email = HR.mail_id,
                PMS.band = HR.grade_name,
                PMS.business_unit = HR.ou_name,
                PMS.manager_name = HR.reporting_manager,
                PMS.cost_center_name = HR.cost_center_name,
                PMS.entity_name = HR.entity_name,
                PMS.ou_name = HR.ou_name,
                PMS.designation_name = HR.designation_name,
                PMS.department_name = HR.department_name,
                PMS.grade_name = HR.grade_name
        """)
        # log_step("Updated PMS Employees", frappe.db.rowcount)
        affected = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        log_step("Updated PMS Employees", affected)

        # 6. Insert missing PMS Employees
        frappe.db.sql("""
            INSERT INTO `tabPMS Employees` (
                first_name, middle_name, last_name,full_name,
                employee_email, band, business_unit, manager_name,
                cost_center_name, entity_name, ou_name,
                designation_name, department_name, grade_name,
                employee_code, name
            )
            SELECT
                HR.first_name, HR.middle_name, HR.last_name,
                HR.company_name,HR.mail_id, HR.grade_name,
                HR.ou_name, HR.reporting_manager,
                HR.cost_center_name, HR.entity_name,
                HR.ou_name, HR.designation_name,
                HR.department_name, HR.grade_name,
                HR.employee_code, HR.employee_code
            FROM `tabHRMS Users` HR
            LEFT JOIN `tabPMS Employees` PMS
              ON HR.employee_code = PMS.employee_code
            WHERE PMS.employee_code IS NULL
              AND IFNULL(HR.employee_code, '') <> ''
        """)
        # log_step("Inserted missing PMS Employees", frappe.db.rowcount)
        affected = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        log_step("Inserted missing PMS Employee", affected)


        frappe.db.sql("UPDATE `tabPMS Employees` SET pms_employee = 0")
        frappe.db.sql("""
            UPDATE `tabPMS Employees`
            SET pms_employee = 1
            WHERE grade_name LIKE '%E%'
               OR grade_name LIKE '%F%'
               OR grade_name LIKE '%G%'
        """)
        log_step("Updated PMS Employee flags")

        frappe.db.sql("UPDATE `tabPMS Employees` SET pms_manager = 0")
        frappe.db.sql("""
            UPDATE `tabPMS Employees` PMS
            JOIN `tabHRMS Users` HR
              ON PMS.employee_code = HR.reporting_manager
            SET PMS.pms_manager = 1
        """)
        log_step("Updated PMS Manager flags")

        frappe.db.sql("UPDATE `tabPMS Employees` SET pms_master = 0")
        frappe.db.sql("""
            UPDATE `tabPMS Employees`
            SET pms_master = 1
            WHERE pms_master + pms_admin + pms_manager >= 1
        """)
        log_step("Updated PMS Master flags")

        # ---------------------------------------------------------------------
        # 10. Create Manager Hierarchy in PMS Manager List (Frappe way)
        # ---------------------------------------------------------------------

        parent_doc = frappe.get_single("PMS Manager List")

        parent_doc.set("manager_hierarchy", [])
        parent_doc.save(ignore_permissions=True)
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

        parent_doc = frappe.get_doc({
            "doctype": "PMS Manager List",
            "manager": "ROOT",  
            "manager_hierarchy": []
        })

        for row in manager_hierarchy:
            hr_reporting = frappe.get_value(
                "HRMS Users",
                row["reporting_manager_id"],
                ["company_name", "mail_id"],
                as_dict=True
            ) or {}

            hr_manager = frappe.get_value(
                "HRMS Users",
                row["manager_id"],
                ["company_name", "mail_id"],
                as_dict=True
            ) or {}

            parent_doc.append("manager_hierarchy", {
                "reporting_manager_name": row["reporting_manager_id"],
                "reporting_manager_email": hr_reporting.get("mail_id"),
                "manager_name": row["manager_id"],
                "manager_email": hr_manager.get("mail_id"),
                "level": row["level"]
            })

        parent_doc.save(ignore_permissions=True)

        log_step("Manager hierarchy recreated successfully")





    except Exception:
        frappe.db.rollback()
        frappe.log_error(
            frappe.get_traceback(),
            "Post HRMS Scheduler Sync Failed"
        )
        raise










# "allow_cors": "*",
#  "db_name": "_bcdf1df7ff368872",
#  "db_password": "xiA5fdUKEw4ay5F7",
#  "db_type": "mariadb",
#  "developer_mode": 1,
#  "encryption_key": "27vqKpOf6G8evy0Xu0oU6regmfrUr7ihD4_VPPED3Ws=",
#  "production_mode": 0,
#  "base_url": "http://127.0.0.1:8003",
#  "hrms_base_url": "https://hrms.jaleelholdings.com/cloudapi",
#  "hrms_api_username":  "JALEEL" ,  
#  "hrms_api_password": "jaleel123",
#  "api_no": "API0001",
#  "api_key": "8e7d0df1392584d",
#  "api_secret": "794cb76e45ae5e1",
#  "scrap_base_url": "https://digitrack.jaleelholdings.com"
import pymysql
import time
 




def get_datafrom_mysql(query: str, params: list = None):
    start_time = time.time()
 
    connection = pymysql.connect(
        host='127.0.0.1',  # remove leading zero from .07
        user='_bcdf1df7ff368872',
        password='xiA5fdUKEw4ay5F7',
        database='_bcdf1df7ff368872',
        port=3306,
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5,
        read_timeout=10,
        write_timeout=10
    )
 
 
 
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params or ())
            result = cursor.fetchall()
            return result
    finally:
        connection.close()
        print(f"Query executed in {time.time() - start_time:.2f} seconds")


@frappe.whitelist()
def get_header_details_of_Invoice():
    data=[]
    query = """ CALL sp_digtrack_userdata_migration()"""
    log_step("Manager hierarchy created in PMS Manager List")
   
    params = []
    return get_datafrom_mysql(query, params)