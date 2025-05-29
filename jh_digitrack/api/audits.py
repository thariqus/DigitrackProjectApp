import frappe
import csv
import io
from datetime import datetime
from werkzeug.wrappers import Response
from .helpers.clean_html import clean_html


@frappe.whitelist()
def team_audits(
    reporting_to: str, 
    search_query: str = "", 
    page: int = 1, 
    page_size: int = 100,
    status_filter: str = "",
):
    # NOTE: manager access removed for now
    # def get_team_members_recursive(manager_id, current_level=0, max_level=5):
    #     if current_level >= max_level:
    #         return []

    #     direct_reports = frappe.db.get_list(
    #         "JH User Master", filters={"reporting_manager": manager_id}, fields=["name"]
    #     )

    #     all_team_members = direct_reports.copy()

    #     for member in direct_reports:
    #         subordinates = get_team_members_recursive(
    #             member.name, current_level + 1, max_level
    #         )
    #         all_team_members.extend(subordinates)

    #     return all_team_members

    # Get team members up to 5 levels deep
    # team_members = get_team_members_recursive(reporting_to)
    team_members = []
    team_members.append({"name": reporting_to})

    filters = {
        "created_by": ["in", [member["name"] for member in team_members]],
    }
    if search_query:
        filters["audit_name"] = ["like", f"%{search_query}%"]

    # Handle status_filter as array of strings
    selected_statuses = status_filter.split(",") if status_filter else ["Open"]
    if selected_statuses and len(selected_statuses) > 0:
        if len(selected_statuses) == 1:
            filters["status"] = selected_statuses[0]
        else:
            filters["status"] = ["in", selected_statuses]

    audit_list = frappe.db.get_list(
        "JH Audit Master",
        filters=filters,
        fields=[
            "*",
            "created_by.full_name as created_by",
            "created_by.name as created_by_id",
        ],
        order_by="modified desc",
        start=(page - 1) * page_size,
        page_length=page_size,
    )

    total_audits = frappe.db.get_list(
        "JH Audit Master", filters=filters, fields=["name"]
    )

    return {"data": audit_list, "total": len(total_audits)}


@frappe.whitelist()
def add_remark(audit_id: str, comment: str, creator: str, type: str, remark: str):

    task = frappe.get_doc("JH Audit Master", audit_id)

    task.append(
        "changelog",
        {
            "comment": comment,
            "creator": creator,
            "type": type,
            "commented_at": frappe.utils.now(),
            "remark": remark,
        },
    )
    print(task)
    task.save(ignore_permissions=True)

    return "Remark added successfully"


