"""
This file contains the API endpoints for creating and retrieving JH Travel Request records.
"""

import frappe
from frappe import _
from frappe.utils import cint

ALLOWED_CREATE_ROLES = (
    "System Manager",
    "JH Digitrack Admin",
    "JH Digitrack Member",
    "JH Credit Card Holder",
    "JH Travel Workflow User",
)

# Fields a requester is allowed to set when creating a new travel request.
# Workflow/assignment fields (requested_by, request_status, assigned_to,
# po_assigned_to, etc.) are controlled server-side and must not be
# accepted from the client.
CREATABLE_FIELDS = (
    "request_type",
    "description",
    "from_city",
    "to_city",
    "from_date",
    "to_date",
    "preferred_hotel",
    "preferred_flight",
    "other_preffered_flight",
    "preferred_time",
    "is_urgent",
    "location",
    "travel_date",
    "round_trip",
    "return_date",
    "reconfirmation_required",
    "food",
    "passenger_information",
)


@frappe.whitelist(methods=["POST"])
def create_travel_request(data=None):
    user = frappe.session.user

    if user == "Guest" or not set(frappe.get_roles(user)) & set(ALLOWED_CREATE_ROLES):
        frappe.throw(_("You do not have permission to create a travel request"), frappe.PermissionError)

    if isinstance(data, str):
        data = frappe.parse_json(data)

    if not data:
        frappe.throw(_("No data received for travel request"))

    if not data.get("request_type"):
        frappe.throw(_("Request Type is required"))
    if not data.get("from_city") or not data.get("to_city"):
        frappe.throw(_("From City and To City are required"))
    if not data.get("from_date") or not data.get("to_date"):
        frappe.throw(_("From Date and To Date are required"))

    doc = frappe.new_doc("JH Travel Request")
    for fieldname in CREATABLE_FIELDS:
        if fieldname in data:
            doc.set(fieldname, data.get(fieldname))

    doc.insert()

    return {
        "message": _("Travel request created successfully."),
        "name": doc.name,
    }


@frappe.whitelist(methods=["GET"])
def get_travel_requests(request_status=None, limit_start=0, limit_page_length=20):
    user = frappe.session.user

    if user == "Guest":
        frappe.throw(_("You do not have permission to view travel requests"), frappe.PermissionError)

    filters = {}
    if request_status:
        filters["request_status"] = request_status

    requests = frappe.get_list(
        "JH Travel Request",
        filters=filters,
        fields=[
            "name",
            "request_type",
            "description",
            "request_status",
            "requested_by",
            "requested_by.full_name as requested_by_name",
            "from_city",
            "to_city",
            "from_date",
            "to_date",
            "is_urgent",
            "creation",
            "modified",
        ],
        order_by="creation desc",
        limit_start=cint(limit_start),
        limit_page_length=cint(limit_page_length) or 20,
    )

    return {"travel_requests": requests}
