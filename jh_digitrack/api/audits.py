import frappe
import csv
import io
from datetime import datetime
from werkzeug.wrappers import Response
from .helpers.wrap_text import wrap_text
from .helpers.clean_html import clean_html, clean_html_for_reportlab, wrap_text_with_html
from reportlab.lib import colors
from reportlab.lib.pagesizes import A2
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
import re
from reportlab.platypus import KeepInFrame, Paragraph


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
    write_audit_header_row("Name :", audit.get("audit_name", "-"))
    write_audit_header_row("Created by:", audit.get("created_by", "-"))
    write_audit_header_row(
        "Business / Division", f"{audit.get('business', '-')} / {audit.get('division', '-')}"
    )
    write_audit_header_row(
        "Description :", clean_html(audit.get("audit_description", "-"))
    )
    write_audit_header_row(
        "Additional Comments :", clean_html(audit.get("additional_comments", "-"))
    )
    write_audit_header_row("File Name :", audit.get("file_name", "-"))
    write_audit_header_row("Folder Name :", audit.get("folder_name", "-"))
    write_audit_header_row("File Attachments")
    write_audit_header_row(
        "Start Date :",
        (
            audit.get("start_date").strftime("%d/%m/%Y")
            if audit.get("start_date")
            else "-"
        ),
    )
    write_audit_header_row(
        "Completion Date :",
        (
            audit.get("completion_date").strftime("%d/%m/%Y")
            if audit.get("completion_date")
            else "-"
        ),
    )
    write_audit_header_row("Status: ", audit.get("status", "-"))
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
            "Assignee Remarks",
            "Comments",
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


