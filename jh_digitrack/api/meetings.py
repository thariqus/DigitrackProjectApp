import frappe
import csv
import io
from datetime import datetime
from werkzeug.wrappers import Response
from .helpers.clean_html import clean_html


@frappe.whitelist()
def team_meetings(
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
        "organizer": ["in", [member["name"] for member in team_members]],
    }
    if search_query:
        filters["title"] = ["like", f"%{search_query}%"]

    # Handle status_filter as array of strings
    selected_statuses = status_filter.split(",") if status_filter else ["Open"]
    if selected_statuses and len(selected_statuses) > 0:
        if len(selected_statuses) == 1:
            filters["status"] = selected_statuses[0]
        else:
            filters["status"] = ["in", selected_statuses]

    meeting_list = frappe.db.get_list(
        "JH Grouped Task Master",
        filters=filters,
        fields=[
            "*",
            "organizer.full_name as organizer",
            "organizer.name as organizer_id",
        ],
        order_by="modified desc",
        start=(page - 1) * page_size,
        page_length=page_size,
    )

    total_meetings = frappe.db.get_list(
        "JH Grouped Task Master", filters=filters, fields=["name"]
    )

    return {"data": meeting_list, "total": len(total_meetings)}


@frappe.whitelist()
def add_remark(meeting_id: str, comment: str, creator: str, type: str, remark: str):

    task = frappe.get_doc("JH Grouped Task Master", meeting_id)

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

def create_meeting_csv_string(meeting, tasks, intenal_participants):
    """
    Creates a CSV string for meeting tracking with tasks from the provided data structure.

    Args:
        meeting_data (dict): Dictionary containing 'meeting' and 'tasks' keys
            - meeting: Dictionary with meeting information
            - tasks: List of task dictionaries

    Returns:
        str: CSV content as a string
    """

    # Create a string buffer to write CSV data
    output = io.StringIO()
    writer = csv.writer(output)

    participant_names = [participant.get("user_name") for participant in intenal_participants if intenal_participants]
    internal_participants_text = ",".join(participant_names) if participant_names else "-"
    # Write the header information
    def write_meeting_header_row(label, value="", empty_cells=9):
        """Helper function to write a header row with consistent formatting"""
        row = [label, value]
        row.extend([""] * empty_cells)  # Add empty cells for consistent formatting
        writer.writerow(row)

    # Write all header information using the helper function
    write_meeting_header_row("Organizer", meeting.get("organizer_name", "-"))
    write_meeting_header_row("Created Date", meeting.get('creation', '-').strftime("%d/%m/%Y"))
    write_meeting_header_row("Meeting Date", meeting.get('meeting_date', '-'))
    write_meeting_header_row("Duration (in mins)", meeting.get('duration', '-'))
    write_meeting_header_row("Location / Meeting Room", meeting.get('location', '-'))
    write_meeting_header_row("Title", meeting.get("title", "-"))
    write_meeting_header_row("Type", meeting.get("type", "-"))
    write_meeting_header_row("Agenda", clean_html(meeting.get("agenda", "-")))
    write_meeting_header_row("Participants External", meeting.get("participants_external", "-"))
    write_meeting_header_row("Internal Participants", internal_participants_text)
    write_meeting_header_row("remarks", clean_html(meeting.get("remarks", "-")))
    write_meeting_header_row(
        "Meeting Completion Date :",
        (
            meeting.get("completion_date").strftime("%d/%m/%Y")
            if meeting.get("completion_date")
            else "-"
        ),
    )
    write_meeting_header_row("Meeting Status: ", meeting.get("status", "-"))
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
def download_csv(meeting_id: str):
    """
    Downloads meeting data as a CSV file.

    Args:
        meeting_id (str): The ID of the meeting to download

    Returns:
        dict: Dictionary containing the CSV content and filename
    """
    # Get meeting data
    meeting = frappe.db.get_value(
        "JH Grouped Task Master",
        meeting_id,
        [
            "*",
            "organizer.full_name as organizer_name",
            "organizer.name as organizer_id",
        ],
        as_dict=True,
    )

    intenal_participants = frappe.db.get_list(  
        "JH User Child Table",
        filters={"parent": meeting_id},
        fields=[
            "user.full_name as user_name"
        ],
        ignore_permissions=True
    )

    # Get tasks data
    tasks = frappe.db.get_list(
        "JH Task Master",
        filters={"source": meeting_id},
        fields=[
            "*",
            "created_by.full_name as created_by",
            "created_by.name as created_by_id",
            "assigned_to.full_name as assigned_to",
            "assigned_to.name as assigned_to_id",
        ],
    )

    # Generate CSV string
    csv_string = create_meeting_csv_string(meeting, tasks, intenal_participants)

    # Create filename with timestamp
    timestamp = datetime.now().strftime("%d%b%Y-%I%M %p")
    meeting_name = meeting.get("title", f"meeting_{meeting_id}")
    filename = f"{meeting_name}-{timestamp}.csv"

    response = Response(csv_string)
    response.headers.set("Content-Type", "text/csv")
    response.headers.set("Content-Disposition", f'attachment; filename="{filename}"')
    return response
