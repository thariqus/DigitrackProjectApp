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


@frappe.whitelist(allow_guest=True)
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
    for offset in range(0, 100000, chunk_size):
        past_due_chunk = (
            past_due_assignee_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not past_due_chunk:
            break
        _process_task_chunk(past_due_chunk, tasks_by_assignee, {}, "past_due")

    # Process upcoming due tasks for assignees
    for offset in range(0, 100000, chunk_size):
        upcoming_chunk = (
            upcoming_due_assignee_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not upcoming_chunk:
            break
        _process_task_chunk(upcoming_chunk, tasks_by_assignee, {}, "upcoming")

    # Process new tasks for assignees
    for offset in range(0, 100000, chunk_size):
        new_tasks_chunk = (
            new_tasks_assignee_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not new_tasks_chunk:
            break
        _process_task_chunk(new_tasks_chunk, tasks_by_assignee, {}, "new")

    # Process changes after last scheduled email for assignees
    for offset in range(0, 100000, chunk_size):
        changes_chunk = (
            changes_after_last_scheduled_email_assignee.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not changes_chunk:
            break
        _process_task_chunk(changes_chunk, tasks_by_assignee, {}, "changes")
    
    # Process past due tasks for assignors
    for offset in range(0, 100000, chunk_size):
        past_due_chunk = (
            past_due_assignor_query.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not past_due_chunk:
            break
        _process_task_chunk(past_due_chunk, {}, tasks_by_assignor, "past_due")

    # Process changes after last scheduled email for assignors
    for offset in range(0, 100000, chunk_size):
        changes_chunk = (
            changes_after_last_scheduled_email_assignor.limit(chunk_size).offset(offset).run(as_dict=True)
        )
        if not changes_chunk:
            break
        _process_task_chunk(changes_chunk, {}, tasks_by_assignor, "changes")

    # Send emails to assignees
    for assignee, assignee_tasks in tasks_by_assignee.items():
        if assignee_tasks:
            tasks = []
            changed_tasks = []
            # Flatten all task types (past_due, upcoming, new) into a single list
            for task_type in ["past_due", "upcoming", "new"]:
                if task_type in assignee_tasks:
                    tasks.extend(assignee_tasks[task_type])

            for task_type in ["changes"]:
                if task_type in assignee_tasks:
                    changed_tasks.extend(assignee_tasks[task_type])

            if len(tasks) > 0:
                frappe.sendmail(
                    expose_recipients="header",
                    recipients=[tasks[0].assigned_to_email],
                    subject="DigiTrack: Task List - Pending / Upcoming / New",
                    message=generate_task_reminder_email(
                        tasks=tasks, 
                        type="scheduled_assignee", 
                        changed_tasks=changed_tasks, 
                        recipient_name=tasks[0].assigned_to_name),
                )

                # Mark scheduled_email_sent_at for all tasks sent to this assignee
                for task in tasks:
                    try:
                        task_doc = frappe.get_doc("JH Task Master", task.name)
                        task_doc.scheduled_email_sent_at = frappe.utils.add_to_date(frappe.utils.now(), seconds=10)
                        task_doc.save(ignore_permissions=True)
                    except Exception as e:
                        frappe.log_error(f"Error updating scheduled_email_sent_at for task {task.name}: {str(e)}")


    # Send emails to assignors
    for assignor, assignor_tasks in tasks_by_assignor.items():
        if assignor_tasks:
            tasks = []
            changed_tasks = []

            # Flatten all task types (past_due, upcoming, new) into a single list
            for task_type in ["past_due", "upcoming", "new"]:
                if task_type in assignor_tasks:
                    tasks.extend(assignor_tasks[task_type])

            for task_type in ["changes"]:
                if task_type in assignor_tasks:
                    changed_tasks.extend(assignor_tasks[task_type])

            if len(tasks) > 0:
                frappe.sendmail(
                    expose_recipients="header",
                    recipients=[tasks[0].creator_email],
                    subject="DigiTrack: Task List - Pending",
                    message=generate_task_reminder_email(
                        tasks=tasks, 
                        type="scheduled_assignor", 
                        changed_tasks=changed_tasks, 
                        recipient_name=tasks[0].creator_name),
                )
                # Mark scheduled_email_sent_at for all tasks sent to this assignor
                # Only update if not already updated by assignee email (avoid duplicate updates)
                for task in tasks:
                    try:
                        task_doc = frappe.get_doc("JH Task Master", task.name)
                        # Only update if not already updated in the last minute (to avoid race conditions)
                        if not task_doc.scheduled_email_sent_at or \
                           (frappe.utils.now_datetime() - task_doc.scheduled_email_sent_at).total_seconds() > 60:
                            task_doc.scheduled_email_sent_at = frappe.utils.add_to_date(frappe.utils.now(), seconds=10)
                            task_doc.save(ignore_permissions=True)
                    except Exception as e:
                        frappe.log_error(f"Error updating scheduled_email_sent_at for task {task.name}: {str(e)}")

    return "Scheduled emails sent successfully"


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
