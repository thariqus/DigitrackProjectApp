import frappe

import json

import requests

def to_int_or_none(value):
    value = str(value or "").strip()
    return int(value) if value.isdigit() else None



def _get_sap_status(sap_response):
    if not isinstance(sap_response, dict):
        return None

    data = sap_response.get("data")
    if isinstance(data, list):
        data = data[0] if data else None

    if isinstance(data, dict):
        return data.get("status")

    return None


# ---------------------------------------------------------------------------
# Master Management API
# Provides fetch endpoints for:
# 1. Transportation Zone Codes
# 2. Sales District Codes
# 3. Customer Groups
# ----------------------------------------------------------------------



SAP_CUSTOMER_URL = "http://10.10.10.74:50000/RESTAdapter/sap/customer/create"


def create_sap_customer(data):
    """
    Send customer details to SAP.
    """

    payload = {
    "customerName": data.get("customer_name"),
    "businessName": data.get("business_name"),
    "trNumber": data.get("tr_number"),
    "tradeLicense": data.get("custom_trade_license_no"),

    "address": {
        "street": data.get("custom_street"),
        "area": data.get("custom_area"),
        "emirate": data.get("custom_region"),
        "city": data.get("custom_city"),
        "poBox": data.get("po_box")
    },

    "contact": {
        "email": data.get("email_id"),
        "mobile": data.get("mobile_no")
    },

    "sales": {
        "customerGroup": data.get("customer_group"),
        "salesDistrict": data.get("sales_district"),
        "salesOffice": data.get("sales_office"),
        "transportationZone": data.get("transportation_zone")
    }
    }
    print("the payload *****:", payload)

    try:
        response = requests.post(
            SAP_CUSTOMER_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            auth=("JHPIPODEV", "Jhpod!nt@1972#"),
            timeout=30
        )

        try:
            sap_data = response.json()
        except ValueError:
            sap_data = {
                "raw_response": response.text
            }

        return {
            "success": response.ok,
            "status_code": response.status_code,
            "data": sap_data
        }

    except requests.exceptions.RequestException as e:
        frappe.log_error(
            frappe.get_traceback(),
            "SAP Customer Create API Error"
        )

        return {
            "success": False,
            "status_code": 500,
            "data": {
                "error": str(e)
            }
        }


# =========================================================
# SAP CUSTOMER ACTIVATION
# =========================================================

SAP_CUSTOMER_ACTIVATION_URL = "http://10.10.10.74:50000/RESTAdapter/sap/customer/activation"



def send_customer_activation_to_sap(customer_code, company_code):
    """
    Send customer activation data to SAP.

    SAP response does NOT control whether the Frappe
    Activate Customer API succeeds.
    """

    payload = {
    "customercode": customer_code,
    "Companycode": company_code,
    }
    
    try:
        print("SAP ACTIVATION PAYLOAD:", payload)

        response = requests.post(
            SAP_CUSTOMER_ACTIVATION_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            auth=("JHPIPODEV", "Jhpod!nt@1972#"),
            timeout=30,
        )

        print("SAP ACTIVATION STATUS:", response.status_code)

        try:
            sap_data = response.json()
        except ValueError:
            sap_data = {
                "raw_response": response.text
            }

        return {
            "success": response.ok,
            "status_code": response.status_code,
            "data": sap_data,
        }

    except Exception as e:
        # IMPORTANT:
        # SAP failure should NOT stop the customer from
        # being saved in the Activate Customer DocType.

        frappe.log_error(
            frappe.get_traceback(),
            "SAP Customer Activation Error"
        )

        return {
            "success": False,
            "status_code": 500,
            "data": {
                "error": str(e)
            },
        }



