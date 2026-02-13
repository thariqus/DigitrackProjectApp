import frappe
import requests

@frappe.whitelist(allow_guest=True, methods=["GET"])
def proxy_emp_search(search=None, name=None):
    search = frappe.local.form_dict.get("search") or frappe.local.request.args.get("search")
    name = frappe.local.form_dict.get("name") or frappe.local.request.args.get("name")

    site_config = frappe.get_site_config()
    api_key = site_config.get("api_key")
    api_secret = site_config.get("api_secret")
    base_url = site_config.get("scrap_base_url")

    if search:
        prod_url = f"{base_url}/api/method/jh_digitrack.api.employee_search.search_employees?search={search}"
    elif name:
        prod_url = f"{base_url}/api/method/jh_digitrack.api.employee_search.get_employee_details?name={name}"
    else:
        return
    try:
        headers = {
            "Authorization": f"token {api_key}:{api_secret}",
            "Content-Type": "application/json"
        }

        resp = requests.get(prod_url, headers=headers, timeout=10, verify=False)
        resp.raise_for_status()
        data = resp.json()

        return data

    except requests.RequestException as e:
        frappe.log_error(f"Proxy Error: {str(e)}", "proxy_emp_search")
        return {"message": {"message": []}, "error": str(e)}


