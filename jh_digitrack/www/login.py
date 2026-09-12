# import frappe
# from frappe.www.login import get_context as frappe_login_context

# def get_context(context):
#     # Get original frappe login context (THIS IS THE MAGIC)
#     frappe_login_context(context)

#     # Optional: override title
#     context.title = "DIGI TRACK"

#     return context

import frappe
from frappe.www.login import get_context as frappe_login_context
 
no_cache = 1
 
 
def get_context(context):
    # Get original frappe login context (THIS IS THE MAGIC)
    frappe_login_context(context)
 
    # Optional: override title
    context.title = "DIGI TRACK"
 
    return context