@frappe.whitelist()
def search_sap_customer(
    customerName=None,
    customercode=None,
    trNumber=None,
    tradeLicense=None
):
    """
    Search customer details from SAP.

    Any one field can be used for searching.
    Multiple fields can also be provided.
    """

    sap_url = "http://10.10.10.74:50000/RESTAdapter/sap/customer/customerdetails"

    sap_username = "JHPIPODEV"
    sap_password = "Jhpod!nt@1972#"

    # Clean input
    customerName = (customerName or "").strip()
    customercode = (customercode or "").strip()
    trNumber = (trNumber or "").strip()
    tradeLicense = (tradeLicense or "").strip()

    # At least one field is required
    if not any([
        customerName,
        customercode,
        trNumber,
        tradeLicense
    ]):
        frappe.throw(
            "Please enter at least one customer detail."
        )

    # Send all fields to SAP.
    # Empty fields are ignored by SAP if its API is designed
    # to treat empty values as no filter.
    payload = {
    "customerName": customerName,
    "customercode": to_int_or_none(customercode),
    "trNumber": to_int_or_none(trNumber),
    "tradeLicense": tradeLicense,
    }

    print("======================================")
    print("SAP CUSTOMER SEARCH")
    print("PAYLOAD:", payload)
    print("======================================")

    try:

        response = requests.post(
            sap_url,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            auth=(sap_username, sap_password),
            timeout=30,
        )

        print("SAP STATUS:", response.status_code)
        print("SAP RESPONSE:", response.text)

        # Try to decode SAP response
        try:
            sap_response = response.json()
        except ValueError:
            sap_response = {
                "status": "FAILED",
                "errorCode": str(response.status_code),
                "message": response.text
            }
            

        # ---------------------------------------------------------
        # SAP SUCCESS
        # ---------------------------------------------------------

        
        if response.ok:

            return {
                "success": True,
                "status_code": response.status_code,
                "data": sap_response
            }

        # ---------------------------------------------------------
        # SAP FAILURE
        # ---------------------------------------------------------

        return {
            "success": False,
            "status_code": response.status_code,
            "data": sap_response
        }

    except requests.exceptions.Timeout:

        frappe.log_error(
            frappe.get_traceback(),
            "SAP Customer Search Timeout"
        )

        return {
            "success": False,
            "status_code": 408,
            "data": {
                "status": "FAILED",
                "errorCode": "408",
                "message": "SAP customer search request timed out."
            }
        }

    except requests.exceptions.ConnectionError:

        frappe.log_error(
            frappe.get_traceback(),
            "SAP Customer Search Connection Error"
        )

        return {
            "success": False,
            "status_code": 503,
            "data": {
                "status": "FAILED",
                "errorCode": "503",
                "message": "Unable to connect to SAP customer service."
            }
        }

    except requests.exceptions.RequestException as e:

        frappe.log_error(
            frappe.get_traceback(),
            "SAP Customer Search Error"
        )

        return {
            "success": False,
            "status_code": 500,
            "data": {
                "status": "FAILED",
                "errorCode": "500",
                "message": str(e)
            }
        }

    except Exception as e:

        frappe.log_error(
            frappe.get_traceback(),
            "SAP Customer Search Unexpected Error"
        )

        return {
            "success": False,
            "status_code": 500,
            "data": {
                "status": "FAILED",
                "errorCode": "500",
                "message": str(e)
            }
        }

# =========================================================
# ACTIVATE CUSTOMER
# =========================================================

