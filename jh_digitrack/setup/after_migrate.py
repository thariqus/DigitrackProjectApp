import frappe
from jh_digitrack.setup.create_jh_admin import create_jh_admin
from jh_digitrack.setup.preload_data import preload_jh_travel_request_type
from jh_digitrack.setup.preload_property_data import preload_property_renewal_reminders, preload_property_workflow_tat


def run():
    create_jh_admin()
    preload_jh_travel_request_type()
    preload_property_renewal_reminders()
    preload_property_workflow_tat()
