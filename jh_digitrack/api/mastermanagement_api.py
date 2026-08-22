import frappe

# ---------------------------------------------------------------------------
# Master Management API
# Provides fetch endpoints for:
# 1. Transportation Zone Codes
# 2. Sales District Codes
# 3. Customer Groups
# ---------------------------------------------------------------------------


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
        duplicate = frappe.db.exists(
            "Customer Registration",
            {
                "customer_name": kwargs.get("customer_name"),
                "business_name": kwargs.get("business_name"),
                "tr_number": kwargs.get("tr_number"),
                "trade_licence_number": kwargs.get("custom_trade_license_no"),
                "street": kwargs.get("custom_street"),
                "area": kwargs.get("custom_area"),
                "emirate_region": kwargs.get("custom_region"),
                "city": kwargs.get("custom_city"),
                "transportation_zone": kwargs.get("transportation_zone"),
                "customer_group": kwargs.get("customer_group"),
                "sales_district": kwargs.get("sales_district"),
                "sales_office": kwargs.get("sales_office"),
            },
        )

        if duplicate:
            frappe.local.response["http_status_code"] = 409
            return {
                "status_code": 409,
                "message": "Customer already exists.",
            }

        doc = frappe.get_doc({
            "doctype": "Customer Registration",
            "customer_name": kwargs.get("customer_name"),
            "business_name": kwargs.get("business_name"),
            "tr_number": kwargs.get("tr_number"),
            "trade_licence_number": kwargs.get("custom_trade_license_no"),
            "address": kwargs.get("address"),
            "street": kwargs.get("custom_street"),
            "area": kwargs.get("custom_area"),
            "emirate_region": kwargs.get("custom_region"),
            "city": kwargs.get("custom_city"),
            "email_id": kwargs.get("email_id"),
            "po_box": kwargs.get("po_box"),
            "transportation_zone": kwargs.get("transportation_zone"),
            "customer_group": kwargs.get("customer_group"),
            "sales_district": kwargs.get("sales_district"),
            "sales_office": kwargs.get("sales_office"),
            "custom_customer_code": kwargs.get("customer_code"),
            "custom_company_code": kwargs.get("company_code"),
        })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status_code": 200,
            "message": "Customer Created Successfully",
            "name": doc.name,
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Customer Creation Error")
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




@frappe.whitelist(methods=["POST"])
def update_customer(**kwargs):
    try:
        doc = frappe.get_doc("Customer Registration", kwargs.get("name"))

        doc.customer_name = kwargs.get("customer_name")
        doc.business_name = kwargs.get("business_name")
        doc.tr_number = kwargs.get("tr_number")
        doc.trade_licence_number = kwargs.get("custom_trade_license_no")
        doc.address = kwargs.get("address")
        doc.street = kwargs.get("custom_street")
        doc.area = kwargs.get("custom_area")
        doc.emirate_region = kwargs.get("custom_region")
        doc.city = kwargs.get("custom_city")
        doc.email_id = kwargs.get("email_id")
        doc.po_box = kwargs.get("po_box")
        doc.transportation_zone = kwargs.get("transportation_zone")
        doc.customer_group = kwargs.get("customer_group")
        doc.sales_district = kwargs.get("sales_district")
        doc.sales_office = kwargs.get("sales_office")
        doc.custom_customer_code = kwargs.get("customer_code")
        doc.custom_company_code = kwargs.get("company_code")

        doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status_code": 200,
            "message": "Customer Updated Successfully",
            "name": doc.name,
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Customer Update Error")
        frappe.local.response["http_status_code"] = 500
        return {
            "status_code": 500,
            "message": "Internal Server Error. Please contact Administrator.",
        }


# ---------------------------------------------------------------------------
# Customer Activation (SAP)
# ---------------------------------------------------------------------------

