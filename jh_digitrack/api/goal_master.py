
import frappe

@frappe.whitelist(allow_guest=True)
def get_goals(created_by=None):
    """
    Fetch all active goals. Optionally filter by the user who created them.
    Example calls:
      /api/method/jh_digitrack.api.goal_master.get_goals
      /api/method/jh_digitrack.api.goal_master.get_goals?created_by=adhil@example.com
    """
    query_filters = {"inactive": 0}

    if created_by:
        query_filters["owner"] = created_by

    goals = frappe.get_all(
        "JH Goal Master",
        filters=query_filters,
        fields=[
            "name",
            "goal_name",
            "goal_description",
            "measurement_criteria",
            "goal_assigned"
        ],
        order_by="creation desc"
    )

    return goals



@frappe.whitelist()
def add_goal(goal_name, goal_description, measurement_criteria, target="", created_by=None, created_date=None):
    goal_doc = frappe.new_doc("JH Goal Master")
    goal_doc.goal_name = goal_name
    goal_doc.goal_description = goal_description
    goal_doc.measurement_criteria = measurement_criteria
    goal_doc.target = target
    goal_doc.created_by = created_by or frappe.session.user
    goal_doc.created_date = created_date or frappe.utils.now_datetime() 
    goal_doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True, "goal": goal_doc.as_dict()}


@frappe.whitelist()
def edit_goal(name, goal_name, goal_description, measurement_criteria, target="", modified_by=None, modified_date=None):
    doc = frappe.get_doc("JH Goal Master", name)
    doc.goal_name = goal_name
    doc.goal_description = goal_description
    doc.measurement_criteria = measurement_criteria
    doc.target = target
    doc.modified_by = modified_by or frappe.session.user
    doc.modified_date = modified_date or frappe.utils.now_datetime() 
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True, "goal": doc.as_dict()}
