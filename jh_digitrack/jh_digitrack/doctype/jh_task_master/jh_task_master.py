# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class JHTaskMaster(Document):
    def before_insert(self):
        try:
            previous_tasks = frappe.get_last_doc(
                "JH Task Master",
                filters={
                    "source": self.source,
                    "source_doctype": self.source_doctype,
                },
            )
            if previous_tasks:
                self.serial_number = int(previous_tasks.serial_number) + 1
            else:
                self.serial_number = 1
        except Exception as e:
            print(e)
            self.serial_number = 1