def create_audit_pdf_content(audit, tasks):
    """
    Creates a PDF document for audit tracking with tasks.
    
    Args:
        audit (dict): Dictionary with audit information
        tasks (list): List of task dictionaries
        
    Returns:
        bytes: PDF content as bytes
    """
    
    # Create a byte buffer for PDF content
    buffer = io.BytesIO()
    
    # Create the PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A2,
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

    small_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=9,
        spaceAfter=6
    )
    
    # Story to hold all content
    story = []
    
    # Title
    story.append(Paragraph("Audit Report", title_style))
    story.append(Spacer(1, 20))
    
    # Audit Information Section (as list)
    story.append(Paragraph("Audit Information", heading_style))
    
    # Audit details as paragraphs
    audit_info = [
        f"<b>Name:</b> {audit.get('audit_name', '-')}",
        f"<b>Created By:</b> {audit.get('created_by', '-')}",
        f"<b>Business / Division:</b> {audit.get('business', '-')} / {audit.get('division', '-')}",
        f"<b>Status:</b> {audit.get('status', '-')}",
        f"<b>File Name:</b> {audit.get('file_name', '-')}",
        f"<b>Folder Name:</b> {audit.get('folder_name', '-')}",
        f"<b>Start Date:</b> {audit.get('start_date').strftime('%d/%m/%Y') if audit.get('start_date') else '-'}",
        f"<b>Completion Date:</b> {audit.get('completion_date').strftime('%d/%m/%Y') if audit.get('completion_date') else '-'}",
        f"<b>Description:</b><br/> {clean_html_for_reportlab(audit.get('audit_description', '-'))}",
        f"<b>Additional Comments:</b><br/> {clean_html_for_reportlab(audit.get('additional_comments', '-'))}"
    ]
    
    for info in audit_info:
        story.append(Paragraph(info, normal_style))
    
    story.append(Spacer(1, 20))
    
    # Task Details Section (as single table)
    if tasks:
        story.append(Paragraph("Tasks", heading_style))

        # Define status order for sorting
        STATUS_ORDER = {
            "Open": 1,
            "In Progress": 2,
            "Canceled": 3,
            "Completed": 4,
            "Closed": 5,
        }
        
        # Sort tasks by status
        sorted_tasks = sorted(tasks, key=lambda task: STATUS_ORDER.get(task.get("status", ""), 6))
        
        # Table headers
        task_headers = [
            "ID", "Name/\nDescription","Details",
            "Assignee Remarks", "Comments"
        ] 
        
        # Prepare task data
        task_data = [task_headers]
        
        for task in sorted_tasks:
            # Get task comments
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
            change_log = frappe.db.get_list(
                "JH Change Log",
                filters={"parent": task.get("name")},
                fields=["*", "creator.full_name as creator", "creator.name as creator_id"],
                ignore_permissions=True,
                order_by="creation desc",
            )

            combined_entries = []
        
            # Add comments
            for comment in comments:
                creation = comment.get("creation")
                if isinstance(creation, str):
                    creation = datetime.strptime(creation, "%Y-%m-%d %H:%M:%S")
                formatted_creation = creation.strftime("%d-%m-%Y")
                combined_entries.append({
                    'text': f"COMMENT: {wrap_text(comment.get('content', ''), 60)}",
                    'user': comment.get('comment_by', ''),
                    'date': formatted_creation,
                    'creation_datetime': creation
                })
        
            # Add change log entries
            for log in change_log:
                creation = log.get("creation") or log.get("commented_at")
                if isinstance(creation, str):
                    creation = datetime.strptime(creation, "%Y-%m-%d %H:%M:%S")
                formatted_creation = creation.strftime("%d-%m-%Y")
            
                # Format change log content
                log_text = f"LOG ({log.get('type', '')}): {wrap_text(log.get('comment', ''), 50) if log.get('comment') else ''}"
                if log.get('remark'):
                    log_text += f"\nRemark: {wrap_text(log.get('remark'), 40)}"
            
                combined_entries.append({
                    'text': log_text,
                    'user': log.get('creator', ''),
                    'date': formatted_creation,
                    'creation_datetime': creation
                })
        
            # Sort combined entries by creation date (most recent first)
            combined_entries.sort(key=lambda x: x['creation_datetime'], reverse=True)

            recent_entries = []
            for entry in combined_entries:
                recent_entries.append(f"{entry['date']} : {entry['user']} \n{entry['text']}\n")
        
            if recent_entries:
                comment_paragraphs = [Paragraph(entry, normal_style) for entry in recent_entries]
                comments_cell = KeepInFrame(7.8*inch, 800, comment_paragraphs, mode='shrink')
            else:
                comments_cell = "-"

            created_by = task.get("created_by")
            created_date = task.get('creation').strftime('%d/%m/%Y')         
            due_date_str = task.get("due_date").strftime("%d/%m/%Y") if task.get("due_date") else "-"
            revised_due_date_str = task.get("revised_due_date").strftime("%d/%m/%Y") if task.get("revised_due_date") else None
            

            # Task name and description
            task_name_desc = clean_html_for_reportlab(task.get("task_name", "-"))
            if task.get("description", "-") != "-":
                task_desc = clean_html_for_reportlab(task.get("description", "-"))
                task_name_desc += f"<br/><br/><b>Description: </b><br/> {task_desc}"
            
            task_effort = task.get("effort")            
            # Assignee remarks with HTML
            assignee_remarks = clean_html_for_reportlab(task.get("assignee_comments", "-"))

            details_text = f"""
            <b>Created By:</b> {created_by}<br/>
            <b>Created Date:</b> {created_date}<br/>
            <b>Assigned To:</b> {wrap_text(task.get("assigned_to", "-"), 15)}<br/>
            <b>Due Date:</b> {due_date_str}<br/>
            <b>Revised Due Date:</b> {revised_due_date_str}<br/>
            <b>Completion Date:</b> {task.get("completion_date").strftime("%d/%m/%Y") if task.get("completion_date") else "-"}<br/>
            <b>Effort Hours: {task_effort}</b> 
            """
            details_cell = Paragraph(details_text, small_style)

            task_id_with_status = f"""
            <b>{wrap_text(task.get("name", "-"), 15)}</b><br/><br/>
            <font size="8" color="black"><b>Status:</b> {task.get("status", "-")}</font>
            """
            task_row = [
                Paragraph(task_id_with_status, small_style),
                Paragraph(task_name_desc, small_style),
                details_cell,
                Paragraph(assignee_remarks, small_style),
                comments_cell,
            ]

            task_data.append(task_row)  

        tasks_table = Table(task_data, colWidths=[
            0.8*inch,  # Task ID
            2.0*inch,  # Task Name
            2.0*inch,  # Details
            3.0*inch,  # Assignee Remarks
            7.8*inch   # Comments
        ])
        
        tasks_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),  # Header row bold
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),      # Data rows normal
            ('FONTSIZE', (0, 0), (-1, 0), 9),                 # Header font size
            ('FONTSIZE', (0, 1), (-1, -1), 8),                # Data font size
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey), # Header background
        ]))
        
        story.append(tasks_table)
        story.append(Spacer(1, 20))
    
    # Create footer with current date
    def add_footer(canvas, doc):
        """Add footer with created date to each page"""
        from datetime import datetime
        canvas.saveState()
        
        # Footer text
        footer_text = f"Report Generated on: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        
        # Position footer at bottom of page
        canvas.setFont('Helvetica', 9)
        canvas.drawString(30, 30, footer_text)  # 30 points from left and bottom margins
        
        canvas.restoreState()
    
    # Build PDF with footer
    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    
    # Get PDF content
    pdf_content = buffer.getvalue()
    buffer.close()
    
    return pdf_content


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

@frappe.whitelist()
def download_pdf(audit_id: str):
    """
    Downloads audit data as a PDF file.

    Args:
        audit_id (str): The ID of the audit to download

    Returns:
        Response: PDF file response
    """
    try:
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

        if not audit:
            frappe.throw(f"Audit with ID {audit_id} not found")

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

        # Generate PDF content
        pdf_content = create_audit_pdf_content(audit, tasks)

        # Create filename with timestamp
        timestamp = datetime.now().strftime("%d%b%Y-%I%M_%p")
        audit_name = audit.get("audit_name", f"audit_{audit_id}")
        # Clean filename to remove special characters
        audit_name = re.sub(r'[^\w\s-]', '', audit_name).strip()
        audit_name = re.sub(r'[-\s]+', '-', audit_name)
        filename = f"{audit_name}-{timestamp}.pdf"

        # Create response
        response = Response(pdf_content)
        response.headers.set("Content-Type", "application/pdf")
        response.headers.set("Content-Disposition", f'attachment; filename="{filename}"')
        return response

    except Exception as e:
        frappe.log_error(f"Error generating PDF: {str(e)}")
        frappe.throw(f"Error generating PDF: {str(e)}")
