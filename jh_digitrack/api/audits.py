import frappe

@frappe.whitelist()
def team_audits(reporting_to: str, search_query: str = "", page: int = 1, page_size: int = 100):
    def get_team_members_recursive(manager_id, current_level=0, max_level=5):
        if current_level >= max_level:
            return []
            
        direct_reports = frappe.db.get_list("JH User Master", 
                                           filters={"reporting_manager": manager_id},
                                           fields=["name"])
        
        all_team_members = direct_reports.copy()
        
        for member in direct_reports:
            subordinates = get_team_members_recursive(member.name, current_level + 1, max_level)
            all_team_members.extend(subordinates)
            
        return all_team_members
    
    # Get team members up to 5 levels deep
    team_members = get_team_members_recursive(reporting_to)
    team_members.append({"name":reporting_to})

    filters = {
        "created_by": ["in", [member["name"] for member in team_members]],
    }
    if search_query:
        filters["audit_name"] = ["like", f"%{search_query}%"]

    audit_list = frappe.db.get_list(
        "JH Audits", 
        filters=filters, 
        fields=["*", "created_by.full_name as created_by", "created_by.name as created_by_id"],
        order_by="modified desc",
        start=(page - 1) * page_size,
        page_length=page_size,
        )
    

    total_audits = frappe.db.get_list(
        "JH Audits", 
        filters=filters,
        fields=["name"]
        )

    return {
        "data": audit_list,
        "total": len(total_audits)
    }


@frappe.whitelist()
def add_remark(audit_id: str, comment: str, creator: str, type: str, remark: str):

    task = frappe.get_doc("JH Audits", audit_id)
    
    task.append("changelog", {
        "comment": comment,
        "creator": creator,
        "type": type,
        "commented_at": frappe.utils.now(),
        "remark": remark
    })
    print(task)
    task.save(ignore_permissions=True)
    
    return "Remark added successfully"