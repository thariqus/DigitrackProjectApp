import frappe
import requests

APP_PATH = "jaleel_ho.custom_selling.sales_order_api"

SITE_CODE = "2113"

BASE_URL = " http://store1uaejccuat.jaleel.local/"
TOKEN = "10c944b5d516e9d:e77d840bdf7a9c8"

TIMEOUT = 60

def set_cors_headers():
    frappe.local.response["Access-Control-Allow-Origin"] = "*"
    frappe.local.response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    frappe.local.response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"

def get_headers():
    headers = {
        "Content-Type": "application/json"
    }

    if TOKEN:
        headers["Authorization"] = f"Token {TOKEN}"

    return headers


def api_get(method_name, params=None):
    set_cors_headers()

    url = f"{BASE_URL}/api/method/{APP_PATH}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()

    return response.json()


def api_post(method_name, data=None):

    set_cors_headers()

    url = f"{BASE_URL}/api/method/{APP_PATH}.{method_name}"

    response = requests.post(
        url,
        json=data,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()

    return response.json()


@frappe.whitelist()
def get_client_ip():
    set_cors_headers()
    return api_get(
        "get_client_ip"
    )


@frappe.whitelist()
def get_bank_list():

    set_cors_headers()
    return api_get(
        "get_bank_list"
    )


@frappe.whitelist()
def get_server_stats():

    set_cors_headers()
    return api_get(
        "get_server_stats"
    )


@frappe.whitelist()
def get_database_health():

    set_cors_headers()
    return api_get(
        "get_database_health"
    )


@frappe.whitelist()
def get_customer_list(search):

    set_cors_headers()
    return api_get(
        "GetCustomerlist",
        {
            "search": search
        }
    )


@frappe.whitelist()
def get_credit_balance(customer):
    set_cors_headers()
    return api_get(
        "get_credit_balance",
        {
            "customer": customer
        }
    )


@frappe.whitelist(allow_guest=True)
def erplogin(
    usr,
    pwd,
    mysitecode
):
    set_cors_headers()
    return api_post(
        "erplogin",
        {
            "usr": usr,
            "pwd": pwd,
            "mysitecode": mysitecode
        }
    )
