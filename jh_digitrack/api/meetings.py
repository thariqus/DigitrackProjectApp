import frappe
import csv
import io
from datetime import datetime
from werkzeug.wrappers import Response
from .helpers.wrap_text import wrap_text
from .helpers.clean_html import clean_html
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
import re


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
            "Comments",
        ]
    )

    # Write task rows
    for task in tasks:
        comments = frappe.db.get_list(
            "Comment",
            filters={"reference_name": task.get("name"), "comment_type":"Comment", "reference_doctype":"JH Task Master"},
            fields=["*"],
            ignore_permissions=True,
            order_by="creation desc",
        )

        commentsLogs = []
        for comment in comments:
            if comments:
                creation = comment.get("creation")
                # format datetime
                if isinstance(creation, str):
                    creation = datetime.strptime(creation, "%Y-%m-%d %H:%M:%S")
                formatted_creation = creation.strftime("%d-%m-%Y,%H:%M")
                commentsLogs.append(
                    f"{comment.get('content')} : {comment.get('comment_by')} : {formatted_creation}"
                )

        commentsLogsList = "\n".join(commentsLogs) if commentsLogs else "-"
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
                commentsLogsList,
            ]
        )

    # Get the CSV content as a string
    csv_string = output.getvalue()
    output.close()

    return csv_string


def create_meeting_pdf_content(meeting, tasks, internal_participants):
    """
    Creates a PDF document for meeting tracking with tasks.
    
    Args:
        meeting (dict): Dictionary with meeting information
        tasks (list): List of task dictionaries
        internal_participants (list): List of internal participants
        
    Returns:
        bytes: PDF content as bytes
    """
    
    # Create a byte buffer for PDF content
    buffer = io.BytesIO()
    
    # Create the PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.black
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        spaceBefore=12,
        textColor=colors.black
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )
    
    # Story to hold all content
    story = []
    
    # Title
    story.append(Paragraph("Meeting Report", title_style))
    story.append(Spacer(1, 20))
    
    # Meeting Information Section
    story.append(Paragraph("Meeting Information", heading_style))
    
    # Prepare participant names with proper wrapping
    participant_names = [participant.get("user_name") for participant in internal_participants if internal_participants]
    internal_participants_text = ", ".join(participant_names) if participant_names else "-"
    # Wrap long participant list
    internal_participants_wrapped = wrap_text(internal_participants_text, 80)
    
    # Meeting details table with wrapped content
    meeting_data = [
        ["Organizer", wrap_text(meeting.get("organizer_name", "-"), 40)],
        ["Title", wrap_text(meeting.get("title", "-"), 40)],
        ["Type", wrap_text(meeting.get("type", "-"), 40)],
        ["Created Date", meeting.get('creation', '-').strftime("%d/%m/%Y") if meeting.get('creation') else '-'],
        ["Meeting Date", str(meeting.get('meeting_date', '-'))],
        ["Duration (mins)", str(meeting.get('duration', '-'))],
        ["Location", wrap_text(meeting.get('location', '-'), 40)],
        ["Status", meeting.get("status", "-")],
        ["External Participants", wrap_text(meeting.get("participants_external", "-"), 80)],
        ["Internal Participants", internal_participants_wrapped],
        ["Completion Date", meeting.get("completion_date").strftime("%d/%m/%Y") if meeting.get("completion_date") else "-"],
        ["Agenda", clean_html(wrap_text(meeting.get("agenda", "-"), 80))],
        ["Remarks", clean_html(wrap_text(meeting.get("remarks", "-"), 80))],
    ]
    
    meeting_table = Table(meeting_data, colWidths=[2.2*inch, 5*inch])
    meeting_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    story.append(meeting_table)
    story.append(Spacer(1, 20))
    
    # Task Details Section
    if tasks:
        story.append(Spacer(1, 20))
        story.append(Paragraph("Tasks", heading_style))
            
        for i, task in enumerate(tasks, 1):
            story.append(Paragraph(f"Task {i}: {task.get('task_name', 'Unnamed Task')}", 
                                    ParagraphStyle('TaskTitle', parent=styles['Heading3'], fontSize=12, textColor=colors.black)))
                
            # Task comments
            commentsLogs = []
            comments = frappe.db.get_list(
                "Comment",
                filters={
                    "reference_name": task.get("name"), 
                    "comment_type": "Comment", 
                    "reference_doctype": "JH Task Master"
                },
                fields=["*"],
                ignore_permissions=True,
                order_by="creation desc",
            )
                
            if comments:
                for comment in comments[:5]:  # Limit to 5 most recent comments
                    creation = comment.get("creation")
                    if isinstance(creation, str):
                        creation = datetime.strptime(creation, "%Y-%m-%d %H:%M:%S")
                    formatted_creation = creation.strftime("%d-%m-%Y, %H:%M")
                    commentsLogs.append(f"• {wrap_text(comment.get('content', ''), 80)} - {comment.get('comment_by', '')} ({formatted_creation})")

            commentsLogsList = "\n".join(commentsLogs) if commentsLogs else "-"

            # Task details
            task_detail_data = [
                ["Task ID", wrap_text(task.get("name", "-"), 40)],
                ["Created By", wrap_text(task.get("created_by", "-"), 40)],
                ["Assigned To", wrap_text(task.get("assigned_to", "-"), 40)],
                ["Created Date", task.get("creation").strftime("%d/%m/%Y") if task.get("creation") else "-"],
                ["Due Date", task.get("due_date").strftime("%d/%m/%Y") if task.get("due_date") else "-"],
                ["Revised Due Date", task.get("revised_due_date").strftime("%d/%m/%Y") if task.get("revised_due_date") else "-"],
                ["Completion Date", task.get("completion_date").strftime("%d/%m/%Y") if task.get("completion_date") else "-"],
                ["Status", task.get("status", "-")],
                ["Effort (Hours)", str(task.get("effort", "-"))],
                ["Description", clean_html(wrap_text(task.get("description", "-"), 80))],
                ["Assignee Comments", clean_html(wrap_text(task.get("assignee_comments", "-"), 80))],
                ["Comments", commentsLogsList]
            ]
                
            detail_table = Table(task_detail_data, colWidths=[2.2*inch, 5*inch])
            detail_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
                
            story.append(detail_table)
            story.append(Spacer(1, 15))
    
    # Build PDF
    doc.build(story)
    
    # Get PDF content
    pdf_content = buffer.getvalue()
    buffer.close()
    
    return pdf_content


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