def _get_sap_customer_response():
    """
    Static stand-in for the real SAP customer master lookup.

    TODO: replace this function's body with the actual SAP API call once
    integration is available. activate_customer() below only depends on
    the response shape (a "data" list of customer records, each with
    custom_customer_code and a custom_customer_company list carrying
    company_code), so nothing else needs to change when this is swapped.
    """
    return {
        "data": [
            {
                "loyalty_program_tier": "",
                "customer_group": "Default",
                "custom_cuisine": "",
                "custom_customer_code": 1046515,
                "custom_account_group": "DOCU",
                "customer_type": "Company",
                "customer_name": "Azhr Al Madina Supermarket LLC",
                "custom_customer_name_a": "Azhr Al Madina Supermarket LLC",
                "custom_customer_name_b": "",
                "customer_name_in_arabic": "",
                "custom_customer_name_arabic_a": "",
                "custom_customer_name_arabic_b": "",
                "custom_vat_reg_no": 100363947100003,
                "account_manager": "",
                "custom_reference1_code": "Al Qouz",
                "custom_reference1_desc": "",
                "custom_reference2_code": "",
                "custom_reference2_desc": "",
                "default_currency": "AED",
                "custom_central_block": 0,
                "custom_comments": "",
                "default_price_list": "",
                "language": "",
                "customer_primary_address": "",
                "primary_address": "",
                "customer_primary_contact": "",
                "mobile_no": "",
                "email_id": "",
                "tax_id": "",
                "tax_category": "",
                "payment_terms": "",
                "loyalty_program": "",
                "default_commission_rate": "",
                "so_required": "",
                "dn_required": "",
                "is_frozen": "",
                "disabled": "",
                "custom_trade_license_no": 1144102,
                "trade_license_expiry": 20150907,
                "nationality": "English",
                "custom_jh_classification_1_code": "01",
                "custom_jh_classification_1_desc": "Modern Trade",
                "custom_jh_classification_2_code": 12,
                "custom_jh_classification_2_desc": "Hyper Market",
                "custom_jh_classification_3_code": "",
                "custom_jh_classification_3_desc": "",
                "custom_jh_classification_4_code": 18,
                "custom_jh_classification_4_desc": "Al Madina - Dubai",
                "custom_jh_classification_5_code": "",
                "custom_jh_classification_5_desc": "",
                "custom_jh_classification_6_code": "",
                "custom_jh_classification_6_desc": "",
                "custom_jh_classification_7_code": "",
                "custom_jh_classification_7_desc": "",
                "custom_jh_classification_8_code": "",
                "custom_jh_classification_8_desc": "",
                "custom_jh_classification_9_code": "",
                "custom_jh_classification_9_desc": "",
                "custom_jh_classification_10_code": "",
                "custom_jh_classification_10_desc": "",
                "custom_condition_group_1": "",
                "custom_condition_group_1_name": "",
                "custom_condition_group_2": "",
                "custom_condition_group_2_name": "",
                "custom_condition_group_3": "",
                "custom_condition_group_3_name": "",
                "custom_condition_group_4": "",
                "custom_condition_group_4_name": "",
                "custom_condition_group_5": "",
                "custom_condition_group_5_name": "",
                "custom_condition_group_6": "",
                "custom_condition_group_6_name": "",
                "custom_condition_group_7": "",
                "custom_condition_group_7_name": "",
                "custom_condition_group_8": "",
                "custom_condition_group_8_name": "",
                "custom_condition_group_9": "",
                "custom_condition_group_9_name": "",
                "custom_condition_group_10": "",
                "custom_condition_group_10_name": "",
                "custom_industry_code_1": "0001",
                "custom_industry_code_1_desc": "Industry code 01",
                "custom_industry_code_2": "",
                "custom_industry_code_2_desc": "",
                "custom_industry_code_3": "",
                "custom_industry_code_3_desc": "",
                "custom_industry_code_4": "",
                "custom_industry_code_4_desc": "",
                "custom_industry_code_5": "",
                "custom_industry_code_5_desc": "",
                "credit_limits": [
                    {
                        "company": "",
                        "credit_limit": "",
                        "bypass_credit_limit_check": "",
                    },
                ],
                "custom_customer_company": [
                    {
                        "company_code": 2100,
                        "reconaccount_code": "0013080001",
                        "reconaccount_title": "Accounts Receivable - Trade",
                        "head_office": "",
                        "sort_key": "Z41",
                        "previous_account_no": "",
                        "personnel_no": "00000000",
                        "buying_group": "",
                        "paymentterm_code": "J091",
                        "paymentterm_title": "Pay by Cash",
                        "validity_to": "00000000",
                        "payment_method": "F",
                        "payment_method_desc": "",
                        "credit_limit": "",
                        "payment_block": 0,
                        "payment_block_desc": "Free for payment",
                        "vendor_code": "",
                        "clerkinternet": "",
                        "account_customer": "",
                        "customer_insurance_no": "",
                        "block_all": 0,
                        "block_selected": 0,
                        "deletion_flag": 0,
                        "deletion_block": 0,
                        "stock_reservation_required": "",
                        "delivery_area_code": "",
                        "delivery_area_desc": "",
                        "customer_text": "",
                        "customer_type": "",
                        "reference1_code": "",
                        "reference1_desc": "",
                        "reference2_code": "",
                        "reference2_desc": "",
                        "customer_type_desc": "",
                    },
                ],
                "custom_distribution_channel": [
                    {
                        "dccode": "02",
                        "salesorganization": 2100,
                        "division": "00",
                        "salesdistrictcode": "000036",
                        "salesdistricttitle": "Al Qouz",
                        "sales_office": 2120,
                        "salesofficename": "AL Quoz",
                        "salesgroup": "",
                        "salesgroupname": "",
                        "account_at_customer": "",
                        "abc_class": "",
                        "currency": "AED",
                        "pricegroup": "",
                        "pricegroupname": "",
                        "customerpricing_procedure": 1,
                        "customerpricing_procedure_name": "Standard",
                        "pricelist": "",
                        "pricelistname": "",
                        "customerstatisticgroup": "",
                        "customerstatisticgroupname": "",
                        "authorization_group": "",
                        "customergroupcode": "02",
                        "customergrouptitle": "Restaurant",
                        "deliveryplant": 2120,
                        "deliverypriority": "02",
                        "deliveryprioritydesc": "Normal item",
                        "shipping_condition_code": "01",
                        "shipping_condition_name": "standard",
                        "rebate": 1,
                        "pricing": 1,
                        "subinvoice": 1,
                        "accountassignmentgroupcode": "01",
                        "accountassignmentgrouptitle": "Domestic Revenues",
                        "tax_indicator": 1,
                        "salespersoncode": "",
                        "salesemployee": "",
                        "emprespcode": "",
                        "empresponsible": "",
                        "merchandiserrespcode": "",
                        "merchandiserresponsible": "",
                        "checkrespcode": "",
                        "checkresponsible": "",
                        "country3": "AE",
                        "taxcategory": "MWST",
                        "taxclassification": 1,
                        "customergroup1": "002",
                        "customergroup1name": "B2B Horeca",
                        "customergroup2": "012",
                        "customergroup2name": "Horeca",
                        "customergroup3": "059",
                        "customergroup3name": "Restaurant",
                        "customergroup4": "",
                        "customergroup4name": "",
                        "customergroup5": "",
                        "customergroup5name": "",
                        "customergroup6": "",
                        "customergroup6name": "",
                        "customergroup7": "",
                        "customergroup7name": "",
                        "customergroup8": "",
                        "customergroup9name": "",
                        "customergroup10": "",
                        "customergroup10name": "",
                        "sales_order_block_all": 0,
                        "sales_order_block_selected": 0,
                        "delivery_block_all": 0,
                        "delivery_block_selected": 0,
                        "billing_block_all": 0,
                        "billing_block_selected": 0,
                        "reference1code": "",
                        "reference1desc": "",
                        "reference2code": "",
                        "reference2desc": "",
                        "customerheirarchycode": "",
                        "customerheirarchytitle": "",
                        "validityfrom": "",
                        "validityto": "",
                    },
                    {
                        "dccode": "03",
                        "salesorganization": 2100,
                        "division": "00",
                        "salesdistrictcode": "000036",
                        "salesdistricttitle": "Al Qouz",
                        "sales_office": 2120,
                        "salesofficename": "AL Quoz",
                        "salesgroup": "",
                        "salesgroupname": "",
                        "account_at_customer": "",
                        "abc_class": "",
                        "currency": "AED",
                        "pricegroup": "",
                        "pricegroupname": "",
                        "customerpricing_procedure": 1,
                        "customerpricing_procedure_name": "Standard",
                        "pricelist": "",
                        "pricelistname": "",
                        "customerstatisticgroup": "",
                        "customerstatisticgroupname": "",
                        "authorization_group": "",
                        "customergroupcode": "02",
                        "customergrouptitle": "Restaurant",
                        "deliveryplant": 2120,
                        "deliverypriority": "02",
                        "deliveryprioritydesc": "Normal item",
                        "shipping_condition_code": "01",
                        "shipping_condition_name": "standard",
                        "rebate": 1,
                        "pricing": 1,
                        "subinvoice": 1,
                        "accountassignmentgroupcode": "01",
                        "accountassignmentgrouptitle": "Domestic Revenues",
                        "tax_indicator": 1,
                        "salespersoncode": "",
                        "salesemployee": "",
                        "emprespcode": "",
                        "empresponsible": "",
                        "merchandiserrespcode": "",
                        "merchandiserresponsible": "",
                        "checkrespcode": "",
                        "checkresponsible": "",
                        "country3": "AE",
                        "taxcategory": "MWST",
                        "taxclassification": 1,
                        "customergroup1": "002",
                        "customergroup1name": "B2B Horeca",
                        "customergroup2": "012",
                        "customergroup2name": "Horeca",
                        "customergroup3": "059",
                        "customergroup3name": "Restaurant",
                        "customergroup4": "",
                        "customergroup4name": "",
                        "customergroup5": "",
                        "customergroup5name": "",
                        "customergroup6": "",
                        "customergroup6name": "",
                        "customergroup7": "",
                        "customergroup7name": "",
                        "customergroup8": "",
                        "customergroup9name": "",
                        "customergroup10": "",
                        "customergroup10name": "",
                        "sales_order_block_all": 0,
                        "sales_order_block_selected": 0,
                        "delivery_block_all": 0,
                        "delivery_block_selected": 0,
                        "billing_block_all": 0,
                        "billing_block_selected": 0,
                        "reference1code": "",
                        "reference1desc": "",
                        "reference2code": "",
                        "reference2desc": "",
                        "customerheirarchycode": "",
                        "customerheirarchytitle": "",
                        "validityfrom": "",
                        "validityto": "",
                    },
                    {
                        "dccode": "07",
                        "salesorganization": 2100,
                        "division": "00",
                        "salesdistrictcode": "000036",
                        "salesdistricttitle": "Al Qouz",
                        "sales_office": 2120,
                        "salesofficename": "AL Quoz",
                        "salesgroup": "",
                        "salesgroupname": "",
                        "account_at_customer": "",
                        "abc_class": "",
                        "currency": "AED",
                        "pricegroup": "",
                        "pricegroupname": "",
                        "customerpricing_procedure": 1,
                        "customerpricing_procedure_name": "Standard",
                        "pricelist": "",
                        "pricelistname": "",
                        "customerstatisticgroup": "",
                        "customerstatisticgroupname": "",
                        "authorization_group": "",
                        "customergroupcode": "02",
                        "customergrouptitle": "Restaurant",
                        "deliveryplant": 2120,
                        "deliverypriority": "02",
                        "deliveryprioritydesc": "Normal item",
                        "shipping_condition_code": "01",
                        "shipping_condition_name": "standard",
                        "rebate": 1,
                        "pricing": 1,
                        "subinvoice": 1,
                        "accountassignmentgroupcode": "01",
                        "accountassignmentgrouptitle": "Domestic Revenues",
                        "tax_indicator": 1,
                        "salespersoncode": "",
                        "salesemployee": "",
                        "emprespcode": "",
                        "empresponsible": "",
                        "merchandiserrespcode": "",
                        "merchandiserresponsible": "",
                        "checkrespcode": "",
                        "checkresponsible": "",
                        "country3": "AE",
                        "taxcategory": "MWST",
                        "taxclassification": 1,
                        "customergroup1": "002",
                        "customergroup1name": "B2B Horeca",
                        "customergroup2": "012",
                        "customergroup2name": "Horeca",
                        "customergroup3": "059",
                        "customergroup3name": "Restaurant",
                        "customergroup4": "",
                        "customergroup4name": "",
                        "customergroup5": "",
                        "customergroup5name": "",
                        "customergroup6": "",
                        "customergroup6name": "",
                        "customergroup7": "",
                        "customergroup7name": "",
                        "customergroup8": "",
                        "customergroup9name": "",
                        "customergroup10": "",
                        "customergroup10name": "",
                        "sales_order_block_all": 0,
                        "sales_order_block_selected": 0,
                        "delivery_block_all": 0,
                        "delivery_block_selected": 0,
                        "billing_block_all": 0,
                        "billing_block_selected": 0,
                        "reference1code": "",
                        "reference1desc": "",
                        "reference2code": "",
                        "reference2desc": "",
                        "customerheirarchycode": "",
                        "customerheirarchytitle": "",
                        "validityfrom": "",
                        "validityto": "",
                    },
                    {
                        "dccode": 11,
                        "salesorganization": 2100,
                        "division": "00",
                        "salesdistrictcode": "000036",
                        "salesdistricttitle": "Al Qouz",
                        "sales_office": 2120,
                        "salesofficename": "AL Quoz",
                        "salesgroup": "",
                        "salesgroupname": "",
                        "account_at_customer": "",
                        "abc_class": "",
                        "currency": "AED",
                        "pricegroup": "",
                        "pricegroupname": "",
                        "customerpricing_procedure": 1,
                        "customerpricing_procedure_name": "Standard",
                        "pricelist": "",
                        "pricelistname": "",
                        "customerstatisticgroup": "",
                        "customerstatisticgroupname": "",
                        "authorization_group": "",
                        "customergroupcode": "02",
                        "customergrouptitle": "Restaurant",
                        "deliveryplant": 2120,
                        "deliverypriority": "02",
                        "deliveryprioritydesc": "Normal item",
                        "shipping_condition_code": "01",
                        "shipping_condition_name": "standard",
                        "rebate": 1,
                        "pricing": 1,
                        "subinvoice": 1,
                        "accountassignmentgroupcode": "01",
                        "accountassignmentgrouptitle": "Domestic Revenues",
                        "tax_indicator": 1,
                        "salespersoncode": "",
                        "salesemployee": "",
                        "emprespcode": "",
                        "empresponsible": "",
                        "merchandiserrespcode": "",
                        "merchandiserresponsible": "",
                        "checkrespcode": "",
                        "checkresponsible": "",
                        "country3": "AE",
                        "taxcategory": "MWST",
                        "taxclassification": 1,
                        "customergroup1": "002",
                        "customergroup1name": "B2B Horeca",
                        "customergroup2": "012",
                        "customergroup2name": "Horeca",
                        "customergroup3": "059",
                        "customergroup3name": "Restaurant",
                        "customergroup4": "",
                        "customergroup4name": "",
                        "customergroup5": "",
                        "customergroup5name": "",
                        "customergroup6": "",
                        "customergroup6name": "",
                        "customergroup7": "",
                        "customergroup7name": "",
                        "customergroup8": "",
                        "customergroup9name": "",
                        "customergroup10": "",
                        "customergroup10name": "",
                        "sales_order_block_all": 0,
                        "sales_order_block_selected": 0,
                        "delivery_block_all": 0,
                        "delivery_block_selected": 0,
                        "billing_block_all": 0,
                        "billing_block_selected": 0,
                        "reference1code": "",
                        "reference1desc": "",
                        "reference2code": "",
                        "reference2desc": "",
                        "customerheirarchycode": "",
                        "customerheirarchytitle": "",
                        "validityfrom": "",
                        "validityto": "",
                    },
                    {
                        "dccode": 12,
                        "salesorganization": 2100,
                        "division": "00",
                        "salesdistrictcode": "000036",
                        "salesdistricttitle": "Al Qouz",
                        "sales_office": 2120,
                        "salesofficename": "AL Quoz",
                        "salesgroup": "",
                        "salesgroupname": "",
                        "account_at_customer": "",
                        "abc_class": "",
                        "currency": "AED",
                        "pricegroup": "",
                        "pricegroupname": "",
                        "customerpricing_procedure": 1,
                        "customerpricing_procedure_name": "Standard",
                        "pricelist": "",
                        "pricelistname": "",
                        "customerstatisticgroup": "",
                        "customerstatisticgroupname": "",
                        "authorization_group": "",
                        "customergroupcode": "02",
                        "customergrouptitle": "Restaurant",
                        "deliveryplant": 2120,
                        "deliverypriority": "02",
                        "deliveryprioritydesc": "Normal item",
                        "shipping_condition_code": "01",
                        "shipping_condition_name": "standard",
                        "rebate": 1,
                        "pricing": 1,
                        "subinvoice": 1,
                        "accountassignmentgroupcode": "01",
                        "accountassignmentgrouptitle": "Domestic Revenues",
                        "tax_indicator": 1,
                        "salespersoncode": "",
                        "salesemployee": "",
                        "emprespcode": "",
                        "empresponsible": "",
                        "merchandiserrespcode": "",
                        "merchandiserresponsible": "",
                        "checkrespcode": "",
                        "checkresponsible": "",
                        "country3": "AE",
                        "taxcategory": "MWST",
                        "taxclassification": 1,
                        "customergroup1": "002",
                        "customergroup1name": "B2B Horeca",
                        "customergroup2": "012",
                        "customergroup2name": "Horeca",
                        "customergroup3": "059",
                        "customergroup3name": "Restaurant",
                        "customergroup4": "",
                        "customergroup4name": "",
                        "customergroup5": "",
                        "customergroup5name": "",
                        "customergroup6": "",
                        "customergroup6name": "",
                        "customergroup7": "",
                        "customergroup7name": "",
                        "customergroup8": "",
                        "customergroup9name": "",
                        "customergroup10": "",
                        "customergroup10name": "",
                        "sales_order_block_all": 0,
                        "sales_order_block_selected": 0,
                        "delivery_block_all": 0,
                        "delivery_block_selected": 0,
                        "billing_block_all": 0,
                        "billing_block_selected": 0,
                        "reference1code": "",
                        "reference1desc": "",
                        "reference2code": "",
                        "reference2desc": "",
                        "customerheirarchycode": "",
                        "customerheirarchytitle": "",
                        "validityfrom": "",
                        "validityto": "",
                    },
                ],
                "addr_list": [
                    {
                        "custom_address_no": "0000433960",
                        "address_title": "",
                        "address_type": "",
                        "address_line1": "Al Qouz",
                        "address_line2": "Al Qouz",
                        "custom_address_line1_arabic": "",
                        "custom_address_line2_arabic": "",
                        "city": "Al Qouz",
                        "custom_city_arabic": "",
                        "county": "",
                        "custom_street": "Al Qouz",
                        "custom_street_arabic": "",
                        "custom_house_no": "",
                        "custom_house_no_arabic": "",
                        "state": "",
                        "emirate": "",
                        "country": "United Arab Emirates",
                        "custom_country_name": "",
                        "pincode": "",
                        "custom_po_box_no": "",
                        "custom_postal_code": "",
                        "custom_region_code": "DXB",
                        "custom_region_name": "",
                        "custom_email_ids": [{"email_id": ""}],
                        "custom_mobile_nos": [{"mobno": ""}],
                        "custom_phone_nos": [{"phone": "97143327999"}],
                        "email_id": "",
                        "phone": "",
                        "fax": "",
                        "tax_category": "",
                        "custom_transportation_zone_code": "0000000237",
                        "custom_transportation_zone_title": "Dubai - 01",
                        "is_primary_address": "",
                        "is_shipping_address": "",
                        "disabled": "",
                        "is_your_company_address": "",
                        "display": "",
                    },
                ],
                "contact_list": [
                    {
                        "custom_contact_id": "0000049543",
                        "first_name": "Ramzeer",
                        "middle_name": "Ramzeer",
                        "last_name": "Ramzeer",
                        "full_name": "",
                        "email_id": "",
                        "user": "",
                        "address": "",
                        "sync_with_google_contacts": "",
                        "status": "",
                        "salutation": "",
                        "designation": "",
                        "gender": "",
                        "phone": "",
                        "mobile_no": "",
                        "company_name": "",
                        "image": "",
                        "google_contacts": "",
                        "google_contacts_id": "",
                        "pulled_from_google_contacts": "",
                        "is_primary_contact": "",
                        "is_billing_contact": "",
                        "department": "",
                        "unsubscribed": "",
                        "email_ids": [{"is_primary": "", "email_id": ""}],
                        "phone_nos": [{"phone": "", "is_primary_phone": ""}],
                        "mobile_nos": [{"mobile": "", "is_primary_mobile_no": ""}],
                    },
                ],
            },
        ],
    }


