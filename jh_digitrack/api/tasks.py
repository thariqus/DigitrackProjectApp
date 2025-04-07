"""
This file contains the API endpoints for the tasks module.
"""

from datetime import datetime, timedelta
import json
import frappe
from werkzeug.wrappers import Response
from .helpers.email_html import generate_task_reminder_email


@frappe.whitelist()
def team_tasks(reporting_to: str):
    current_level = frappe.get_doc("JH User Master", reporting_to)
    team_members = frappe.db.get_list(
        "JH User Master",
        {"reporting_manager": reporting_to},
        ["name", "full_name", "email"],
    )

    tasks = frappe.db.get_list(
        "JH Tasks Master",
        filters={
            "assigned_to": ["in", [member.name for member in team_members]],
            "deleted_at": ["is", "not set"],
            "private": ["=", 0],
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

    task = frappe.get_doc("JH Tasks Master", task_id)

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

    task_list = frappe.db.get_list(
        "JH Tasks Master",
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
            recipients=[task.assigned_to_email],
            cc=[task.creator_email],
            subject=f"DigiTrack : Reminder - {task.name} ",
            message=generate_task_reminder_email(tasks=[task], type="reminder"),
        )
    else:
        return Response(
            response=json.dumps({"message": "Email already sent today."}), status=400
        )

    current_jh_user = frappe.get_doc("JH User Master", {"email": frappe.session.user})

    task_doc = frappe.get_doc("JH Tasks Master", task_id)
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

    task_list = frappe.db.get_list(
        "JH Tasks Master",
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
            recipients=[task.assigned_to_email],
            cc=[task.creator_email, reporting_manager_email],
            subject=f"DigiTrack : Escalation - {task.name} ",
            message=generate_task_reminder_email(tasks=[task], type="escalation"),
        )
    else:
        return Response(
            response=json.dumps({"message": "Email already sent today."}), status=400
        )

    current_jh_user = frappe.get_doc("JH User Master", {"email": frappe.session.user})

    task_doc = frappe.get_doc("JH Tasks Master", task_id)
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


def _process_task_chunk(task_chunk, tasks_by_assignee, task_type):
    """Helper function to process a chunk of tasks and categorize them by assignee"""
    for task in task_chunk:
        assignee = task.assigned_to
        if not assignee:
            continue

        if assignee not in tasks_by_assignee:
            tasks_by_assignee[assignee] = {"past_due": [], "upcoming": [], "new": []}

        tasks_by_assignee[assignee][task_type].append(task)


@frappe.whitelist()
def scheduled_emails():
    """
    Get tasks that match any of these criteria:
    i. Have a task with due dates missed
    ii. Any tasks whose due date is equal to today + 2
    iii. For all new tasks added today

    Optimized for scalability with large datasets.
    """
    # Define DocType for JH Tasks Master
    tasks = frappe.qb.DocType("JH Tasks Master")
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

    # Use a more efficient approach with separate queries for each category
    # This allows for better use of indexes and parallel processing

    # 1. Past due tasks
    past_due_query = (
        frappe.qb.from_(tasks)
        .select(
            tasks.star,
            assigned_to.email.as_("assigned_to_email"),
            assigned_to.full_name.as_("assigned_to_name"),
            creator.email.as_("creator_email"),
            creator.full_name.as_("creator_name"),
        )
        .where(
            (tasks.due_date < today)
            & (tasks.status.notin(["Completed", "Closed", "Canceled"]))
        )
        .join(assigned_to)
        .on(tasks.assigned_to == assigned_to.name)
        .join(creator)
        .on(tasks.created_by == creator.name)
        .orderby(tasks.assigned_to)
    )

    # 2. Tasks due in 2 days
    upcoming_due_query = (
        frappe.qb.from_(tasks)
        .select(
            tasks.star,
            assigned_to.email.as_("assigned_to_email"),
            assigned_to.full_name.as_("assigned_to_name"),
            creator.email.as_("creator_email"),
            creator.full_name.as_("creator_name"),
        )
        .where(
            (tasks.due_date == two_days_from_now)
            & (tasks.status.notin(["Completed", "Closed", "Canceled"]))
        )
        .join(assigned_to)
        .on(tasks.assigned_to == assigned_to.name)
        .join(creator)
        .on(tasks.created_by == creator.name)
        .orderby(tasks.assigned_to)
    )

    # 3. New tasks added today
    new_tasks_query = (
        frappe.qb.from_(tasks)
        .select(
            tasks.star,
            assigned_to.email.as_("assigned_to_email"),
            assigned_to.full_name.as_("assigned_to_name"),
            creator.email.as_("creator_email"),
            creator.full_name.as_("creator_name"),
        )
        .where(tasks.creation.between(today_start, today_end))
        .join(assigned_to)
        .on(tasks.assigned_to == assigned_to.name)
        .join(creator)
        .on(tasks.created_by == creator.name)
        .orderby(tasks.assigned_to)
    )

    # Execute queries with pagination to handle large datasets
    # Process in chunks to avoid memory issues
    chunk_size = 1000
    tasks_by_assignee = {}

    # Process past due tasks
    for offset in range(0, 100000, chunk_size):  # Set a reasonable upper limit
        past_due_chunk = (
            past_due_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not past_due_chunk:
            break
        _process_task_chunk(past_due_chunk, tasks_by_assignee, "past_due")

    # Process upcoming due tasks
    for offset in range(0, 100000, chunk_size):
        upcoming_chunk = (
            upcoming_due_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not upcoming_chunk:
            break
        _process_task_chunk(upcoming_chunk, tasks_by_assignee, "upcoming")

    # Process new tasks
    for offset in range(0, 100000, chunk_size):
        new_tasks_chunk = (
            new_tasks_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not new_tasks_chunk:
            break
        _process_task_chunk(new_tasks_chunk, tasks_by_assignee, "new")

    for assignee, assignee_tasks in tasks_by_assignee.items():
        if assignee_tasks:
            tasks = []
            # Flatten all task types (past_due, upcoming, new) into a single list
            for task_type in ["past_due", "upcoming", "new"]:
                if task_type in assignee_tasks:
                    tasks.extend(assignee_tasks[task_type])

            if len(tasks) > 0:
                frappe.sendmail(
                    recipients=[tasks[0].assigned_to_email],
                    subject="DigiTrack: Task List - Pending / Upcoming ",
                    message=generate_task_reminder_email(tasks=tasks, type="scheduled"),
                )
