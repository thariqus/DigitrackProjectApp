import frappe
import requests

@frappe.whitelist(allow_guest=True)
def proxy_scrapitem_search(search=None, item_name=None):
    search = frappe.local.form_dict.get("search") or frappe.local.request.args.get("search")
    item_name = frappe.local.form_dict.get("item_name") or frappe.local.request.args.get("item_name")

    site_config = frappe.get_site_config()
    api_key = site_config.get("api_key")
    api_secret = site_config.get("api_secret")
    base_url = site_config.get("scrap_base_url")
    if not api_key or not api_secret:
        frappe.throw("API credentials not found")

    if search:
        prod_url = f"{base_url}/api/method/jh_digitrack.api.scrapitem_search.search_scrapitem?search={search}"
    elif item_name:
        prod_url = f"{base_url}/api/method/jh_digitrack.api.scrapitem_search.get_item_details?item_name={item_name}"
    else:
        return {"message": {"message": []}, "error": "No search or item_name provided"}

    try:
        headers = {
            "Authorization": f"token {api_key}:{api_secret}",
            "Content-Type": "application/json"
        }

        resp = requests.get(prod_url, headers=headers, timeout=10, verify=False)
        resp.raise_for_status()
        return resp.json()

    except requests.RequestException as e:
        frappe.log_error(f"Proxy Error: {str(e)}", "proxy_scrapitem_search")
        return {"message": {"message": []}, "error": str(e)}
