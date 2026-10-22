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

def api_get1(method_name, params=None):
    set_cors_headers()

    url = f"{BASE_URL}/api/method/{APP_PATH1}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()
def api_get2(method_name, params=None):
    set_cors_headers()

    url = f"{BASE_URL}/api/method/{APP_PATH2}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()

def api_get3(method_name, params=None):
    set_cors_headers()

    url = f"{BASE_URL}/api/method/{APP_PATH3}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()
def api_get4(method_name, params=None):
    set_cors_headers()

    url = f"{BASE_URL}/api/method/{APP_PATH4}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()

def api_get5(method_name, params=None):
    set_cors_headers()

    url = f"{BASE_URL}/api/method/{APP_PATH6}.{method_name}"

    response = requests.get(
        url,
        params=params,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()

def api_get6(method_name, params=None):
    set_cors_headers()

    url = f"{BASE_URL}/api/method/{APP_PATH7}.{method_name}"

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

def api_post1(method_name, data=None):
    set_cors_headers()

    url = f"{BASE_URL}/api/method/{APP_PATH1}.{method_name}"
    #url = "http://store1uaejccuat.jaleel.local/api/method/jaleel_ho.rct_api.sales_order_header.create_sales_order_header"

    response = requests.post(
        url,
        json=data,
        headers=get_headers(),
        timeout=TIMEOUT
    )

    response.raise_for_status()
    return response.json()

def api_post2(method_name, data=None):
    set_cors_headers()

    url = f"{BASE_URL}/api/method/{APP_PATH5}.{method_name}"
    #url = "http://store1uaejccuat.jaleel.local/api/method/jaleel_ho.rct_api.sales_order_header.create_sales_order_header"

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
    response = api_get("get_client_ip")

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response


@frappe.whitelist()
def get_bank_list():
    response = api_get("get_bank_list")

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response


@frappe.whitelist()
def get_server_stats():
    response = api_get("get_server_stats")

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response


@frappe.whitelist()
def get_database_health():
    response = api_get("get_database_health")

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response


@frappe.whitelist()
def get_customer_list(search):
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


@frappe.whitelist()
def get_credit_balance(customer):
    response = api_get(
        "get_credit_balance",
        {
            "customer": customer
        }
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

@frappe.whitelist()
def get_app_version():
    response = api_get("get_app_version")

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist()
def get_sales_order_may(sales_order_id):
    response = api_get(
        "get_sales_order_may",
        {
            "sales_order_id": sales_order_id
        }
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
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist()
def getdccode():
    response = api_get1("getdccode")

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response



# @frappe.whitelist()
# def get_customer_credit_data(customer):
#     response = api_get2(
#         "get_customer_credit_data",
#         {
#             "customer": customer
#         }
#     )

#     if isinstance(response, str):
#         response = json.loads(response)

#     if isinstance(response, dict) and "message" in response:
#         return response["message"]

#     return response
@frappe.whitelist()
def get_customer_credit_data(customer):
    print("customer", customer)
    response = api_get2(
        "get_customer_credit_data",
        {
            "customer": customer
        }
    )

    frappe.log_error(
        title="DEBUG CREDIT",
        message=f"TYPE={type(response)} VALUE={response}"
    )

    return response
# @frappe.whitelist()
# def create_sales_order_header(
#     customer,
#     transaction_date=None,
#     delivery_date=None,
#     company=None,
#     currency=None,
#     selling_price_list=None,
#     custom_distribution_channel_code=None,
#     custom_sales_organization_code=None,
#     custom_customer_no=None,
#     custom_location_code=None,
#     custom_transportation_zone_code=None,
#     custom_region_code=None,
#     custom_description=None,
#     custom_mobile_order=0,
#     custom_reference_code_1=None,
#     custom_reference_code_2=None,
#     custom_reference_code_3=None,
#     custom_reference_code_4=None,
#     taxes_and_charges=None,
#     set_warehouse=None,sales_order_api
#     payment_method=None,
#     customername=None,
#     custom_biller=None,
#     custom_customer_discounting_percentage=0
# ):
#     response = api_post1(
#         "create_sales_order_header",
#         {
#             "customer": customer,
#             "transaction_date": transaction_date,
#             "delivery_date": delivery_date,
#             "company": company,
#             "currency": currency,
#             "selling_price_list": selling_price_list,
#             "custom_distribution_channel_code": custom_distribution_channel_code,
#             "custom_sales_organization_code": custom_sales_organization_code,
#             "custom_customer_no": custom_customer_no,
#             "custom_location_code": custom_location_code,
#             "custom_transportation_zone_code": custom_transportation_zone_code,
#             "custom_region_code": custom_region_code,
#             "custom_description": custom_description,
#             "custom_mobile_order": custom_mobile_order,
#             "custom_reference_code_1": custom_reference_code_1,
#             "custom_reference_code_2": custom_reference_code_2,
#             "custom_reference_code_3": custom_reference_code_3,
#             "custom_reference_code_4": custom_reference_code_4,
#             "taxes_and_charges": taxes_and_charges,
#             "set_warehouse": set_warehouse,
#             "payment_method": payment_method,
#             "customername": customername,
#             "custom_biller": custom_biller,
#             "custom_customer_discounting_percentage": custom_customer_discounting_percentage
#         }
#     )

#     if isinstance(response, str):
#         response = json.loads(response)

#     if isinstance(response, dict) and "message" in response:
#         return response["message"]

#     return response

# @frappe.whitelist()
# def create_sales_order_header(**kwargs):

#     payload = {
#         "customer": kwargs.get("customer"),
#         "transaction_date": kwargs.get("transaction_date"),
#         "delivery_date": kwargs.get("delivery_date"),
#         "company": kwargs.get("company"),
#         "currency": kwargs.get("currency"),
#         "selling_price_list": kwargs.get("selling_price_list"),
#         "custom_distribution_channel_code": kwargs.get("custom_distribution_channel_code"),
#         "custom_sales_organization_code": kwargs.get("custom_sales_organization_code"),
#         "custom_customer_no": kwargs.get("custom_customer_no"),
#         "custom_location_code": kwargs.get("custom_location_code"),
#         "custom_transportation_zone_code": kwargs.get("custom_transportation_zone_code"),
#         "custom_region_code": kwargs.get("custom_region_code"),
#         "custom_description": kwargs.get("custom_description"),
#         "custom_mobile_order": kwargs.get("custom_mobile_order", 0),
#         "custom_reference_code_1": kwargs.get("custom_reference_code_1"),
#         "custom_reference_code_2": kwargs.get("custom_reference_code_2"),
#         "custom_reference_code_3": kwargs.get("custom_reference_code_3"),
#         "custom_reference_code_4": kwargs.get("custom_reference_code_4"),
#         "taxes_and_charges": kwargs.get("taxes_and_charges"),
#         "set_warehouse": kwargs.get("set_warehouse"),
#         "payment_method": kwargs.get("payment_method"),
#         "customername": kwargs.get("customername"),
#         "custom_biller": kwargs.get("custom_biller"),
#         "custom_customer_discounting_percentage": kwargs.get(
#             "custom_customer_discounting_percentage", 0
#         )
#     }
#     print("payload", payload)
#     if not payload["customer"]:
#         frappe.throw("Customer is mandatory")

#     response = api_post1(
#         "create_sales_order_header",
#         payload
#     )

#     if isinstance(response, str):
#         response = json.loads(response)

#     if isinstance(response, dict) and "message" in response:
#         return response["message"]

#     return response

@frappe.whitelist()
def create_sales_order_header():

    data = json.loads(frappe.request.data or "{}")
    print("data", data)

    response = api_post1(
        "create_sales_order_header",
        data
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist()
def GetCustomerlist(search, dccode=None):

    response = api_get(
        "GetCustomerlist",
        {
            "search": search,
            "dccode": dccode
        }
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

@frappe.whitelist()
def get_item_details(txt="", dccode=None):

    response = api_get3(
        "get_item_details",
        {
            "txt": txt,
            "dccode": dccode
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist()
def get_item_price(
    sales_order,
    item_code,
    uom,
    customer=None,
    qty=None
):
    response = api_get4(
        "get_item_price",
        {
            "sales_order": sales_order,
            "item_code": item_code,
            "uom": uom,
            "customer": customer,
            "qty": qty
        }
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
    new_item_code=None
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
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist()
def items_substitution(item_code, site=None, date_time=None):
    response = api_get3(
        "items_substitution",
        {
            "item_code": item_code,
            "site": site,
            "date_time": date_time
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist()
def submit_sales_order(
    salesorder,
    user=None,
    custom_customer_name=None,
    external_doc_no=None,
    tzc=None
):
    response = api_post2(
        "submit_sales_order",
        {
            "salesorder": salesorder,
            "user": user,
            "custom_customer_name": custom_customer_name,
            "external_doc_no": external_doc_no,
            "tzc": tzc
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_invoice(invoice_id):
    response = api_get(
        "get_invoice",
        {
            "invoice_id": invoice_id
        }
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
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist()
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
        }
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
    dc_code=None
):
    response = api_get5(
        "get_customer_purchase_trend",
        {
            "customer_id": customer_id,
            "months": months,
            "dc_code": dc_code
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

# @frappe.whitelist(allow_guest=True)
# def get_customer_purchase_trend(
#     customer_id=None,
#     months=12,
#     dc_code=None
# ):
#     response = api_get(
#         "get_customer_purchase_trend",
#         {
#             "customer_id": customer_id,
#             "months": months,
#             "dc_code": dc_code
#         }
#     )

#     if isinstance(response, str):
#         response = json.loads(response)

#     if isinstance(response, dict) and "message" in response:
#         return response["message"]

#     return response

@frappe.whitelist(allow_guest=True)
def get_stock_by_barcode(barcode):
    response = api_get(
        "get_stock_by_barcode",
        {
            "barcode": barcode
        }
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
    distribution_channel=None
):
    response = api_get(
        "get_price_by_barcode",
        {
            "barcode": barcode,
            "customer": customer,
            "distribution_channel": distribution_channel
        }
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
    cash_received_amount=None
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
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def get_so_payment_entries(sales_order):
    response = api_get(
        "get_so_payment_entries",
        {
            "sales_order": sales_order
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

@frappe.whitelist(allow_guest=True)
def GetCustomerlist1(search):
    response = api_get6(
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
def Get_allitems(search):
    response = api_get6(
        "Get_allitems",
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
def get_invoice_name_by_sales_order(sales_order):
    response = api_get(
        "get_invoice_name_by_sales_order",
        {
            "sales_order": sales_order
        }
    )

    if isinstance(response, str):
        response = json.loads(response)

    if isinstance(response, dict) and "message" in response:
        return response["message"]

    return response

