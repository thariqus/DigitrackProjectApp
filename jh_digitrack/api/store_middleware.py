import frappe
from frappe import _
import requests


# TODO: replace with Businesssiteurls lookup by mysitecode
STORE_BASE_URL = "http://store1uaejccuat.jaleel.local"
STORE_SITECODE = "2117"
API_PREFIX = "/api/method/jaleel_ho.custom_selling.sales_order_api."


def _fail(message, detail=None):
    out = {"status": "failed", "message": message}
    if detail:
        out["detail"] = detail
    return out


def _store_url(method):
    return STORE_BASE_URL.rstrip("/") + API_PREFIX + method


def _call_store(method, http_method="GET", params=None, json=None,
                headers=None, log_title="store_bridge"):
    """Call a store API. Returns (data, error_dict)."""
    url = _store_url(method)
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    try:
        response = requests.request(
            http_method,
            url,
            params=params,
            json=json,
            headers=req_headers,
            timeout=30,
        )
    except requests.exceptions.ConnectionError as e:
        frappe.log_error(frappe.get_traceback(), log_title + " conn error")
        return None, _fail("ConnectionError reaching store", str(e))
    except requests.exceptions.Timeout as e:
        frappe.log_error(frappe.get_traceback(), log_title + " timeout")
        return None, _fail("Store site timed out", str(e))
    except requests.exceptions.RequestException as e:
        frappe.log_error(frappe.get_traceback(), log_title + " failed")
        return None, _fail(type(e).__name__ + " reaching store", str(e))

    if not response.ok:
        frappe.log_error(
            "URL: {0}\nStatus: {1}\nBody: {2}".format(
                url, response.status_code, response.text[:2000]
            ),
            log_title + " HTTP error",
        )
        return None, _fail(
            "Store returned HTTP {0}".format(response.status_code),
            response.text[:500],
        )

    try:
        data = response.json()
    except ValueError:
        frappe.log_error(
            "URL: {0}\nBody: {1}".format(url, response.text[:2000]),
            log_title + " invalid JSON",
        )
        return None, _fail("Non-JSON response from store", response.text[:500])

    return data.get("message", data), None


@frappe.whitelist(allow_guest=True, methods=["POST"])
def erplogin(usr=None, pwd=None, mysitecode=None):
    """Proxy erplogin to the store site and return its response."""
    if not usr or not pwd:
        return _fail("Username and password are required")

    mysitecode = mysitecode or STORE_SITECODE

    result, err = _call_store(
        "erplogin",
        http_method="POST",
        json={"usr": usr, "pwd": pwd},
        log_title="erplogin_bridge",
    )
    if err:
        return err

    if isinstance(result, dict) and result.get("status") == "success":
        result["siteurl"] = STORE_BASE_URL.rstrip("/")
        result["sitecode"] = mysitecode

    return result


@frappe.whitelist(allow_guest=True, methods=["GET"])
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
    mysitecode=None,
):
    """
    Proxy get_sales_order_list to the store site.
    The store token (from erplogin) must be sent in the
    X-Store-Token header and is forwarded as Authorization.
    """
    store_token = frappe.get_request_header("X-Store-Token")
    if not store_token:
        return _fail("X-Store-Token header is required")

    params = {
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
    params = {k: v for k, v in params.items() if v is not None}

    result, err = _call_store(
        "get_sales_order_list",
        http_method="GET",
        params=params,
        headers={"Authorization": "token " + store_token},
        log_title="get_sales_order_list_bridge",
    )
    if err:
        return err

    return result