@frappe.whitelist(methods=["POST"])
def activate_customer(customer_code, company_code):
    try:

        # =====================================================
        # CLEAN INPUT
        # =====================================================

        customer_code = (customer_code or "").strip()
        company_code = (company_code or "").strip()

        # =====================================================
        # VALIDATION
        # =====================================================

        if not customer_code or not company_code:

            frappe.local.response["http_status_code"] = 400

            return {
                "status_code": 400,
                "message": "Customer Code and Company Code are required.",
            }

        # =====================================================
        # SAVE TO ACTIVATE CUSTOMER DOCTYPE
        # =====================================================

        doc = frappe.get_doc({
            "doctype": "Activate Customer",
            "customer_code": customer_code,
            "company_code": company_code,
        })

        doc.insert(ignore_permissions=True)

        frappe.db.commit()

        print("ACTIVATE CUSTOMER SAVED:", doc.name)

        # =====================================================
        # SEND TO SAP
        # =====================================================

        sap_response = send_customer_activation_to_sap(
            customer_code,
            company_code,
        )

        # =====================================================
        # RETURN SUCCESS
        # =====================================================

        return {
            "status_code": 200,
            "message": "Customer activation submitted successfully.",
            "data": {
                "name": doc.name,
                "customer_code": customer_code,
                "company_code": company_code,
            },
            "sap_response": sap_response,
        }

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Activate Customer Error"
        )

        frappe.local.response["http_status_code"] = 500

        return {
            "status_code": 500,
            "message": "Unable to save customer activation.",
        }


