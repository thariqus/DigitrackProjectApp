import frappe
import requests

@frappe.whitelist(allow_guest=True)
def get_jh_users():
    
    site_config = frappe.get_site_config()
    api_key = site_config.get("api_key")
    api_secret = site_config.get("api_secret")
    base_url = site_config.get("scrap_base_url")

    if not api_key or not api_secret or not base_url:
        frappe.throw("Missing API credentials or base URL")

    try:
        headers = {
            "Authorization": f"token {api_key}:{api_secret}",
            "Content-Type": "application/json"
        }

        url = f"{base_url}/api/method/jh_digitrack.api.employee_requests.get_jh_users"

        resp = requests.get(url, headers=headers, timeout=10, verify=False)
        resp.raise_for_status()

        data = resp.json().get("message", [])

        return {"users": data}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Proxy JH Users Error")
        return {"message": "error", "error": str(e)}



@frappe.whitelist(allow_guest=True)
def create_jh_task(requester_name =None, email=None, category=None, idea=None):
   
    site_config = frappe.get_site_config()
    api_key = site_config.get("api_key")
    api_secret = site_config.get("api_secret")
    base_url = site_config.get("scrap_base_url")

    try:
        headers = {
            "Authorization": f"token {api_key}:{api_secret}",
            "Content-Type": "application/json"
        }

        url = f"{base_url}/api/method/jh_digitrack.api.employee_requests.create_jh_task"

        payload = {
            "requester_name": requester_name,
            "email": email,
            "category": category,
            "idea": idea
        }

        resp = requests.post(url, headers=headers, json=payload, timeout=10, verify=False)
        resp.raise_for_status()
        data = resp.json()

        return data

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Proxy Create JH Task Error")
        return {"status": "error", "message": str(e)}