@frappe.whitelist(methods=["POST"])
def activate_customer(customer_code, company_code):
    """
    Check the given Customer Code / Company Code against the SAP customer
    master. If a match is found, return the matched SAP record (and mark
    any local Customer Registration with the same codes Active); otherwise
    report no match.
    """
    try:
        customer_code = (customer_code or "").strip()
        company_code = (company_code or "").strip()

        if not customer_code or not company_code:
            frappe.local.response["http_status_code"] = 400
            return {
                "status_code": 400,
                "message": "Customer Code and Company Code are required.",
                "matched": False,
            }

        sap_response = _get_sap_customer_response()

        matched_record = None
        for record in sap_response.get("data", []):
            if str(record.get("custom_customer_code")) != customer_code:
                continue
            companies = record.get("custom_customer_company", [])
            if any(str(c.get("company_code")) == company_code for c in companies):
                matched_record = record
                break

        if not matched_record:
            return {
                "status_code": 404,
                "message": "No matching customer found in SAP for the given Customer Code and Company Code.",
                "matched": False,
            }

        local_name = frappe.db.get_value(
            "Customer Registration",
            {
                "custom_customer_code": customer_code,
                "custom_company_code": company_code,
            },
            "name",
        )
        if local_name:
            frappe.db.set_value(
                "Customer Registration",
                local_name,
                "custom_activation_status",
                "Active",
            )
            frappe.db.commit()

        return {
            "status_code": 200,
            "message": "Customer activated successfully.",
            "matched": True,
            "data": matched_record,
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Activate Customer Error")
        frappe.local.response["http_status_code"] = 500
        return {
            "status_code": 500,
            "message": "Internal Server Error. Please contact Administrator.",
            "matched": False,
        }