def create_audit_csv_string(audit, tasks):
    """
    Creates a CSV string for audit tracking with tasks from the provided data structure.

    Args:
        audit_data (dict): Dictionary containing 'audit' and 'tasks' keys
            - audit: Dictionary with audit information
            - tasks: List of task dictionaries

    Returns:
        str: CSV content as a string
    """

    # Create a string buffer to write CSV data
    output = io.StringIO()
    writer = csv.writer(output)

    # Write the header information
    def write_audit_header_row(label, value="", empty_cells=9):
        """Helper function to write a header row with consistent formatting"""
        row = [label, value]
        row.extend([""] * empty_cells)  # Add empty cells for consistent formatting
        writer.writerow(row)

    # Write all header information using the helper function
    write_audit_header_row("Audited By", audit.get("business", "-"))
    write_audit_header_row(
        "Auditing", f"{audit.get('business', '-')} / {audit.get('division', '-')}"
    )
    write_audit_header_row("Created by:", audit.get("created_by", "-"))
    write_audit_header_row("Audit Name :", audit.get("audit_name", "-"))
    write_audit_header_row(
        "Audit Description :", clean_html(audit.get("audit_description", "-"))
    )
    write_audit_header_row(
        "Additional Comments :", clean_html(audit.get("additional_comments", "-"))
    )
    write_audit_header_row("File Name :", audit.get("file_name", "-"))
    write_audit_header_row("Folder Name :", audit.get("folder_name", "-"))
    write_audit_header_row("File Attachments")
    write_audit_header_row(
        "Audit Start Date :",
        (
            audit.get("start_date").strftime("%d/%m/%Y")
            if audit.get("start_date")
            else "-"
        ),
    )
    write_audit_header_row(
        "Audit Completion Date :",
        (
            audit.get("completion_date").strftime("%d/%m/%Y")
            if audit.get("completion_date")
            else "-"
        ),
    )
    write_audit_header_row("Audit Status: ", audit.get("status", "-"))
    writer.writerow(["", "", "", "", "", "", "", "", "", "", ""])

    # Write the task headers
    writer.writerow(
        [
            "ID",
            "Name",
            "Description",
            "Created Date",
            "Created By",
            "Assigned To",
            "Due Date",
            "Revised Due Date",
            "Status",
            "Completed Date",
            "Effort (Hrs)",
            "Assignee Comments",
        ]
    )

    # Write task rows
    for task in tasks:
        # # Get the last 5 comments from changelog if available
        # comments = ""
        # if task.get("changelog"):
        #     changelog = task.get("changelog", [])
        #     if isinstance(changelog, list) and len(changelog) > 0:
        #         # Get the last 5 comments
        #         recent_comments = changelog[-5:] if len(changelog) > 5 else changelog
        #         comments = "; ".join(
        #             [
        #                 f"{c.get('creator', '')}: {c.get('comment', '')}"
        #                 for c in recent_comments
        # ]
        # )

        writer.writerow(
            [
                task.get("name", "-"),
                task.get("task_name", "-"),
                clean_html(task.get("description", "-")),
                (
                    task.get("creation").strftime("%d/%m/%Y")
                    if task.get("creation")
                    else "-"
                ),
                task.get("created_by", "-"),
                task.get("assigned_to", "-"),
                (
                    task.get("due_date").strftime("%d/%m/%Y")
                    if task.get("due_date")
                    else "-"
                ),
                (
                    task.get("revised_due_date").strftime("%d/%m/%Y")
                    if task.get("revised_due_date")
                    else "-"
                ),
                task.get("status", "-"),
                (
                    task.get("completion_date").strftime("%d/%m/%Y")
                    if task.get("completion_date")
                    else "-"
                ),
                task.get("effort", "-"),
                clean_html(task.get("assignee_comments", "-")),
            ]
        )

    # Get the CSV content as a string
    csv_string = output.getvalue()
    output.close()

    return csv_string


@frappe.whitelist()
def download_csv(audit_id: str):
    """
    Downloads audit data as a CSV file.

    Args:
        audit_id (str): The ID of the audit to download

    Returns:
        dict: Dictionary containing the CSV content and filename
    """
    # Get audit data
    audit = frappe.db.get_value(
        "JH Audit Master",
        audit_id,
        [
            "*",
            "created_by.full_name as created_by",
            "created_by.name as created_by_id",
            "business.business_name as business",
            "division.division_name as division",
        ],
        as_dict=True,
    )

    # Get tasks data
    tasks = frappe.db.get_list(
        "JH Task Master",
        filters={"source": audit_id},
        fields=[
            "*",
            "created_by.full_name as created_by",
            "created_by.name as created_by_id",
            "assigned_to.full_name as assigned_to",
            "assigned_to.name as assigned_to_id",
        ],
    )

    # return {
    #     "audit": audit,
    #     "tasks": tasks,
    # }

    # Generate CSV string
    csv_string = create_audit_csv_string(audit, tasks)

    # Create filename with timestamp
    timestamp = datetime.now().strftime("%d%b%Y-%I%M %p")
    audit_name = audit.get("audit_name", f"audit_{audit_id}")
    filename = f"{audit_name}-{timestamp}.csv"

    response = Response(csv_string)
    response.headers.set("Content-Type", "text/csv")
    response.headers.set("Content-Disposition", f'attachment; filename="{filename}"')
    return response
