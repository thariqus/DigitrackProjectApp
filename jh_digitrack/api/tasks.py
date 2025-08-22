"""
This file contains the API endpoints for the tasks module.
"""

from datetime import datetime, timedelta
import json
import frappe
from werkzeug.wrappers import Response
from .helpers.email_html import generate_task_reminder_email
from frappe.utils import cint
import io
from .helpers.wrap_text import wrap_text
from .helpers.clean_html import clean_html,clean_html_for_reportlab
from reportlab.lib import colors
from reportlab.lib.pagesizes import A2
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
import re
from reportlab.platypus import KeepInFrame, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

@frappe.whitelist()
def team_tasks(reporting_to: str):
    current_level = frappe.get_doc("JH User Master", reporting_to)
    team_members = frappe.db.get_list(
        "JH User Master",
        {"reporting_manager": reporting_to},
        ["name", "full_name", "email"],
    )

    tasks = frappe.db.get_list(
        "JH Task Master",
        filters={
            "assigned_to": ["in", [member.name for member in team_members]],
            "deleted_at": ["is", "not set"],
            "private": ["=", 0],
            "status": ["!=", "Closed"],
        },
        fields=[
            "*",
            "assigned_to.full_name as assigned_to",
            "assigned_to.name as assigned_to_id",
        ],
    )

    # Restructure the data to match the desired format
    result = {
        "id": current_level.name,
        "full_name": current_level.full_name,
        "reportees": [],
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
        reportee_count = frappe.db.count(
            "JH User Master", {"reporting_manager": member.name}
        )

        reportee = {
            "id": member.name,
            "full_name": member.full_name,
            "reportee_count": reportee_count,
            "tasks": tasks_by_user.get(member.name, []),
        }

        result["reportees"].append(reportee)

    return result


@frappe.whitelist()
def add_remark(task_id: str, comment: str, creator: str, type: str, remark: str):

    task = frappe.get_doc("JH Task Master", task_id)

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


@frappe.whitelist()
def get_change_log(task_id: str):
    change_log = frappe.db.get_list(
        "JH Change Log",
        filters={"parent": task_id},
        fields=["*", "creator.full_name as creator", "creator.name as creator_id"],
        ignore_permissions=True,
        order_by="creation desc",
    )
    return change_log


def should_send_email(date: datetime):
    if not date:
        return True
    if date != frappe.utils.today() and (datetime.now() - date).days >= 1:
        return True
    return False


@frappe.whitelist()
def remind(task_id: str):

    current_jh_user = frappe.get_doc("JH User Master", {"user": frappe.session.user})

    task_list = frappe.db.get_list(
        "JH Task Master",
        filters={"name": task_id},
        fields=[
            "*",
            "assigned_to.email as assigned_to_email",
            "assigned_to.full_name as assigned_to_name",
            "created_by.email as creator_email",
            "created_by.full_name as creator_name",
        ],
    )

    task = task_list[0]

    if should_send_email(task.reminded_at) and should_send_email(task.escalated_at):
        frappe.sendmail(
            expose_recipients="header",
            recipients=[task.assigned_to_email],
            cc=[task.creator_email],
            subject=f"DigiTrack : Reminder - {task.name} ",
            message=generate_task_reminder_email(
                tasks=[task], 
                type="reminder", 
                initiator_name=current_jh_user.full_name, 
                recipient_name=task.assigned_to_name
            ),
        )
    else:
        return Response(
            response=json.dumps({"message": "Email already sent today."}), status=400
        )

    current_jh_user = frappe.get_doc("JH User Master", {"email": frappe.session.user})

    task_doc = frappe.get_doc("JH Task Master", task_id)
    task_doc.reminded_at = frappe.utils.now()
    task_doc.append(
        "changelog",
        {
            "creator": current_jh_user.name,
            "type": "Reminder",
            "commented_at": frappe.utils.now(),
        },
    )
    task_doc.save(ignore_permissions=True)

    return "Reminder sent successfully"


@frappe.whitelist()
def escalate(task_id: str):

    current_jh_user = frappe.get_doc("JH User Master", {"user": frappe.session.user})

    task_list = frappe.db.get_list(
        "JH Task Master",
        filters={"name": task_id},
        fields=[
            "*",
            "assigned_to.email as assigned_to_email",
            "assigned_to.full_name as assigned_to_name",
            "created_by.email as creator_email",
            "created_by.full_name as creator_name",
            "assigned_to.reporting_manager as assigned_to_reporting_manager",
        ],
    )

    task = task_list[0]

    reporting_manager_email = frappe.db.get_value(
        "JH User Master", task.assigned_to_reporting_manager, ["email"]
    )

    if should_send_email(task.reminded_at) and should_send_email(task.escalated_at):
        frappe.sendmail(
            expose_recipients="header",
            recipients=[task.assigned_to_email],
            cc=[task.creator_email, reporting_manager_email],
            subject=f"DigiTrack : Escalation - {task.name} ",
            message=generate_task_reminder_email(
                tasks=[task],
                type="escalation",
                initiator_name=current_jh_user.full_name,
                recipient_name=task.assigned_to_name,
            ),
        )
    else:
        return Response(
            response=json.dumps({"message": "Email already sent today."}), status=400
        )

    current_jh_user = frappe.get_doc("JH User Master", {"email": frappe.session.user})

    task_doc = frappe.get_doc("JH Task Master", task_id)
    task_doc.reminded_at = frappe.utils.now()
    task_doc.append(
        "changelog",
        {
            "creator": current_jh_user.name,
            "type": "Escalation",
            "commented_at": frappe.utils.now(),
        },
    )
    task_doc.save(ignore_permissions=True)

    return "Escalation sent successfully"

@frappe.whitelist()
def email_me(task_id: str):

    current_jh_user = frappe.get_doc("JH User Master", {"user": frappe.session.user})

    task_list = frappe.db.get_list(
        "JH Task Master",
        filters={"name": task_id},
        fields=[
            "*",
            "assigned_to.email as assigned_to_email",
            "assigned_to.full_name as assigned_to_name",
            "created_by.email as creator_email",
            "created_by.full_name as creator_name",
            "assigned_to.reporting_manager as assigned_to_reporting_manager",
        ],
    )

    task = task_list[0]

    if should_send_email(task.email_me_at):
        frappe.sendmail(
            expose_recipients="header",
            recipients=[current_jh_user.email],
            # cc=[],
            subject=f"DigiTrack : Email Me - {task.name} ",
            message=generate_task_reminder_email(
                tasks=[task],
                type="email_me",
                initiator_name=current_jh_user.full_name,
                recipient_name=current_jh_user.full_name,
            ),
        )
    else:
        return Response(
            response=json.dumps({"message": "Email already sent today."}), status=400
        )

    current_jh_user = frappe.get_doc("JH User Master", {"email": frappe.session.user})

    task_doc = frappe.get_doc("JH Task Master", task_id)
    task_doc.email_me_at = frappe.utils.now()
    task_doc.append(
        "changelog",
        {
            "creator": current_jh_user.name,
            "type": "Email Me",
            "commented_at": frappe.utils.now(),
        },
    )
    task_doc.save(ignore_permissions=True)

    return "Email Me sent successfully"


def _process_task_chunk(task_chunk, tasks_by_assignee, tasks_by_assignor, task_type):
    """Helper function to process a chunk of tasks and categorize them by assignee and assignor"""
    for task in task_chunk:
        # Process for assignee
        assignee = task.assigned_to
        if assignee:
            if assignee not in tasks_by_assignee:
                tasks_by_assignee[assignee] = {"past_due": [], "upcoming": [], "new": [], "changes": []}
            tasks_by_assignee[assignee][task_type].append(task)
        
        # Process for assignor
        assignor = task.created_by
        if assignor:
            if assignor not in tasks_by_assignor:
                tasks_by_assignor[assignor] = {"past_due": [], "upcoming": [], "new": [], "changes": []}
            tasks_by_assignor[assignor][task_type].append(task)


@frappe.whitelist()
def scheduled_emails():
    """
    Get tasks that match any of these criteria:
    i. Have a task with due dates missed
    ii. Any tasks whose due date is equal to today + 2
    iii. For all new tasks added today

    Optimized for scalability with large datasets.
    Sends emails to both assignees and assignors based on their respective settings.
    """

    jh_digitrack_settings = frappe.get_doc("JH Digitrack Settings")

    if not jh_digitrack_settings.send_scheduled_emails:
        return "Scheduled emails are disabled"

    # Define DocType for JH Task Master
    tasks = frappe.qb.DocType("JH Task Master")
    assigned_to = frappe.qb.DocType("JH User Master").as_("assigned_to")
    creator = frappe.qb.DocType("JH User Master").as_("creator")

    # Get today's date using Frappe's utilities
    today = frappe.utils.getdate()
    today_start = frappe.utils.get_datetime(frappe.utils.getdate())
    today_end = (
        frappe.utils.get_datetime(frappe.utils.getdate())
        + timedelta(days=1)
        - timedelta(seconds=1)
    )
    two_days_from_now = frappe.utils.add_days(today, 2)
    seven_days_from_now = frappe.utils.add_days(today, 7)

    # Use a more efficient approach with separate queries for each category
    # This allows for better use of indexes and parallel processing

    # 1. Past due tasks - for assignees
    past_due_assignee_query = (
        frappe.qb.from_(tasks)
        .select(
            tasks.star,
            assigned_to.email.as_("assigned_to_email"),
            assigned_to.full_name.as_("assigned_to_name"),
            creator.email.as_("creator_email"),
            creator.full_name.as_("creator_name"),
        )
        .where(
            (tasks.deleted_at.isnull())
            & (tasks.revised_due_date < today)
            & (tasks.status.notin(["Completed", "Closed", "Canceled"]))
            & (tasks.no_automated_email_assignee == 0)
        )
        .join(assigned_to)
        .on(tasks.assigned_to == assigned_to.name)
        .join(creator)
        .on(tasks.created_by == creator.name)
        .orderby(tasks.assigned_to)
    )

    # 2. Tasks due in 2 days or 7 days - for assignees
    upcoming_due_assignee_query = (
        frappe.qb.from_(tasks)
        .select(
            tasks.star,
            assigned_to.email.as_("assigned_to_email"),
            assigned_to.full_name.as_("assigned_to_name"),
            creator.email.as_("creator_email"),
            creator.full_name.as_("creator_name"),
        )
        .where(
            (tasks.deleted_at.isnull())
            & ((tasks.due_date == two_days_from_now) | (tasks.due_date == seven_days_from_now))
            & (tasks.status.notin(["Completed", "Closed", "Canceled"]))
            & (tasks.no_automated_email_assignee == 0)
        )
        .join(assigned_to)
        .on(tasks.assigned_to == assigned_to.name)
        .join(creator)
        .on(tasks.created_by == creator.name)
        .orderby(tasks.assigned_to)
    )

    # 3. New tasks added today - for assignees
    new_tasks_assignee_query = (
        frappe.qb.from_(tasks)
        .select(
            tasks.star,
            assigned_to.email.as_("assigned_to_email"),
            assigned_to.full_name.as_("assigned_to_name"),
            creator.email.as_("creator_email"),
            creator.full_name.as_("creator_name"),
        )
        .where(
            (tasks.deleted_at.isnull())
            & (tasks.creation.between(today_start, today_end))
            & (tasks.status.notin(["Completed", "Closed", "Canceled"]))
            & (tasks.no_automated_email_assignee == 0)
        )
        .join(assigned_to)
        .on(tasks.assigned_to == assigned_to.name)
        .join(creator)
        .on(tasks.created_by == creator.name)
        .orderby(tasks.assigned_to)
    )

    # 4. Changes after last scheduled email - for assignees
    changes_after_last_scheduled_email_assignee = (
        frappe.qb.from_(tasks)
        .select(
            tasks.star,
            assigned_to.email.as_("assigned_to_email"),
            assigned_to.full_name.as_("assigned_to_name"),
            creator.email.as_("creator_email"),
            creator.full_name.as_("creator_name"),
        )
        .where(
            (tasks.deleted_at.isnull())
            & (tasks.modified > tasks.scheduled_email_sent_at)
            & (tasks.no_automated_email_assignee == 0)
        )
        .join(assigned_to)
        .on(tasks.assigned_to == assigned_to.name)
        .join(creator)
        .on(tasks.created_by == creator.name)
        .orderby(tasks.assigned_to)
    )

    # 5. Past due tasks - for assignors
    past_due_assignor_query = (
        frappe.qb.from_(tasks)
        .select(
            tasks.star,
            assigned_to.email.as_("assigned_to_email"),
            assigned_to.full_name.as_("assigned_to_name"),
            creator.email.as_("creator_email"),
            creator.full_name.as_("creator_name"),
        )
        .where(
            (tasks.deleted_at.isnull())
            & (tasks.revised_due_date < today)
            & (tasks.status.notin(["Completed", "Closed", "Canceled"]))
            & (tasks.no_automated_email_assignor == 0)
        )
        .join(assigned_to)
        .on(tasks.assigned_to == assigned_to.name)
        .join(creator)
        .on(tasks.created_by == creator.name)
        .orderby(tasks.created_by)
    )

    # 6. Changes after last scheduled email - for assignors
    changes_after_last_scheduled_email_assignor = (
        frappe.qb.from_(tasks)
        .select(
            tasks.star,
            assigned_to.email.as_("assigned_to_email"),
            assigned_to.full_name.as_("assigned_to_name"),
            creator.email.as_("creator_email"),
            creator.full_name.as_("creator_name"),
        )
        .where(
            (tasks.deleted_at.isnull())
            & (tasks.modified > tasks.scheduled_email_sent_at)
            & (tasks.no_automated_email_assignor == 0)
        )
        .join(assigned_to)
        .on(tasks.assigned_to == assigned_to.name)
        .join(creator)
        .on(tasks.created_by == creator.name)
        .orderby(tasks.created_by)
    )

    # Execute queries with pagination to handle large datasets
    # Process in chunks to avoid memory issues
    chunk_size = 1000
    tasks_by_assignee = {}
    tasks_by_assignor = {}

    # Process past due tasks for assignees
    for offset in range(0, 1000, chunk_size):
        past_due_chunk = (
            past_due_assignee_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not past_due_chunk:
            break
        _process_task_chunk(past_due_chunk, tasks_by_assignee, {}, "past_due")

    # Process upcoming due tasks for assignees
    for offset in range(0, 1000, chunk_size):
        upcoming_chunk = (
            upcoming_due_assignee_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not upcoming_chunk:
            break
        _process_task_chunk(upcoming_chunk, tasks_by_assignee, {}, "upcoming")

    # Process new tasks for assignees
    for offset in range(0, 1000, chunk_size):
        new_tasks_chunk = (
            new_tasks_assignee_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not new_tasks_chunk:
            break
        _process_task_chunk(new_tasks_chunk, tasks_by_assignee, {}, "new")

    # Process changes after last scheduled email for assignees
    for offset in range(0, 1000, chunk_size):
        changes_chunk = (
            changes_after_last_scheduled_email_assignee.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not changes_chunk:
            break
        _process_task_chunk(changes_chunk, tasks_by_assignee, {}, "changes")
    
    # Process past due tasks for assignors
    for offset in range(0, 1000, chunk_size):
        past_due_chunk = (
            past_due_assignor_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not past_due_chunk:
            break
        _process_task_chunk(past_due_chunk, {}, tasks_by_assignor, "past_due")

    # Process changes after last scheduled email for assignors
    for offset in range(0, 1000, chunk_size):
        changes_chunk = (
            changes_after_last_scheduled_email_assignor.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not changes_chunk:
            break
        _process_task_chunk(changes_chunk, {}, tasks_by_assignor, "changes")

    emails_data = []

    # For assignees
    for assignee, assignee_tasks in tasks_by_assignee.items():
        if assignee_tasks:
            tasks = []
            changed_tasks = assignee_tasks.get("changes", [])
            for task_type in ["past_due", "upcoming", "new"]:
                if task_type in assignee_tasks:
                    tasks.extend(assignee_tasks[task_type])

            if len(tasks) > 0 or len(changed_tasks) > 0:
                if tasks:
                    recipient = tasks[0].assigned_to_email
                    recipient_name = tasks[0].assigned_to_name
                else:
                    recipient = changed_tasks[0].assigned_to_email
                    recipient_name = changed_tasks[0].assigned_to_name

                subject = "DigiTrack: Task List(Assigned to you) - Pending / Upcoming / New"
                body = generate_task_reminder_email(
                    tasks=assignee_tasks.get("past_due", []),
                    upcoming_tasks=assignee_tasks.get("upcoming", []),
                    new_tasks=assignee_tasks.get("new", []),
                    type="assignee_scheduler",
                    changed_tasks=changed_tasks,
                    recipient_name=recipient_name
                )

                emails_data.append({
                    "to": recipient,
                    "subject": subject,
                    "body": body
                })


    # For assignors
    for assignor, assignor_tasks in tasks_by_assignor.items():
        if assignor_tasks:
            tasks = assignor_tasks.get("past_due", [])
            changed_tasks = assignor_tasks.get("changes", [])

            if len(tasks) > 0 or len(changed_tasks) > 0:
                if tasks:
                    recipient = tasks[0].creator_email
                    recipient_name = tasks[0].creator_name
                else:
                    recipient = changed_tasks[0].creator_email
                    recipient_name = changed_tasks[0].creator_name

                subject = "DigiTrack: Task List(Created by you) - Pending"
                body = generate_task_reminder_email(
                    tasks=tasks,
                    type="assignor_scheduler",
                    changed_tasks=changed_tasks,
                    recipient_name=recipient_name
                )

                emails_data.append({
                    "to": recipient,
                    "subject": subject,
                    "body": body
                })

    if emails_data:
        _create_email_doc(emails_data)
    return "Scheduled emails queued in JH Emails"


def _create_email_doc(emails_data):
    email_doc = frappe.new_doc("JH Emails")
    today = datetime.today()
    email_doc.source_document = "JH Task Master"
    email_doc.date = today


    for entry in emails_data:
        email_doc.append("emails", {
            "to": entry.get("to"),
            "subject": entry.get("subject"),
            "body": frappe.as_unicode(entry.get("body"))
        })

    email_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return email_doc.name

@frappe.whitelist()
def get_task_count_by_status_by_source(source: str, current_jh_user: str, created_by: str, visible_to_all: bool):
    """
    Get the count of tasks by status for a specific source.
    """
    # Base filters
    filters = {"source": source}
    
    # Add conditional filter based on user permissions
    if (current_jh_user and created_by != current_jh_user and not visible_to_all):
        filters["assigned_to"] = current_jh_user
    
    tasks = frappe.db.get_list(
        "JH Task Master",
        fields=["count(name) as count", "status"],
        group_by="status",
        filters=filters,
    )
    return tasks

def _process_source_task_chunk(task_chunk, tasks_by_assignee, task_type):
    """Helper function to process a chunk of tasks and categorize them by assignee"""
    for task in task_chunk:
        assignee = task.assigned_to
        if not assignee:
            continue

        if assignee not in tasks_by_assignee:
            tasks_by_assignee[assignee] = {"open": []}

        tasks_by_assignee[assignee][task_type].append(task)


@frappe.whitelist()
def remind_all_by_source(source_id: str):
    """
    Get tasks that match any of these criteria and send emails to assignees:
    """

    # Try to fetch JH User Master for the current session user
    current_user = frappe.session.user
    try:
        current_jh_user = frappe.get_doc("JH User Master", {"user": current_user})
        initiator_name = current_jh_user.full_name
    except frappe.DoesNotExistError:
        # Fallback if no user found (common in bench CLI context)
        initiator_name = "System"
        current_jh_user = None

    # Authorization check - verify user has permission to send reminders for this source
    source = None
    is_authorized = False
    source_name = None
    
    # Try to find the source in JH Grouped Task Master (meeting)
    try:
        meeting = frappe.get_doc("JH Grouped Task Master", source_id)
        source = meeting
        if current_jh_user and meeting.organizer == current_jh_user.name:
            is_authorized = True
            source_name = meeting.title
    except frappe.DoesNotExistError:
        pass
    
    # If not found in meetings or not authorized, try JH Audit Master
    if not is_authorized:
        try:
            audit = frappe.get_doc("JH Audit Master", source_id)
            source = audit
            if current_jh_user and audit.created_by == current_jh_user.name:
                is_authorized = True
                source_name = audit.audit_name
        except frappe.DoesNotExistError:
            pass
    
    # If user is not authorized, deny access
    if not is_authorized:
        frappe.throw("You are not authorized to send reminders for this source. Only the meeting organizer or audit creator can send reminders.")
    
    if not should_send_email(source.reminded_at):
        return Response(
            response=json.dumps({"message": "Email already sent today."}), status=400
        )
    # Define DocType for JH Task Master
    tasks = frappe.qb.DocType("JH Task Master")
    assigned_to = frappe.qb.DocType("JH User Master").as_("assigned_to")
    creator = frappe.qb.DocType("JH User Master").as_("creator")



    # 1. Open and in progress tasks - for assignees
    tasks_query = (
        frappe.qb.from_(tasks)
        .select(
            tasks.star,
            assigned_to.email.as_("assigned_to_email"),
            assigned_to.full_name.as_("assigned_to_name"),
            creator.email.as_("creator_email"),
            creator.full_name.as_("creator_name"),
        )
        .where(
            (tasks.deleted_at.isnull())
            & (tasks.source == source_id)
            & (tasks.status.isin(["Open", "In Progress"]))
        )
        .join(assigned_to)
        .on(tasks.assigned_to == assigned_to.name)
        .join(creator)
        .on(tasks.created_by == creator.name)
        .orderby(tasks.assigned_to)
    )

    # Execute queries with pagination to handle large datasets
    # Process in chunks to avoid memory issues
    chunk_size = 1000000
    tasks_by_assignee = {}

    # Process tasks for assignees
    for offset in range(0, 100000, chunk_size):
        past_due_chunk = (
            tasks_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not past_due_chunk:
            break
        _process_source_task_chunk(past_due_chunk, tasks_by_assignee, "open")

    # Send emails to assignees
    for assignee, assignee_tasks in tasks_by_assignee.items():
        if assignee_tasks:
            tasks = assignee_tasks.get("open", [])

            if len(tasks) > 0:
                frappe.sendmail(
                    expose_recipients="header",
                    recipients=[tasks[0].assigned_to_email],
                    cc=[tasks[0].creator_email],
                    subject=f"DigiTrack: Reminder( {source_name} ) - Open / In Progress",
                    message=generate_task_reminder_email(
                        tasks=assignee_tasks.get("open", []),
                        type="reminder",
                        initiator_name=initiator_name,
                        recipient_name=tasks[0].assigned_to_name),
                )

            for task in tasks:
                try:
                    task_doc = frappe.get_doc("JH Task Master", task.name)
                    task_doc.reminded_at = frappe.utils.now()
                    task_doc.append(
                        "changelog",
                        {
                            "creator": current_jh_user.name,
                            "type": "Reminder",
                            "commented_at": frappe.utils.now(),
                        },
                    )
                    task_doc.save(ignore_permissions=True)
                except Exception as e:
                    frappe.log_error(f"Error updating reminded_at for task {task.name}: {str(e)}")

    try:
        source.reminded_at = frappe.utils.now()
        source.save(ignore_permissions=True)
    except Exception as e:
        frappe.log_error(f"Error updating reminded_at for source {source.name}: {str(e)}")

    return "Emails sent successfully"

def create_task_pdf_content(tasks):
    """
    Creates a PDF document for tasks.
    
    Args:
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

    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        spaceBefore=12,
        textColor=colors.black
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
    story.append(Paragraph("Task Details", title_style))
    story.append(Spacer(1, 20))
    
    # Task Details Section (as single table)
    if tasks:
        
        # Table headers
        task_headers = [
            "ID", "Name/\nDescription","Details",
            "Assignee Remarks", "Comments"
        ]  
        
        # Prepare task data
        task_data = [task_headers]
        
        for task in tasks:
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
                comments_cell = KeepInFrame(4.0*inch, 800, comment_paragraphs, mode='shrink')
            else:
                comments_cell = "-"            
            # Format Created By & Date column
            created_by = task.get("created_by")
            created_date = task.get('creation').strftime('%d/%m/%Y')         
            due_date_str = task.get("due_date").strftime("%d/%m/%Y") if task.get("due_date") else "-"
            revised_due_date_str = task.get("revised_due_date").strftime("%d/%m/%Y") if task.get("revised_due_date") else None

            task_name_desc = clean_html_for_reportlab(task.get("task_name", "-"))
            if task.get("description", "-") != "-":
                task_desc = clean_html_for_reportlab(task.get("description", "-"))
                task_name_desc += f"<br/><br/><b>Description: </b><br/> {task_desc}"
                       
            task_status = task.get("status") 
            task_effort = task.get("effort")
            assignee_remarks = clean_html_for_reportlab(task.get("assignee_comments", "-"))

            details_text = f"""
            <b>Created By:</b> {created_by}<br/>
            <b>Created Date:</b> {created_date}<br/>
            <b>Assigned To:</b> {wrap_text(task.get("assigned_to", "-"), 15)}<br/>
            <b>Due Date:</b> {due_date_str}<br/>
            <b>Revised Due Date:</b> {revised_due_date_str}<br/>
            <b>Completion Date:</b> {task.get("completion_date").strftime("%d/%m/%Y") if task.get("completion_date") else "-"}<br/>
            <b>Effort Hours:</b> {task_effort}
            <b>Status:</b> {task_status}
            """
            details_cell = Paragraph(details_text, small_style)

            task_row = [
                wrap_text(task.get("name", "-"), 15),
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
def download_pdf(task_id: str):
    """
    Downloads audit data as a PDF file.

    Args:
        audit_id (str): The ID of the audit to download

    Returns:
        Response: PDF file response
    """
    try:
        # Get tasks data
        tasks = frappe.db.get_list(
            "JH Task Master",
            filters={"name": task_id},
            fields=[
                "*",
                "created_by.full_name as created_by",
                "created_by.name as created_by_id",
                "assigned_to.full_name as assigned_to",
                "assigned_to.name as assigned_to_id",
            ],
        )

        # Generate PDF content
        pdf_content = create_task_pdf_content(tasks)

        # Create filename with timestamp
        timestamp = datetime.now().strftime("%d%b%Y-%I%M_%p")
        task_name = tasks[0].get("task_name", f"task_{task_id}")
        # Clean filename to remove special characters
        task_name = re.sub(r'[^\w\s-]', '', task_name).strip()
        task_name = re.sub(r'[-\s]+', '-', task_name)
        filename = f"{task_name}-{timestamp}.pdf"

        # Create response
        response = Response(pdf_content)
        response.headers.set("Content-Type", "application/pdf")
        response.headers.set("Content-Disposition", f'attachment; filename="{filename}"')
        return response

    except Exception as e:
        frappe.log_error(f"Error generating PDF: {str(e)}")
        frappe.throw(f"Error generating PDF: {str(e)}")

from frappe import _

@frappe.whitelist(allow_guest=True)
def get_task_status_counts(jh_user_name):
    if not jh_user_name:
        frappe.throw(_("JH User name is required"))
    def get_counts(field_name):
        extra_condition = ""
        if field_name == "assigned_to":
            extra_condition = """
                AND (
                    created_by != %(jh_user_name)s
                    OR source IS NOT NULL
                    OR source_doctype IS NOT NULL
                )
            """

        result = frappe.db.sql(f"""
            SELECT status, COUNT(*) AS count
            FROM `tabJH Task Master`
            WHERE {field_name} = %(jh_user_name)s
            {extra_condition}
            AND status IN ('Open', 'In Progress', 'Completed', 'Canceled')
            AND deleted_at IS NULL
            GROUP BY status
        """, {"jh_user_name": jh_user_name}, as_dict=True)

        counts = {row.status: {"count": row.count, "ages": []} for row in result}

        age_result = frappe.db.sql(f"""
            SELECT
                status,
                CASE
                    WHEN DATE(COALESCE(revised_due_date, due_date)) >= CURDATE() THEN 'within_due'
                    WHEN DATEDIFF(CURDATE(), DATE(COALESCE(revised_due_date, due_date))) BETWEEN 1 AND 10 THEN '1_10'
                    WHEN DATEDIFF(CURDATE(), DATE(COALESCE(revised_due_date, due_date))) BETWEEN 11 AND 30 THEN '11_30'
                    WHEN DATEDIFF(CURDATE(), DATE(COALESCE(revised_due_date, due_date))) > 30 THEN '30_plus'
                END AS bucket,
                COUNT(*) AS bucket_count
            FROM `tabJH Task Master`
            WHERE {field_name} = %(jh_user_name)s
            {extra_condition}
            AND status IN ('Open', 'In Progress', 'Completed', 'Canceled')
            AND deleted_at IS NULL
            GROUP BY status, bucket
        """, {"jh_user_name": jh_user_name}, as_dict=True)

        bucket_labels = {
            "within_due": "Within(Rev.)Due Dt.",
            "1_10": "1-10 days overdue",
            "11_30": "11-30 days overdue",
            "30_plus": "30+ days overdue"
        }

        for row in age_result:
            if row.status in counts and row.bucket:
                counts[row.status]["ages"].append({
                    "label": bucket_labels[row.bucket],
                    "count": row.bucket_count
                })

        return counts


    def get_audit_counts():
        result = frappe.db.sql("""
            SELECT status, COUNT(*) AS count
            FROM `tabJH Audit Master`
            WHERE created_by = %s
            GROUP BY status
        """, (jh_user_name,), as_dict=True)
        return {row.status.lower(): row.count for row in result}
    def get_travel_counts():
        result = frappe.db.sql("""
            SELECT request_status, COUNT(*) AS count
            FROM `tabJH Travel Request`
            WHERE requested_by = %s
            GROUP BY request_status
        """, (jh_user_name,), as_dict=True)
        return {row.request_status: row.count for row in result}
    
    def get_meeting_counts():
        result = frappe.db.sql("""
            SELECT COUNT(*) AS count
            FROM `tabJH Grouped Task Master` task
            WHERE task.status = 'Open'
            AND task.organizer = %s
        
        """, (jh_user_name,), as_dict=True)

        return {"open": result[0].count if result else 0}

    return {
        "my_tasks": get_counts("assigned_to"),
        "created_by_me": get_counts("created_by"),
        "audits": get_audit_counts(),
        "travel_request": get_travel_counts(),
        "meetings": get_meeting_counts(),
    }
