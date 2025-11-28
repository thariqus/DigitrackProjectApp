# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class GoalAssessment(Document):

    def before_save(self):
        if not self.is_new():
            old_doc = frappe.get_doc("Goal Assessment", self.name)
            old_goal_ids = {row.goal_id for row in old_doc.employee_goals if row.goal_id}
        else:
            old_goal_ids = set()

        new_goal_ids = {row.goal_id for row in self.employee_goals if row.goal_id}

        added_goals = new_goal_ids - old_goal_ids

        removed_goals = old_goal_ids - new_goal_ids

        for goal_id in added_goals:
            goal_doc = frappe.get_doc("JH Goal Master", goal_id)
            if not goal_doc.goal_assigned:
                goal_doc.goal_assigned = 1
                goal_doc.save(ignore_permissions=True)

        for goal_id in removed_goals:
            if not frappe.db.exists(
                "Goal Assesment Employee Goals",
                {"goal_id": goal_id}
            ):
                goal_doc = frappe.get_doc("JH Goal Master", goal_id)
                goal_doc.goal_assigned = 0
                goal_doc.save(ignore_permissions=True)

        frappe.db.commit()


    def on_trash(self):
    
        for row in self.employee_goals:
            goal_id = row.goal_id
            if goal_id:
                still_exists = frappe.db.exists(
                    "Goal Assesment Employee Goals",
                    {"goal_id": goal_id, "parent": ["!=", self.name]}
                )

                if not still_exists:
                    goal_doc = frappe.get_doc("JH Goal Master", goal_id)
                    goal_doc.goal_assigned = 0
                    goal_doc.save(ignore_permissions=True)

        frappe.db.commit()
