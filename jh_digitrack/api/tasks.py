import frappe

@frappe.whitelist()
def team_tasks(reporting_to: str):
    current_level = frappe.get_doc("JH User Master", reporting_to)
    team_members = frappe.db.get_list("JH User Master", 
                                      {"reporting_manager": reporting_to},
                                        ["name", "full_name", "email"])
    
    tasks = frappe.db.get_list("JH Tasks Master", 
                               filters={"assigned_to": ["in", [member.name for member in team_members]]} ,
                               fields=["*", "assigned_to.full_name as assigned_to","assigned_to.name as assigned_to_id"])
   
    # Restructure the data to match the desired format
    result = {
        "id": current_level.name,
        "full_name": current_level.full_name,
        "reportees": []
    }
    
    # Group tasks by assigned_to_id
    tasks_by_user = {}
    for task in tasks:
        if task.assigned_to_id not in tasks_by_user:
            tasks_by_user[task.assigned_to_id] = []
        
        tasks_by_user[task.assigned_to_id].append(task)
    
    # Create reportees structure
    for member in team_members:
        # Count reportees for this team member
        reportee_count = frappe.db.count("JH User Master", {"reporting_manager": member.name})
        
        reportee = {
            "id": member.name,
            "full_name": member.full_name,
            "reportee_count": reportee_count,
            "tasks": tasks_by_user.get(member.name, [])
        }
        
        result["reportees"].append(reportee)
   
    return result