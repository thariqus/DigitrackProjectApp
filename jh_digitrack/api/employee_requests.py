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
    use_default_user = False
    if not email or not requester_name:
        requester_name = "Ajayan Konthoth"
        email = "ajayan.k@jaleel.com"
        use_default_user = True

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

        if use_default_user:
            task_name = f"{category} by (Email ID not shared)"
        else:
            task_name = f"{category} by {requester_name}"
        frappe.set_user(email)
        task = frappe.new_doc("JH Task Master")
        task.task_name = task_name
        task.created_by = requester_docname       
        task.assigned_to = assigned_doc       
        task.business_id = requester_business
        task.division_id = division
        task.due_date = (datetime.today() + timedelta(days=3)).date()
        task.description = idea
        task.status = "Open"
        task.source_doctype = "JH Grouped Task Master"
        task.source =  "GPT00008"

        task.insert(ignore_permissions=True)
        frappe.db.commit()
        frappe.set_user("Administrator")
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

