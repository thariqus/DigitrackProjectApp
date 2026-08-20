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
    """
    Fetch all Customer Group master records.

    Optional Parameters
    -------------------
    search : str – Filter by group name or custom title (partial match,
    case-insensitive)

    Returns
    -------
    {
        "status_code": 200,
        "message": "success",
        "count": <int>,
        "data": [
            {
                "name": "...",
                "customer_group_name": "...",
                "custom_customer_group_title": "...",
                "parent_customer_group": "..."
            },
            ...
        ]
    }
    """
    try:
        or_filters = {}

        if search:
            or_filters = {
                "customer_group_name": ["like", f"%{search}%"],
                "custom_customer_group_title": ["like", f"%{search}%"],
            }

        data = frappe.db.get_all(
            "Customer Group",
            or_filters=or_filters,
            fields=["name", "customer_group_name", "custom_customer_group_title", "parent_customer_group"],
            order_by="customer_group_name asc",
        )

        return {
            "status_code": 200,
            "message": "success",
            "count": len(data),
            "data": data,
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Get Customer Groups Error")
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
        offset = (page - 1) * page_size

        or_filters = {}

        if search:
            like_search = ["like", f"%{search}%"]
            or_filters = {
                "customer_name": like_search,
                "business_name": like_search,
                "trade_licence_number": like_search,
                "tr_number": like_search,
                "street": like_search,
                "area": like_search,
                "emirate_region": like_search,
                "city": like_search,
                "email_id": like_search,
                "po_box": like_search,
                "transportation_zone": like_search,
                "customer_group": like_search,
                "sales_district": like_search,
                "sales_office": like_search,
            }

        fields = [
            "name",
            "customer_name",
            "business_name",
            "tr_number",
            "trade_licence_number as custom_trade_license_no",
            "street as custom_street",
            "area as custom_area",
            "emirate_region as custom_region",
            "city as custom_city",
            "email_id",
            "po_box",
            "transportation_zone",
            "customer_group",
            "sales_district",
            "sales_office",
        ]

        data = frappe.db.get_all(
            "Customer Registration",
            or_filters=or_filters,
            fields=fields,
            order_by="creation desc",
            limit_page_length=page_size,
            limit_start=offset,
        )

        total = frappe.db.get_all(
            "Customer Registration",
            or_filters=or_filters,
            fields=["count(name) as total"],
        )[0]["total"]

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
        frappe.log_error(frappe.get_traceback(), "Get Customer List Error")
        frappe.local.response["http_status_code"] = 500
        return {
            "status_code": 500,
            "message": "Internal Server Error. Please contact Administrator.",
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



