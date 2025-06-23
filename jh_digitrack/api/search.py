import frappe

@frappe.whitelist()
def global_search(
    reporting_to: str,
    task_name: str = "",
    audit_name: str = "",
    meeting_name: str = "",
    assigned_to: str = "",
    assigned_by: str = "",
    due_date_from: str = "",
    due_date_to: str = "",
    status: str = "",
    created_date_from: str = "",
    created_date_to: str = "",
):
    # Validate that at least one search parameter has valid data
    search_params = [
        task_name.strip(),
        audit_name.strip(),
        meeting_name.strip(),
        assigned_to.strip(),
        assigned_by.strip(),
        due_date_from.strip(),
        due_date_to.strip(),
        status.strip(),
        created_date_from.strip(),
        created_date_to.strip()
    ]
    
    # Check if all search parameters are empty
    if not any(param for param in search_params):
        return {
            "data": [],
            "total_count": 0,
            "message": "Please provide at least one search parameter"
        }
    
    # Also validate reporting_to is not empty
    if not reporting_to or not reporting_to.strip():
        return {
            "data": [],
            "total_count": 0,
            "message": "Reporting to parameter is required"
        }
    
    results = []
    
    # Get team members
    team_members = [{"name": reporting_to}]
    
    # 1. AUDIT SEARCH - Only search if audit_name or date filters are provided
    audit_list = []
    if audit_name.strip():
        audit_filters = {
            "created_by": ["in", [member["name"] for member in team_members]],
        }
        
        if audit_name.strip():
            audit_filters["audit_name"] = ["like", f"%{audit_name.strip()}%"]
        
        # Apply created date filters to audit
        # if created_date_from.strip():
        #     audit_filters["creation"] = [">=", created_date_from.strip()]
        # if created_date_to.strip():
        #     if "creation" in audit_filters:
        #         audit_filters["creation"] = ["between", [created_date_from.strip(), created_date_to.strip()]]
        #     else:
        #         audit_filters["creation"] = ["<=", created_date_to.strip()]
        
        audit_list = frappe.db.get_list(
            "JH Audit Master",
            filters=audit_filters,
            fields=[
                "*",
                "created_by.full_name as created_by_name",
                "created_by.name as created_by_id",
            ],
            order_by="modified desc",
            page_length=20,
        )
    
    # 2. MEETING SEARCH - Only search if meeting_name or date filters are provided
    meeting_list = []
    if meeting_name.strip():
        meeting_filters = {
            "organizer": ["in", [member["name"] for member in team_members]],
        }
        
        if meeting_name.strip():
            meeting_filters["title"] = ["like", f"%{meeting_name.strip()}%"]
        
        # Apply created date filters to meeting
        # if created_date_from.strip():
        #     meeting_filters["creation"] = [">=", created_date_from.strip()]
        # if created_date_to.strip():
        #     if "creation" in meeting_filters:
        #         meeting_filters["creation"] = ["between", [created_date_from.strip(), created_date_to.strip()]]
        #     else:
        #         meeting_filters["creation"] = ["<=", created_date_to.strip()]
        
        meeting_list = frappe.db.get_list(
            "JH Grouped Task Master",
            filters=meeting_filters,
            fields=[
                "*",
                "organizer.full_name as organizer_name",
                "organizer.name as organizer_id",
            ],
            order_by="modified desc",
            page_length=20,
        )
    
    # 3. TASK SEARCH - Only search if task-specific filters are provided
    all_tasks = []
    
    def get_team_members_recursive(manager_id, current_level=0, max_level=5):
        if current_level >= max_level:
            return []

        direct_reports = frappe.db.get_list(
            "JH User Master", filters={"reporting_manager": manager_id}, fields=["name"]
        )

        all_team_members = direct_reports.copy()

        for member in direct_reports:
            subordinates = get_team_members_recursive(
                member.name, current_level + 1, max_level
            )
            all_team_members.extend(subordinates)

        return all_team_members

    team_members = get_team_members_recursive(reporting_to)
    team_members.append({"name": reporting_to})

    if (task_name.strip() or assigned_to.strip() or assigned_by.strip() or 
        due_date_from.strip() or due_date_to.strip() or status.strip() or
        created_date_from.strip() or created_date_to.strip()):
        
        task_filters = {
            # "assigned_to": ["in", [reporting_to]],
            "assigned_to": ["in", [member["name"] for member in team_members]],
            "deleted_at": ["is", "not set"],
            "private": ["=", 0],
            "status": ["!=", ["Closed", "Cancelled"]],
        }
        
        # Apply task-specific filters - only add if they have values
        if task_name.strip():
            task_filters["task_name"] = ["like", f"%{task_name.strip()}%"]
        if assigned_to.strip():
            task_filters["assigned_to"] = ["like", f"%{assigned_to.strip()}%"]
        if status.strip():
            task_filters["status"] = status.strip()
        
        # Apply due date filters (task-specific)
        if due_date_from.strip():
            task_filters["due_date"] = [">=", due_date_from.strip()]
        if due_date_to.strip():
            if "due_date" in task_filters:
                task_filters["due_date"] = ["between", [due_date_from.strip(), due_date_to.strip()]]
            else:
                task_filters["due_date"] = ["<=", due_date_to.strip()]
        
        # Apply created date filters to tasks
        if created_date_from.strip():
            task_filters["creation"] = [">=", created_date_from.strip()]
        if created_date_to.strip():
            if "creation" in task_filters:
                task_filters["creation"] = ["between", [created_date_from.strip(), created_date_to.strip()]]
            else:
                task_filters["creation"] = ["<=", created_date_to.strip()]
        
        # Handle assigned_by filter with permission check
        if assigned_by.strip():
            try:
                # Test permission for assigned_by field
                frappe.db.get_list("JH Task Master", filters={"name": ["!=", ""]}, fields=["created_by"], limit=1)
                task_filters["created_by"] = ["like", f"%{assigned_by.strip()}%"]
            except frappe.exceptions.PermissionError:
                pass  # Skip if no permission
        
        # Get ALL tasks matching the criteria
        try:
            all_tasks = frappe.db.get_list(
                "JH Task Master",
                filters=task_filters,
                fields=[
                    "*",
                    "assigned_to.full_name as assigned_to_name",
                    "assigned_to.name as assigned_to_id",
                    "created_by.full_name as assigned_by_name",
                    "created_by.name as assigned_by_id",
                ],
                order_by="modified desc",
                page_length=100,  # Get more tasks to properly group them
            )
        except frappe.exceptions.PermissionError:
            # Retry without created_by fields
            if "created_by" in task_filters:
                del task_filters["created_by"]
            
            all_tasks = frappe.db.get_list(
                "JH Task Master",
                filters=task_filters,
                fields=[
                    "*",
                    "assigned_to.full_name as assigned_to_name",
                    "assigned_to.name as assigned_to_id",
                ],
                order_by="modified desc",
                page_length=100,
            )
    
    # 4. ORGANIZE TASKS BY SOURCE
    # Separate tasks into categories
    standalone_tasks = []
    audit_tasks = {}  # audit_id: [tasks]
    meeting_tasks = {}  # meeting_id: [tasks]
    
    for task in all_tasks:
        source_doctype = task.get("source_doctype")
        source = task.get("source")
        
        if source_doctype and source:
            if source_doctype == "JH Audit Master":
                if source not in audit_tasks:
                    audit_tasks[source] = []
                audit_tasks[source].append(task)
            elif source_doctype == "JH Grouped Task Master":
                if source not in meeting_tasks:
                    meeting_tasks[source] = []
                meeting_tasks[source].append(task)
            else:
                # Unknown source type, treat as standalone
                standalone_tasks.append(task)
        else:
            # No source, standalone task
            standalone_tasks.append(task)
    
    # 5. BUILD RESULTS
    
    # Add standalone tasks (only if task search was performed)
    if all_tasks:  # Only add if we actually searched for tasks
        for task in standalone_tasks:
            task_result = {
                "id": task.get("name"),
                "type": "tasks",
                "name": task.get("task_name", ""),
                "created_by": task.get("assigned_by_name", ""),
                "created_date": task.get("creation", ""),
                "status": task.get("status", ""),
                "tasks": []
            }
            results.append(task_result)
    
    # Add audits with their tasks (only if audit search was performed or has matching child tasks)
    for audit in audit_list:
        audit_id = audit.get("name")
        audit_result = {
            "id": audit_id,
            "type": "audits",
            "name": audit.get("audit_name", ""),
            "created_by": audit.get("created_by_name", ""),
            "created_date": audit.get("creation", ""),
            "status": audit.get("status", ""),
            "tasks": []
        }

        # Add child tasks if they exist
        if audit_id in audit_tasks:
            for task in audit_tasks[audit_id]:
                child_task = {
                    "id": task.get("name"),
                    "name": task.get("task_name", ""),
                    "created_by": task.get("assigned_by_name", ""),
                    "created_date": task.get("creation", ""),
                    "status": task.get("status", ""),
                    "type": "tasks",
                }
                audit_result["tasks"].append(child_task)
        
        results.append(audit_result)
    
    # Add meetings with their tasks (only if meeting search was performed or has matching child tasks)
    for meeting in meeting_list:
        meeting_id = meeting.get("name")
        meeting_result = {
            "id": meeting_id,
            "type": "meetings",
            "name": meeting.get("title", ""),
            "created_by": meeting.get("organizer_name", ""),
            "created_date": meeting.get("creation", ""),
            "status": meeting.get("status", ""),
            "tasks": []
        }
        
        # Add child tasks if they exist
        if meeting_id in meeting_tasks:
            for task in meeting_tasks[meeting_id]:
                child_task = {
                    "id": task.get("name"),
                    "name": task.get("task_name", ""),
                    "created_by": task.get("assigned_by_name", ""),
                    "created_date": task.get("creation", ""),
                    "status": task.get("status", ""),
                    "type": "tasks",
                }
                meeting_result["tasks"].append(child_task)
        
        results.append(meeting_result)
    
    # 6. ADDITIONAL LOGIC: Include audits/meetings that have matching child tasks
    # even if they don't match the audit_name/meeting_name filter
    
    # Check for audits that have matching tasks but weren't included in audit_list
    for audit_id, tasks in audit_tasks.items():
        if audit_id not in [audit.get("name") for audit in audit_list]:
            # This audit wasn't in our audit_list, but has matching tasks
            # Get the audit details
            try:
                audit_doc = frappe.get_doc("JH Audit Master", audit_id)
                audit_result = {
                    "id": audit_id,
                    "type": "audits", 
                    "name": audit_doc.audit_name,
                    "created_by": frappe.db.get_value("JH User Master", audit_doc.created_by, "full_name"),
                    "created_date": audit_doc.creation,
                    "status": getattr(audit_doc, 'status', ''),
                    "tasks": []
                }
                
                # Add child tasks
                for task in tasks:
                    child_task = {
                        "id": task.get("name"),
                        "name": task.get("task_name", ""),
                        "created_by": task.get("assigned_by_name", ""),
                        "created_date": task.get("creation", ""),
                        "status": task.get("status", ""),
                        "type": "tasks",
                    }
                    audit_result["tasks"].append(child_task)
                
                results.append(audit_result)
            except:
                pass  # Skip if audit doesn't exist or permission denied
    
    # Check for meetings that have matching tasks but weren't included in meeting_list
    for meeting_id, tasks in meeting_tasks.items():
        if meeting_id not in [meeting.get("name") for meeting in meeting_list]:
            # This meeting wasn't in our meeting_list, but has matching tasks
            # Get the meeting details
            try:
                meeting_doc = frappe.get_doc("JH Grouped Task Master", meeting_id)
                meeting_result = {
                    "id": meeting_id,
                    "type": "meetings",
                    "name": getattr(meeting_doc, 'title', ''),
                    "created_by": frappe.db.get_value("JH User Master", meeting_doc.organizer, "full_name") if hasattr(meeting_doc, 'organizer') else '',
                    "created_date": meeting_doc.creation,
                    "status": getattr(meeting_doc, 'status', ''),
                    "tasks": []
                }
                
                # Add child tasks
                for task in tasks:
                    child_task = {
                        "id": task.get("name"),
                        "name": task.get("task_name", ""),
                        "created_by": task.get("assigned_by_name", ""),
                        "created_date": task.get("creation", ""),
                        "status": task.get("status", ""),
                        "type": "tasks",
                    }
                    meeting_result["tasks"].append(child_task)
                
                results.append(meeting_result)
            except:
                pass  # Skip if meeting doesn't exist or permission denied
    
    return {
        "data": results,
        "total_count": len(results)
    }