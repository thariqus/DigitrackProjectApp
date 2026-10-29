# Copyright (c) 2025, Bytsolv and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class GoalAssessment(Document):

    def validate(self):
        """Sanitize HTML in text fields to prevent XSS attacks"""
        if self.comment:
            self.comment = frappe.utils.sanitize_html(self.comment, always_sanitize=True)

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


    def on_update(self):
        # Goal Submitted / Evaluation Submitted emails are disabled for now.
        # Re-enable by calling self.send_status_based_email() here.
        pass

    def send_status_based_email(self):
        if self.status not in ("Goal Submitted", "Evaluation Submitted"):
            return

        if not self.has_value_changed("status"):
            return

        if not self.employee_code:
            return

        employee_email = frappe.db.get_value(
            "JH User Master",
            {"employee_code": self.employee_code},
            "email"
        )

        if not employee_email:
            return

        manager_email = self.manager

        site_config = frappe.get_site_config()
        base_url = site_config.get("base_url")

        portal_url = f"{base_url}/PMS/self-evaluation-history"

        if self.status == "Goal Submitted":
            subject = "J-Reflect – Goal Submission Completed"
            message_body = (
                f"Dear {self.employee_name or 'Employee'},<br><br>"
                "Your goals have been successfully submitted for the current assessment period.<br><br>"
                f"Please visit your <a href='{portal_url}'>PMS portal</a> to track progress.<br><br>"
                "<p style='color:#666; font-size:12px;'>"
                "Note:This email inbox is not actively monitored."
                "</p><br>"
                "Best regards,<br>"
                "J-Reflect"
            )

        elif self.status == "Evaluation Submitted":
            subject = "J-Reflect – Evaluation Submission Completed"
            message_body = (
                f"Dear {self.employee_name or 'Employee'},<br><br>"
                "Your performance evaluation has been successfully submitted.<br><br>"
                f"Please visit your <a href='{portal_url}'>PMS portal</a> for details.<br><br>"
                "<p style='color:#666; font-size:12px;'>"
                "Note:This email inbox is not actively monitored."
                "</p><br>"
                "Best regards,<br>"
                "J-Reflect"
            )

        try:
            frappe.sendmail(
                expose_recipients="header",
                recipients=[employee_email],
                cc=[manager_email] if manager_email else None,
                subject=subject,
                message=message_body,
                now=True,
                delayed=False
            )
            frappe.log_error(f"Email sent to {employee_email}", "PMS DEBUG")
        except Exception:
            frappe.log_error(frappe.get_traceback(), "PMS Status Email Failed")
