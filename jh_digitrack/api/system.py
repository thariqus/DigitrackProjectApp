import frappe
from jh_digitrack import __version__ as app_version


@frappe.whitelist()
def get_app_version():
    return {
        "app_version": app_version,
    }

@frappe.whitelist()
def maintenance_mode():
    jh_digitrack_settings = frappe.get_doc("JH Digitrack Settings")

    if jh_digitrack_settings.maintenance_from and jh_digitrack_settings.maintenance_to:
        current_time = frappe.utils.now()
        if jh_digitrack_settings.maintenance_from <= current_time <= jh_digitrack_settings.maintenance_to:
            return {
                "maintenance_mode": True,
                "maintenance_from": jh_digitrack_settings.maintenance_from,
                "maintenance_to": jh_digitrack_settings.maintenance_to,
            }
    else:
        return {
            "maintenance_mode": False,
        }