@frappe.whitelist(methods=["GET"])
def get_transportation_zones(search=None):
    """
    Fetch all Transportation Zone Code master records.

    Optional Parameters
    -------------------
    search : str – Filter by code or title (partial match, case-insensitive)

    Returns
    -------
    {
        "status_code": 200,
        "message": "success",
        "count": <int>,
        "data": [
            {
                "name": "...",
                "transportation_zone_code": "...",
                "transportation_zone_title": "..."
            },
            ...
        ]
    }
    """
    try:
        or_filters = {}

        if search:
            or_filters = {
                "transportation_zone_code": ["like", f"%{search}%"],
                "transportation_zone_title": ["like", f"%{search}%"],
            }

        data = frappe.db.get_all(
            "Transportation Zone Code",
            or_filters=or_filters,
            fields=["name", "transportation_zone_code", "transportation_zone_title"],
            order_by="transportation_zone_code asc",
        )

        return {
            "status_code": 200,
            "message": "success",
            "count": len(data),
            "data": data,
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Transportation Zones Error")
        frappe.local.response["http_status_code"] = 500
        return {
            "status_code": 500,
            "message": "Internal Server Error. Please contact Administrator.",
            "count": 0,
            "data": [],
        }

# ---------------------------------------------------------------------------

@frappe.whitelist(methods=["GET"])
def get_sales_districts(search=None):
    """
    Fetch all Sales District Code master records.

    Optional Parameters
    -------------------
    search : str – Filter by code or title (partial match, case-insensitive)

    Returns
    -------
    {
        "status_code": 200,
        "message": "success",
        "count": <int>,
        "data": [
            {
                "name": "...",
                "sales_district_code": "...",
                "sales_district_title": "..."
            },
            ...
        ]
    }
    """
    try:
        or_filters = {}

        if search:
            or_filters = {
                "sales_district_code": ["like", f"%{search}%"],
                "sales_district_title": ["like", f"%{search}%"],
            }

        data = frappe.db.get_all(
            "Sales District Code",
            or_filters=or_filters,
            fields=["name", "sales_district_code", "sales_district_title"],
            order_by="sales_district_code asc",
        )

        return {
            "status_code": 200,
            "message": "success",
            "count": len(data),
            "data": data,
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Sales Districts Error")
        frappe.local.response["http_status_code"] = 500
        return {
            "status_code": 500,
            "message": "Internal Server Error. Please contact Administrator.",
            "count": 0,
            "data": [],
        }

# ---------------------------------------------------------------------------

@frappe.whitelist(methods=["GET"])
def get_customer_groups(search=None):
    try:
        filters = {
            "customer_group_title": ["is", "set"]
        }

        if search:
            filters["customer_group_name"] = ["like", f"%{search}%"]

        data = frappe.db.get_all(
            "Customer Group",
            filters=filters,
            fields=[
                "name",
                "customer_group_name",
                "customer_group_title"
            ],
            order_by="customer_group_name asc",
        )

        return {
            "status_code": 200,
            "message": "success",
            "count": len(data),
            "data": data,
        }

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Get Customer Groups Error"
        )

        frappe.local.response["http_status_code"] = 500

        return {
            "status_code": 500,
            "message": "Internal Server Error. Please contact Administrator.",
            "count": 0,
            "data": [],
        }


# ---------------------------------------------------------------------------
# Customer Registration
# ---------------------------------------------------------------------------

@frappe.whitelist(methods=["POST"])
def create_customer(**kwargs):
    try:
        cust_group = frappe.db.get_value("Customer Group", kwargs.get("customer_group"), "customer_group_name")
        duplicate = frappe.db.exists(
            "Customer Registration",
            {
                "customer_name": kwargs.get("customer_name"),
                "customer_type": kwargs.get("customer_type"),
                "business_name": kwargs.get("business_name"),
                "tr_number": kwargs.get("tr_number"),
                "trade_licence_number": kwargs.get("custom_trade_license_no"),
                "street": kwargs.get("custom_street"),
                "area": kwargs.get("custom_area"),
                "emirate_region": kwargs.get("custom_region"),
                "city": kwargs.get("custom_city"),
                "site_code": kwargs.get("site_code"),
                "transportation_zone": kwargs.get("transportation_zone"),
                "customer_group": cust_group,
                "sales_district": kwargs.get("sales_district"),
                "sales_office": kwargs.get("sales_office"),
                "mobile_no": kwargs.get("mobile_no")
            },
        )

        if duplicate:
            frappe.local.response["http_status_code"] = 409
            return {
                "status_code": 409,
                "message": "Customer already exists.",
            }

        # =====================================================
        # CREATE CUSTOMER DOCUMENT
        # =====================================================

        doc = frappe.get_doc({
            "doctype": "Customer Registration",
            "customer_name": kwargs.get("customer_name"),
            "customer_type": kwargs.get("customer_type"),
            "business_name": kwargs.get("business_name"),
            "tr_number": kwargs.get("tr_number"),
            "trade_licence_number": kwargs.get("custom_trade_license_no"),
            "address": kwargs.get("address"),
            "street": kwargs.get("custom_street"),
            "area": kwargs.get("custom_area"),
            "emirate_region": kwargs.get("custom_region"),
            "city": kwargs.get("custom_city"),
            "email_id": kwargs.get("email_id"),
            "site_code": kwargs.get("site_code"),
            "po_box": kwargs.get("po_box"),
            "transportation_zone": kwargs.get("transportation_zone"),
            "customer_group": cust_group,
            "sales_district": kwargs.get("sales_district"),
            "sales_office": kwargs.get("sales_office"),
            "custom_customer_code": kwargs.get("customer_code"),
            "custom_company_code": kwargs.get("company_code"),
            "mobile_no": kwargs.get("mobile_no")
        })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        # =====================================================
        # SEND CUSTOMER DATA TO SAP
        # =====================================================
        kwargs["customer_group"] = cust_group
        sap_response = create_sap_customer(kwargs)

        # =====================================================
        # SAVE SAP RESPONSE
        # =====================================================

        doc.db_set(
            "customer_details",
            json.dumps(
                sap_response,
                indent=2,
                ensure_ascii=False
            ),
            update_modified=True
        )

           # Copy SAP's result code (data.status: "S" or "E") into Status
        doc.db_set(
            "status",
            _get_sap_status(sap_response) or "",
            update_modified=True
        )

        frappe.db.commit()

        # =====================================================
        # SEND SAVED SAP RESPONSE TO CUSTOMER MASTER API
        # ONLY IF SITE CODE IS PROVIDED
        # =====================================================

        customer_master_response = None

        if kwargs.get("site_code"):
            site_code = str(doc.site_code or "").strip()

            # The Site doctype name is the site code. Its url field holds the full
            # customer master endpoint, including the method path.
            customer_master_url = (
                frappe.db.get_value("Site", site_code, "url") or ""
            ).strip()

            if not customer_master_url:
                customer_master_response = {
                    "success": False,
                    "message": f"No URL configured for site {site_code} in the Site doctype",
                    "customer_master_called": False,
                }
            else:
                print(f"Routing to site {site_code}: {customer_master_url}")

                try:
                    # Get the exact SAP response saved in customer_details
                    saved_sap_response = json.loads(doc.customer_details)

                    sap_response_data = saved_sap_response.get("data", {})

                    if isinstance(sap_response_data, list):
                        sap_response_data = sap_response_data[0] if sap_response_data else {}

                    if not isinstance(sap_response_data, dict):
                        sap_response_data = {}

                    sap_status = sap_response_data.get("status")
                    sap_message = sap_response_data.get("message")
                    sap_code = sap_response_data.get("code")

                    print(f"DEBUG: SAP Status={sap_status}, Code={sap_code}")

                    if sap_status == "E":
                        print("SAP returned an error. Customer Master API will NOT be called.")
                        customer_master_response = {
                            "success": False,
                            "message": sap_message,
                            "code": sap_code,
                            "sap_status": sap_status,
                            "customer_master_called": False,
                        }
                    else:
                        # Extract customer data, handling the nested structure
                        customer_data = sap_response_data.get("data")

                        if customer_data is None:
                            customer_data = sap_response_data

                        if isinstance(customer_data, list):
                            customer_data = customer_data[0] if customer_data else {}

                        if not isinstance(customer_data, dict):
                            customer_master_response = {
                                "success": False,
                                "message": "Invalid customer data in saved SAP response",
                                "customer_master_called": False,
                            }
                        else:
                            custom_customer_code = customer_data.get("custom_customer_code")

                            if not custom_customer_code:
                                customer_master_response = {
                                    "success": False,
                                    "message": "custom_customer_code is missing from SAP response",
                                    "customer_master_called": False,
                                }
                            else:
                                # Convert fields the Customer doctype expects as child tables into lists
                                list_fields = [
                                    "credit_limits",
                                    "custom_customer_company",
                                    "custom_distribution_channel",
                                    "addr_list",
                                    "contact_list",
                                    "sales_team",
                                    "custom_mop",
                                ]

                                for field in list_fields:
                                    value = customer_data.get(field)

                                    if value is None or not isinstance(value, (list, dict)):
                                        customer_data[field] = []
                                    elif isinstance(value, dict):
                                        customer_data[field] = [value]

                                # Mandatory defaults for the Customer doctype
                                if not customer_data.get("customer_type"):
                                    customer_data["customer_type"] = "Company"

                                if not customer_data.get("default_currency"):
                                    customer_data["default_currency"] = "AED"

                                if not customer_data.get("customer_group"):
                                    customer_data["customer_group"] = "Default"

                                customer_data["X-Source-Site"] = site_code

                                customer_master_payload = {"data": [customer_data]}

                                print(f"DEBUG: CUSTOMER MASTER PAYLOAD for {customer_master_url}:")
                                print(json.dumps(customer_master_payload, indent=2, ensure_ascii=False, default=str))

                                response = requests.post(
                                    customer_master_url,
                                    json=customer_master_payload,
                                    headers={
                                        "Content-Type": "application/json",
                                        "Accept": "application/json",
                                    },
                                    timeout=30,
                                )

                                print(f"DEBUG: CUSTOMER MASTER HTTP STATUS: {response.status_code}")
                                print(f"DEBUG: CUSTOMER MASTER RESPONSE: {response.text}")

                                try:
                                    response_data = response.json()
                                except ValueError:
                                    response_data = {"raw_response": response.text}

                                customer_master_response = {
                                    "success": response.ok,
                                    "status_code": response.status_code,
                                    "data": response_data,
                                    "customer_master_called": True,
                                }

                except requests.exceptions.RequestException as e:
                    print(f"DEBUG: Network Error: {str(e)}")
                    frappe.log_error(
                        frappe.get_traceback(),
                        "Customer Master API Network Error"
                    )

                    customer_master_response = {
                        "success": False,
                        "status_code": 500,
                        "message": f"Network error: {str(e)}",
                        "customer_master_called": True,
                        "error_type": type(e).__name__
                    }

                except Exception as e:
                    print(f"DEBUG: Processing Error: {str(e)}")
                    frappe.log_error(
                        frappe.get_traceback(),
                        "Customer Master Processing Error"
                    )

                    customer_master_response = {
                        "success": False,
                        "status_code": 500,
                        "message": str(e),
                        "customer_master_called": False
                    }

        else:
            customer_master_response = {
                "success": False,
                "message": "Site code not provided",
                "customer_master_called": False
            }

        # =====================================================
        # RETURN RESPONSE
        # =====================================================

        return {
            "status_code": 200,
            "message": "Customer Created Successfully",
            "name": doc.name,
            "sap_response": sap_response,
            "customer_master_response": customer_master_response
        }

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Customer Creation Error"
        )

        frappe.local.response["http_status_code"] = 500

        return {
            "status_code": 500,
            "message": "Internal Server Error. Please contact Administrator.",
        }


