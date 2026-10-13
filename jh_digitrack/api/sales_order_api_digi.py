import requests
from typing import Dict, Any, Optional


class JaleelPublicAPI:
    """
    Generic Client for Jaleel ERP Public APIs
    """

    APP_PATH = "jaleel_ho.custom_selling.sales_order_api"

    def __init__(
        self,
        base_url: str,
        token: Optional[str] = None,
        timeout: int = 60
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.token = token

    def _headers(self):
        headers = {
            "Content-Type": "application/json"
        }

        if self.token:
            headers["Authorization"] = f"Token {self.token}"

        return headers

    def _get(self, method_name, params=None):
        url = f"{self.base_url}/api/method/{self.APP_PATH}.{method_name}"

        response = requests.get(
            url,
            params=params,
            headers=self._headers(),
            timeout=self.timeout
        )

        response.raise_for_status()
        return response.json()

    def _post(self, method_name, data=None):
        url = f"{self.base_url}/api/method/{self.APP_PATH}.{method_name}"

        response = requests.post(
            url,
            json=data,
            headers=self._headers(),
            timeout=self.timeout
        )

        response.raise_for_status()
        return response.json()

    # ==========================================
    # LOGIN
    # ==========================================

    def erplogin(self, usr, pwd, mysitecode):
        return self._post(
            "erplogin",
            {
                "usr": usr,
                "pwd": pwd,
                "mysitecode": mysitecode
            }
        )

    # ==========================================
    # SALES ORDER
    # ==========================================

    def create_sales_order_header(self, **kwargs):
        return self._post("create_sales_order_header", kwargs)

    def add_sales_order_item(self, **kwargs):
        return self._post("add_sales_order_item", kwargs)

    def trigger_stock_reservation(self, sales_order):
        return self._post(
            "trigger_stock_reservation",
            {"sales_order": sales_order}
        )

    def get_sales_order_list(self, **kwargs):
        return self._get("get_sales_order_list", kwargs)

    def get_express_order_list(self, **kwargs):
        return self._get("get_express_order_list", kwargs)

    def submit_sales_order(self, **kwargs):
        return self._post("submit_sales_order", kwargs)

    def get_sales_order(self, sales_order_id):
        return self._get(
            "get_sales_order_may",
            {"sales_order_id": sales_order_id}
        )

    def delete_sales_order_item(self, **kwargs):
        return self._post("delete_sales_order_item", kwargs)

    def manual_delete_row(self, **kwargs):
        return self._post("manual_delete_row", kwargs)

    def update_sales_order_totals(self, docname):
        return self._post(
            "update_sales_order_totals",
            {"docname": docname}
        )

    # ==========================================
    # ITEMS
    # ==========================================

    def get_item_by_barcode(self, **kwargs):
        return self._get("get_item_by_barcode", kwargs)

    def get_price_by_barcode(self, **kwargs):
        return self._get("get_price_by_barcode", kwargs)

    def get_stock_by_barcode(self, barcode):
        return self._get(
            "get_stock_by_barcode",
            {"barcode": barcode}
        )

    def get_substitution_items(self, **kwargs):
        return self._get("get_substitution_items", kwargs)

    # ==========================================
    # CUSTOMER
    # ==========================================

    def get_customer_list(self, search):
        return self._get(
            "GetCustomerlist",
            {"search": search}
        )

    def get_credit_balance(self, customer):
        return self._get(
            "get_credit_balance",
            {"customer": customer}
        )

    # ==========================================
    # PAYMENT
    # ==========================================

    def create_payment_entry(self, **kwargs):
        return self._post(
            "create_payment_entry_v2",
            kwargs
        )

    def get_so_payment_entries(self, sales_order):
        return self._get(
            "get_so_payment_entries",
            {"sales_order": sales_order}
        )

    def get_card_authorization(
        self,
        name,
        amount,
        reference_doctype="Multiple Payment Entry"
    ):
        return self._post(
            "get_card_authorization",
            {
                "name": name,
                "amount": amount,
                "reference_doctype": reference_doctype
            }
        )

    # ==========================================
    # INVOICE
    # ==========================================

    def get_invoice_list(self, **kwargs):
        return self._get("get_invoice_list", kwargs)

    def get_invoice(self, invoice_id):
        return self._get(
            "get_invoice",
            {"invoice_id": invoice_id}
        )

    def get_invoice_name_by_sales_order(
        self,
        sales_order
    ):
        return self._get(
            "get_invoice_name_by_sales_order",
            {"sales_order": sales_order}
        )

    # ==========================================
    # STOCK / UOM
    # ==========================================

    def get_available_qty(
        self,
        item_code,
        uom,
        warehouse
    ):
        return self._get(
            "get_available_qty",
            {
                "item_code": item_code,
                "uom": uom,
                "warehouse": warehouse
            }
        )

    def get_item_conversion_factor(
        self,
        item_code,
        uom
    ):
        return self._get(
            "get_item_conversion_factor",
            {
                "item_code": item_code,
                "uom": uom
            }
        )

    def get_item_stock_uom(
        self,
        item_code
    ):
        return self._get(
            "get_item_stock_uom",
            {"item_code": item_code}
        )

    def validate_availability(
        self,
        item_code,
        sales_uom,
        requested_qty,
        warehouse
    ):
        return self._get(
            "validate_availability",
            {
                "item_code": item_code,
                "sales_uom": sales_uom,
                "requested_qty": requested_qty,
                "warehouse": warehouse
            }
        )

    # ==========================================
    # SETTINGS
    # ==========================================

    def get_jaleel_settings(self):
        return self._get("get_jaleel_settings")

    def get_server_stats(self):
        return self._get("get_server_stats")

    def get_database_health(self):
        return self._get("get_database_health")

    def get_client_ip(self):
        return self._get("get_client_ip")

    def get_bank_list(self):
        return self._get("get_bank_list")

    # ==========================================
    # MAX ORDER / TAX
    # ==========================================

    def get_max_order_qty(
        self,
        item_code,
        distribution_channel=None,
        customer=None,
        site=None
    ):
        return self._get(
            "get_max_order_qty",
            {
                "item_code": item_code,
                "distribution_channel": distribution_channel,
               "customer": customer,
                "site": site
            }
        )

    def get_item_tax_percent(
        self,
        item_tax_code,
        customer_tax_code
    ):
        return self._get(
            "get_item_tax_percent",
            {
                "item_tax_code": item_tax_code,
                "customer_tax_code": customer_tax_code
            }
        )