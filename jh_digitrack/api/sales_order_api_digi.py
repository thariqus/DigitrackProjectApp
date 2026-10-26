import frappe
import requests
import json

APP_PATH = "jaleel_ho.custom_selling.sales_order_api"
APP_PATH1= "jaleel_ho.rct_api.sales_order_header"
APP_PATH2= "jaleel_ho.rct_api.customer"
APP_PATH3= "jaleel_ho.rct_api.item_api"
APP_PATH4= "jaleel_ho.rct_api.ifs_sales_order"
APP_PATH5= "jaleel_ho.rct_api.submit_so"
APP_PATH6 = "jaleel_ho.custom_selling.customer_api"
APP_PATH7 = "jaleel_ho.custom_selling.report.business_instant_insights.business_instant_insights"
SITE_CODE = "2113"
BASE_URL = "http://store1uaejccuat.jaleel.local"
TOKEN = "10c944b5d516e9d:e77d840bdf7a9c8"
TIMEOUT = 60


def set_cors_headers():
    frappe.local.response.setdefault("headers", {})
    frappe.local.response["headers"].update({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    })


def get_headers():
    headers = {
        "Content-Type": "application/json"
    }

    if TOKEN:
        headers["Authorization"] = f"Token {TOKEN}"

    return headers

def api_get(method_name, params=None,mysitecode=None):
    print("mysitecodein get", mysitecode)
    set_cors_headers()
    if not mysitecode:
        frappe.throw(("mysitecode is required."))
    BASE_URL=frappe.db.get_value("Site", mysitecode, "url")
    print("BASE_URL", BASE_URL)
    url = f"{BASE_URL}/api/method/{APP_PATH}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()

def api_get1(method_name, params=None, mysitecode=None):
    set_cors_headers()
    if not mysitecode:
        frappe.throw(("mysitecode is required."))
    BASE_URL=frappe.db.get_value("Site", mysitecode, "url")
    url = f"{BASE_URL}/api/method/{APP_PATH1}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()
def api_get2(method_name, params=None,mysitecode=None):
    set_cors_headers()
    if not mysitecode:
        frappe.throw(("mysitecode is required."))
    BASE_URL=frappe.db.get_value("Site", mysitecode, "url")
    url = f"{BASE_URL}/api/method/{APP_PATH2}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()

def api_get3(method_name, params=None, mysitecode=None):
    set_cors_headers()
    if not mysitecode:
        frappe.throw(("mysitecode is required."))
    BASE_URL=frappe.db.get_value("Site", mysitecode, "url")
    url = f"{BASE_URL}/api/method/{APP_PATH3}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()
def api_get4(method_name, params=None, mysitecode=None):
    set_cors_headers()
    if not mysitecode:
        frappe.throw(("mysitecode is required."))
    BASE_URL=frappe.db.get_value("Site", mysitecode, "url")
    url = f"{BASE_URL}/api/method/{APP_PATH4}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()

def api_get5(method_name, params=None, mysitecode=None):
    set_cors_headers()
    if not mysitecode:
        frappe.throw(("mysitecode is required."))
    BASE_URL=frappe.db.get_value("Site", mysitecode, "url")    
    url = f"{BASE_URL}/api/method/{APP_PATH6}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()

def api_get6(method_name, params=None, mysitecode=None):
    set_cors_headers()
    if not mysitecode:
        frappe.throw(("mysitecode is required."))
    BASE_URL=frappe.db.get_value("Site", mysitecode, "url")
    url = f"{BASE_URL}/api/method/{APP_PATH7}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()


