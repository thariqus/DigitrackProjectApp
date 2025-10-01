# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class JHScrapItem(Document):
	pass


# jh_digitrack/jh_digitrack/doctype/jh_scrap_item/jh_scrap_item.py
# import frappe
# from frappe.model.document import Document

# class JHScrapItem(Document):
#     def validate(self):
#         # Maximum file size in bytes (e.g., 5MB)
#         max_size = 5 * 1024 * 1024  

#         # List of fields to check
#         file_fields = ["image1", "image2", "image3"]

#         for fieldname in file_fields:
#             file_url = getattr(self, fieldname)
#             if file_url:
#                 try:
#                     file_doc = frappe.get_doc("File", file_url)
#                     if file_doc.file_size > max_size:
#                         frappe.throw(
#                             f"File in '{fieldname}' exceeds the maximum allowed size of 5MB."
#                         )
#                 except frappe.DoesNotExistError:
                    # pass  # Ignore if file not yet uploaded or missing