@frappe.whitelist()
def download_pdf(meeting_id: str):
    """
    Downloads meeting data as a PDF file.

    Args:
        meeting_id (str): The ID of the meeting to download

    Returns:
        Response: PDF file response
    """
    try:
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

        if not meeting:
            frappe.throw(f"Meeting with ID {meeting_id} not found")

        # Get internal participants
        internal_participants = frappe.db.get_list(  
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

        # Generate PDF content
        pdf_content = create_meeting_pdf_content(meeting, tasks, internal_participants)

        # Create filename with timestamp
        timestamp = datetime.now().strftime("%d%b%Y-%I%M_%p")
        meeting_name = meeting.get("title", f"meeting_{meeting_id}")
        # Clean filename to remove special characters
        meeting_name = re.sub(r'[^\w\s-]', '', meeting_name).strip()
        meeting_name = re.sub(r'[-\s]+', '-', meeting_name)
        filename = f"{meeting_name}-{timestamp}.pdf"

        # Create response
        response = Response(pdf_content)
        response.headers.set("Content-Type", "application/pdf")
        response.headers.set("Content-Disposition", f'attachment; filename="{filename}"')
        return response

    except Exception as e:
        frappe.log_error(f"Error generating PDF: {str(e)}")
        frappe.throw(f"Error generating PDF: {str(e)}")