def api_post(method_name, data=None,mysitecode=None):
    set_cors_headers()
    if not mysitecode:
        frappe.throw(("mysitecode is required."))
    BASE_URL=frappe.db.get_value("Site", mysitecode, "url")
    url = f"{BASE_URL}/api/method/{APP_PATH}.{method_name}"

    response = requests.post(
        url,
        json=data,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()

def api_post1(method_name, data=None, mysitecode=None):
    set_cors_headers()
    if not mysitecode:
        frappe.throw(("mysitecode is required."))
    BASE_URL=frappe.db.get_value("Site", mysitecode, "url")

    url = f"{BASE_URL}/api/method/{APP_PATH1}.{method_name}"

    response = requests.post(
        url,
        json=data,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()

def api_post2(method_name, data=None, mysitecode=None):
    set_cors_headers()
    if not mysitecode:
        frappe.throw(("mysitecode is required."))
    BASE_URL=frappe.db.get_value("Site", mysitecode, "url")
    url = f"{BASE_URL}/api/method/{APP_PATH5}.{method_name}"

    response = requests.post(
        url,
        json=data,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()


@frappe.whitelist(allow_guest=True)
def get_client_ip(mysitecode=None):
    print("mysitecode", mysitecode)
    response = api_get("get_client_ip", mysitecode=mysitecode)

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response


@frappe.whitelist(allow_guest=True)
def get_bank_list(mysitecode=None):
    response = api_get("get_bank_list", mysitecode=mysitecode)

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response


@frappe.whitelist(allow_guest=True)
def get_server_stats(mysitecode=None):
    response = api_get("get_server_stats", mysitecode=mysitecode)

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response


@frappe.whitelist(allow_guest=True)
def get_database_health(mysitecode=None):
    response = api_get("get_database_health", mysitecode=mysitecode)

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response


@frappe.whitelist(allow_guest=True)
def get_customer_list(search, mysitecode=None):
    response = api_get(
        "GetCustomerlist",
        {
            "search": search
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response


@frappe.whitelist(allow_guest=True)
def get_credit_balance(customer, mysitecode=None):
    response = api_get(
        "get_credit_balance",
        {
            "customer": customer
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response


@frappe.whitelist(allow_guest=True)
def erplogin(usr, pwd, mysitecode):
    response = api_post(
        "erplogin",
        {
            "usr": usr,
            "pwd": pwd,
            "mysitecode": mysitecode
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_app_version(mysitecode=None):
    response = api_get("get_app_version", mysitecode=mysitecode)

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_sales_order_may(sales_order_id, mysitecode=None):
    response = api_get(
        "get_sales_order_may",
        {
            "sales_order_id": sales_order_id
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_sales_order_list(
    user=None,
    page=1,
    page_size=20,
    status=None,
    from_date=None,
    to_date=None,
    customer=None,
    distribution_channel_code=None,
    biller_email=None,
    biller_user=None,
    mysitecode=None
):
    response = api_get(
        "get_sales_order_list",
        {
            "user": user,
            "page": page,
            "page_size": page_size,
            "status": status,
            "from_date": from_date,
            "to_date": to_date,
            "customer": customer,
            "distribution_channel_code": distribution_channel_code,
            "biller_email": biller_email,
            "biller_user": biller_user,
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def getdccode(mysitecode=None):
    response = api_get1("getdccode",mysitecode=mysitecode)

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_customer_credit_data(customer, mysitecode=None):
    print("customer", customer)
    response = api_get2(
        "get_customer_credit_data",
        {
            "customer": customer
        },
        mysitecode=mysitecode
    )

    frappe.log_error(
        title="DEBUG CREDIT",
        message=f"TYPE={type(response)} VALUE={response}"
    )

    return response


@frappe.whitelist(allow_guest=True)
def create_sales_order_header(mysitecode=None):

    data = json.loads(frappe.request.data or "{}")
    print("data", data)

    response = api_post1(
        "create_sales_order_header",
        data,
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def GetCustomerlist(search, dccode=None, mysitecode=None):

    response = api_get(
        "GetCustomerlist",
        {
            "search": search,
            "dccode": dccode
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return {
            "status_code": 200,
            "message": "sucess",
            "data": response["message"]
        }

    return response

@frappe.whitelist(allow_guest=True)
def get_item_details(txt="", dccode=None, mysitecode=None):

    response = api_get3(
        "get_item_details",
        {
            "txt": txt,
            "dccode": dccode
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_item_price(
    sales_order,
    item_code,
    uom,
    customer=None,
    qty=None,
    mysitecode=None
):
    response = api_get4(
        "get_item_price",
        {
            "sales_order": sales_order,
            "item_code": item_code,
            "uom": uom,
            "customer": customer,
            "qty": qty
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_item_by_barcode(
    barcode=None,
    uom=None,
    warehouse=None,
    requested_qty=None,
    customer=None,
    distribution_channel=None,
    sales_order=None,
    user=None,
    type=None,
    new_uom=None,
    new_item_code=None,
    mysitecode=None
):
    response = api_get(
        "get_item_by_barcode",
        {
            "barcode": barcode,
            "uom": uom,
            "warehouse": warehouse,
            "requested_qty": requested_qty,
            "customer": customer,
            "distribution_channel": distribution_channel,
            "sales_order": sales_order,
            "user": user,
            "type": type,
            "new_uom": new_uom,
            "new_item_code": new_item_code
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def items_substitution(item_code, site=None, date_time=None, mysitecode=None):
    response = api_get3(
        "items_substitution",
        {
            "item_code": item_code,
            "site": site,
            "date_time": date_time
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def submit_sales_order(
    salesorder,
    user=None,
    custom_customer_name=None,
    external_doc_no=None,
    tzc=None,
    mysitecode=None
):
    response = api_post2(
        "submit_sales_order",
        {
            "salesorder": salesorder,
            "user": user,
            "custom_customer_name": custom_customer_name,
            "external_doc_no": external_doc_no,
            "tzc": tzc
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_invoice(invoice_id, mysitecode=None):
    response = api_get(
        "get_invoice",
        {
            "invoice_id": invoice_id
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_invoice_list(
    customer=None,
    page=1,
    page_size=20,
    status=None,
    from_date=None,
    to_date=None,
    distribution_channel_code=None,
    mysitecode=None
):
    response = api_get(
        "get_invoice_list",
        {
            "customer": customer,
            "page": page,
            "page_size": page_size,
            "status": status,
            "from_date": from_date,
            "to_date": to_date,
            "distribution_channel_code": distribution_channel_code,
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_express_order_list(
    user=None,
    page=1,
    page_size=20,
    status=None,
    from_date=None,
    to_date=None,
    customer=None,
    distribution_channel_code=None,
    biller_email=None,
    biller_user=None,
    mysitecode=None
):
    response = api_get(
        "get_express_order_list",
        {
            "user": user,
            "page": page,
            "page_size": page_size,
            "status": status,
            "from_date": from_date,
            "to_date": to_date,
            "customer": customer,
            "distribution_channel_code": distribution_channel_code,
            "biller_email": biller_email,
            "biller_user": biller_user,
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_customer_purchase_trend(
    customer_id=None,
    months=12,
    dc_code=None,
    mysitecode=None
):
    response = api_get5(
        "get_customer_purchase_trend",
        {
            "customer_id": customer_id,
            "months": months,
            "dc_code": dc_code
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response


@frappe.whitelist(allow_guest=True)
def get_stock_by_barcode(barcode, mysitecode=None):
    response = api_get(
        "get_stock_by_barcode",
        {
            "barcode": barcode
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_price_by_barcode(
    barcode,
    customer=None,
    distribution_channel=None,
    mysitecode=None
):
    response = api_get(
        "get_price_by_barcode",
        {
            "barcode": barcode,
            "customer": customer,
            "distribution_channel": distribution_channel
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def create_payment_entry_v2(
    docname,
    doctype,
    payment_type,
    recieved_amount,
    user=None,
    card_bank=None,
    rrn_number=None,
    authorization_code=None,
    cash_received_amount=None,
    mysitecode=None
):
    response = api_post(
        "create_payment_entry_v2",
        {
            "docname": docname,
            "doctype": doctype,
            "payment_type": payment_type,
            "recieved_amount": recieved_amount,
            "user": user,
            "card_bank": card_bank,
            "rrn_number": rrn_number,
            "authorization_code": authorization_code,
            "cash_received_amount": cash_received_amount
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_so_payment_entries(sales_order, mysitecode=None):
    response = api_get(
        "get_so_payment_entries",
        {
            "sales_order": sales_order
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def GetCustomerlist1(search, mysitecode=None):
    response = api_get6(
        "GetCustomerlist",
        {
            "search": search
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def Get_allitems(search, mysitecode=None):
    response = api_get6(
        "Get_allitems",
        {
            "search": search
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_invoice_name_by_sales_order(sales_order, mysitecode=None):
    response = api_get(
        "get_invoice_name_by_sales_order",
        {
            "sales_order": sales_order
        },
        mysitecode=mysitecode
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

