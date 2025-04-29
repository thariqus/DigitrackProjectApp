import frappe
from jh_digitrack.setup.create_jh_admin import create_jh_admin
from jh_digitrack.setup.preload_data import preload_jh_travel_request_type


def run():
    create_jh_admin()
    preload_jh_travel_request_type()
