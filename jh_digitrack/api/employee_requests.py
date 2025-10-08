import frappe
from datetime import datetime, timedelta

@frappe.whitelist(allow_guest=True)
def get_jh_users():
    users = frappe.get_all(
        "JH User Master",
        fields=["name", "full_name", "email"]
    )
    return {"message": users}


@frappe.whitelist(allow_guest=True)
def create_jh_task(requester_name, email, category, idea):
    if not email:
        email = "ajayan.k@jaleel.com"
    if not category or not idea:
        frappe.throw("Category and Idea are required!")

    try:
        requester_doc = frappe.get_value(
            "JH User Master",
            {"email": email},
            ["name", "business", "division"]
        )
        if not requester_doc:
            frappe.throw(f"Requester '{email}' not found in JH User Master")

        requester_docname, requester_business, division = requester_doc
        assigned_doc = frappe.get_value(
            "JH User Master",
            {"email": "ajayan.k@jaleel.com"},
            ["name"]
        )
        if not assigned_doc:
            frappe.throw("Assigned user 'Ajayan Konthoth' not found in JH User Master")

        task_name = f"{category} by {requester_name}"

        task = frappe.new_doc("JH Task Master")
        task.task_name = task_name
        task.created_by = requester_docname       
        task.assigned_to = assigned_doc       
        task.business_id = requester_business
        task.division_id = division
        task.due_date = (datetime.today() + timedelta(days=3)).date()
        task.description = idea
        task.status = "Open"

        task.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status": "success",
            "message": f"Your category: {category} has been logged in Digitrack. It can be tracked through Digitrack via task ID: {task.name}",
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Create JH Task Error")
        return {
            "status": "error",
            "message": str(e)
        }