@frappe.whitelist(methods=["GET"])
def get_customer_list(page=1, page_size=20, search=None):
    try:
        page = int(page)
        page_size = int(page_size)

        if page < 1:
            page = 1

        if page_size < 1:
            page_size = 20

        offset = (page - 1) * page_size

        filters = {}
        or_filters = []

        if search:
            search = search.strip()

            if search:
                like_search = f"%{search}%"

                or_filters = [
                    ["customer_name", "like", like_search],
                    ["customer_type", "like", like_search],
                    ["business_name", "like", like_search],
                    ["trade_licence_number", "like", like_search],
                    ["tr_number", "like", like_search],
                    ["street", "like", like_search],
                    ["area", "like", like_search],
                    ["emirate_region", "like", like_search],
                    ["city", "like", like_search],
                    ["email_id", "like", like_search],
                    ["po_box", "like", like_search],
                    ["transportation_zone", "like", like_search],
                    ["customer_group", "like", like_search],
                    ["sales_district", "like", like_search],
                    ["sales_office", "like", like_search],
                    ["status", "like", like_search],
                ]

        # ---------------------------------------------------------
        # Fetch customer data
        # ---------------------------------------------------------

        data = frappe.get_all(
            "Customer Registration",
            filters=filters,
            or_filters=or_filters,
            fields=[
                "name",
                "customer_name",
                "customer_type",
                "business_name",
                "tr_number",
                "trade_licence_number",
                "street",
                "area",
                "emirate_region",
                "city",
                "email_id",
                "po_box",
                "transportation_zone",
                "customer_group",
                "sales_district",
                "sales_office",
                "customer_details",
                "status",
            ],
            order_by="creation desc",
            limit_start=offset,
            limit_page_length=page_size,
        )

        # ---------------------------------------------------------
        # Count
        # ---------------------------------------------------------

        all_data = frappe.get_all(
            "Customer Registration",
            filters=filters,
            or_filters=or_filters,
            fields=["name"],
        )

        total = len(all_data)


        # =====================================================
        # RETURN EXISTING RESPONSE
        # =====================================================


        # ---------------------------------------------------------
        # Response
        # ---------------------------------------------------------

        return {
            "status_code": 200,
            "message": "success",
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
            "count": len(data),
            "data": data,
        }

    except Exception:
        error = frappe.get_traceback()

        frappe.log_error(
            error,
            "Get Customer List Error"
        )

        frappe.local.response["http_status_code"] = 500

        return {
            "status_code": 500,
            "message": str(error),
            "count": 0,
            "data": [],
        }



