import frappe
from jh_digitrack import __version__ as app_version


@frappe.whitelist()
def get_app_version():
    return {
        "app_version": app_version,
    }