def resolve_customer_group_code(value):
    """
    Accepts a Customer Group ID (hash, e.g. 'qeoqlbl4be') or a code (e.g. '13')
    and returns the code that Customer Registration stores.
    """
    value = (value or "").strip()
    if not value:
        return ""

    # Value is the Customer Group's name/ID (hash) → return its code
    code = frappe.db.get_value("Customer Group", value, "customer_group_name")
    if code:
        return code

    # Already a code (or unknown) → keep as-is
    return value


# Frontend key → Customer Registration fieldname
CUSTOMER_UPDATE_FIELD_MAP = {
    "customer_name": "customer_name",
    "business_name": "business_name",
    "tr_number": "tr_number",
    "custom_trade_license_no": "trade_licence_number",
    "address": "address",
    "custom_street": "street",
    "custom_area": "area",
    "custom_region": "emirate_region",
    "custom_city": "city",
    "email_id": "email_id",
    "po_box": "po_box",
    "site_code": "site_code",
    "transportation_zone": "transportation_zone",
    "customer_group": "customer_group",
    "sales_district": "sales_district",
    "sales_office": "sales_office",
    "customer_code": "custom_customer_code",
    "company_code": "custom_company_code",
}


@frappe.whitelist(methods=["POST"])
def update_customer(**kwargs):
    try:
        name = (kwargs.get("name") or "").strip()

        if not name:
            frappe.local.response["http_status_code"] = 400
            return {
                "status_code": 400,
                "message": "Customer record name is required for update.",
            }

        doc = frappe.get_doc("Customer Registration", name)

        # Only update fields the frontend actually sent,
        # so fields missing from the form are not wiped out.
        for request_key, fieldname in CUSTOMER_UPDATE_FIELD_MAP.items():
            if request_key not in kwargs:
                continue

            value = kwargs.get(request_key)

            if isinstance(value, str):
                value = value.strip()

            if request_key == "customer_group":
                value = resolve_customer_group_code(value)

            doc.set(fieldname, value)

        doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status_code": 200,
            "message": "Customer Updated Successfully",
            "name": doc.name,
        }

    except frappe.DoesNotExistError:
        frappe.local.response["http_status_code"] = 404
        return {
            "status_code": 404,
            "message": f"Customer Registration '{kwargs.get('name')}' not found.",
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Customer Update Error")
        frappe.local.response["http_status_code"] = 500
        return {
            "status_code": 500,
            "message": "Internal Server Error. Please contact Administrator.",
        }



# Emirate Master API
# ---------------------------------------------------------------------------

@frappe.whitelist(methods=["GET"])
def get_emirates(search=None):
    """
    Fetch all Emirate master records.

    Optional Parameters
    -------------------
    search : str
        Filter emirates by name.

    Returns
    -------
    {
        "status_code": 200,
        "message": "success",
        "count": <int>,
        "data": [
            {
                "name": "Dubai"
            },
            ...
        ]
    }
    """

    try:
        filters = {}

        if search:
            filters = {
                "name": ["like", f"%{search}%"]
            }

        data = frappe.db.get_all(
            "Emirate",
            filters=filters,
            fields=["name"],
            order_by="name asc",
        )

        return {
            "status_code": 200,
            "message": "success",
            "count": len(data),
            "data": data,
        }

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Get Emirates Error"
        )

        frappe.local.response["http_status_code"] = 500

        return {
            "status_code": 500,
            "message": "Internal Server Error. Please contact Administrator.",
            "count": 0,
            "data": [],
        }

# site code 

@frappe.whitelist(methods=["GET"])
def get_site_code(search=None):
    try:
        filters = {}

        if search:
            filters["site_code"] = ["like", f"%{search}%"]

        data = frappe.db.get_all(
            "Site",
            filters=filters,
            fields=["site_code"],
            order_by="site_code asc",
        )

        return {
            "status_code": 200,
            "message": "success",
            "count": len(data),
            "data": data,
        }

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Get Site Code Error"
        )

        frappe.local.response["http_status_code"] = 500

        return {
            "status_code": 500,
            "message": "Internal Server Error. Please contact Administrator.",
            "count": 0,
            "data": [],
        }
