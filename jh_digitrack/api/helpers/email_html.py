"""
This module contains functions for generating HTML emails for task reminders.
"""

import frappe
from jinja2 import Template
from datetime import datetime

def get_task_comments(task_id, limit=3):
    """
    Get the last N comments for a task in chronological order (most recent first).
    
    Args:
        task_id (str): The task ID
        limit (int): Number of comments to fetch (default: 3)
    
    Returns:
        list: List of comment dictionaries with formatted content
    """
    try:
        # Get comments from Comment doctype
        comments = frappe.db.get_list(
            "Comment",
            filters={
                "reference_name": task_id,
                "comment_type": "Comment",
                "reference_doctype": "JH Task Master"
            },
            fields=["*"],
            order_by="creation desc",
            limit=limit,
            ignore_permissions=True
        )
        
        # Combine and sort all entries
        comments.sort(key=lambda x: x.get('creation', ''), reverse=True)
        
        # Format the entries
        formatted_comments = []
        for entry in comments[:limit]:
            creation = entry.get('creation')
            if isinstance(creation, str):
                creation = datetime.strptime(creation, "%Y-%m-%d %H:%M:%S")
            formatted_date = creation.strftime("%d-%m-%Y, %H:%M")
            comment_by = entry.get('comment_by', '')
            content = entry.get('content', '')
            
            formatted_comments.append(f"{formatted_date} : {comment_by} : {content}")
        
        return formatted_comments
        
    except Exception as e:
        frappe.log_error(f"Error fetching comments for task {task_id}: {str(e)}")
        return []


def generate_task_reminder_email(
        tasks, 
        type, 
        initiator_name="", 
        recipient_name="",
        upcoming_tasks=[], 
        new_tasks=[], 
        changed_tasks=[]
    ):
    """
    Generate an HTML email for task reminders.

    Parameters:
    - task (object): Task document object with attributes like task_name, description, etc.

    Returns:
    - str: HTML content of the email
    """

    # Define the HTML template with Jinja2 syntax
    template_str = """
    <html>
    <head>
        <style>
            .comments-cell {
                max-width: 300px;
                word-wrap: break-word;
            }
            .comment-line {
                margin-bottom: 3px;
                padding: 2px 0;
            }
            .comment-line:last-child {
                margin-bottom: 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            
            <p>Dear {{ recipient_name }},</p>
            
            <p>{{ header }}</p>
            
            <table border="1" cellpadding="5" cellspacing="0">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Created Date</th>
                        <th>Created By</th>
                        <th>Assigned To</th>
                        <th>Due Date</th>
                        <th>Revised Due Date</th>
                        <th>Status</th>
                        <th>Completed Date</th>
                        <th>Effort (hrs)</th>
                        <th>Recent Comments</th>
                    </tr>
                </thead>
                <tbody>
                    {% for task_item in tasks %}
                    <tr>
                        <td>{{ task_item.name if task_item.name else "-" }}</td>
                        <td>{{ task_item.task_name if task_item.task_name else "-" }}</td>
                        <td>{{ task_item.description if task_item.description else "-" }}</td>
                        <td>{{ task_item.creation.strftime("%d %b %Y") if task_item.creation else "-" }}</td>
                        <td>{{ task_item.creator_name if task_item.creator_name else "-" }}</td>
                        <td>{{ task_item.assigned_to_name if task_item.assigned_to_name else "-" }}</td>
                        <td>{{ task_item.due_date.strftime("%d %b %Y") if task_item.due_date else "-" }}</td>
                        <td>{{ task_item.revised_due_date.strftime("%d %b %Y") if task_item.revised_due_date else "-" }}</td>
                        <td>{{ task_item.status if task_item.status else "-" }}</td>
                        <td>{{ task_item.completion_date.strftime("%d %b %Y") if task_item.completion_date else "-" }}</td>
                        <td>{{ task_item.effort_hrs if task_item.effort_hrs else "-" }}</td>
                        <td class="comments-cell">
                            {% if task_item.recent_comments and task_item.recent_comments|length > 0 %}
                                {% for comment in task_item.recent_comments %}
                                    <div class="comment-line">{{ comment }}</div>
                                {% endfor %}
                            {% else %}
                                -
                            {% endif %}
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>

            {% if upcoming_tasks|length > 0 %}
                <p>Upcoming tasks (Tasks due in 2 days or 7 days):</p>
                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Created Date</th>
                            <th>Created By</th>
                            <th>Assigned To</th>
                            <th>Due Date</th>
                            <th>Revised Due Date</th>
                            <th>Status</th>
                            <th>Completed Date</th>
                            <th>Effort (Hrs)</th>
                            <th>Recent Comments</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for task_item in upcoming_tasks %}
                        <tr>
                            <td>{{ task_item.name if task_item.name else "-" }}</td>
                            <td>{{ task_item.task_name if task_item.task_name else "-" }}</td>
                            <td>{{ task_item.description if task_item.description else "-" }}</td>
                            <td>{{ task_item.creation.strftime("%d %b %Y") if task_item.creation else "-" }}</td>
                            <td>{{ task_item.creator_name if task_item.creator_name else "-" }}</td>
                            <td>{{ task_item.assigned_to_name if task_item.assigned_to_name else "-" }}</td>
                            <td>{{ task_item.due_date.strftime("%d %b %Y") if task_item.due_date else "-" }}</td>
                            <td>{{ task_item.revised_due_date.strftime("%d %b %Y") if task_item.revised_due_date else "-" }}</td>
                            <td>{{ task_item.status if task_item.status else "-" }}</td>
                            <td>{{ task_item.completion_date.strftime("%d %b %Y") if task_item.completion_date else "-" }}</td>
                            <td>{{ task_item.effort_hrs if task_item.effort_hrs else "-" }}</td>
                            <td class="comments-cell">
                                {% if task_item.recent_comments and task_item.recent_comments|length > 0 %}
                                    {% for comment in task_item.recent_comments %}
                                        <div class="comment-line">{{ comment }}</div>
                                    {% endfor %}
                                {% else %}
                                    -
                                {% endif %}
                            </td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            {% endif %}

            {% if new_tasks|length > 0 %}
                <p>New tasks (New tasks added today):</p>
                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Created Date</th>
                            <th>Created By</th>
                            <th>Assigned To</th>
                            <th>Due Date</th>
                            <th>Revised Due Date</th>
                            <th>Status</th>
                            <th>Completed Date</th>
                            <th>Effort (Hrs)</th>
                            <th>Recent Comments</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for task_item in new_tasks %}
                        <tr>
                            <td>{{ task_item.name if task_item.name else "-" }}</td>
                            <td>{{ task_item.task_name if task_item.task_name else "-" }}</td>
                            <td>{{ task_item.description if task_item.description else "-" }}</td>
                            <td>{{ task_item.creation.strftime("%d %b %Y") if task_item.creation else "-" }}</td>
                            <td>{{ task_item.creator_name if task_item.creator_name else "-" }}</td>
                            <td>{{ task_item.assigned_to_name if task_item.assigned_to_name else "-" }}</td>
                            <td>{{ task_item.due_date.strftime("%d %b %Y") if task_item.due_date else "-" }}</td>
                            <td>{{ task_item.revised_due_date.strftime("%d %b %Y") if task_item.revised_due_date else "-" }}</td>
                            <td>{{ task_item.status if task_item.status else "-" }}</td>
                            <td>{{ task_item.completion_date.strftime("%d %b %Y") if task_item.completion_date else "-" }}</td>
                            <td>{{ task_item.effort_hrs if task_item.effort_hrs else "-" }}</td>
                            <td class="comments-cell">
                                {% if task_item.recent_comments and task_item.recent_comments|length > 0 %}
                                    {% for comment in task_item.recent_comments %}
                                        <div class="comment-line">{{ comment }}</div>
                                    {% endfor %}
                                {% else %}
                                    -
                                {% endif %}
                            </td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            {% endif %}

            {% if changed_tasks|length > 0 %}
                <p>Tasks that have changed since the last email:</p>
                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Created Date</th>
                            <th>Created By</th>
                            <th>Assigned To</th>
                            <th>Due Date</th>
                            <th>Revised Due Date</th>
                            <th>Status</th>
                            <th>Completed Date</th>
                            <th>Effort (Hrs)</th>
                            <th>Recent Comments</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for task_item in changed_tasks %}
                        <tr>
                            <td>{{ task_item.name if task_item.name else "-" }}</td>
                            <td>{{ task_item.task_name if task_item.task_name else "-" }}</td>
                            <td>{{ task_item.description if task_item.description else "-" }}</td>
                            <td>{{ task_item.creation.strftime("%d %b %Y") if task_item.creation else "-" }}</td>
                            <td>{{ task_item.creator_name if task_item.creator_name else "-" }}</td>
                            <td>{{ task_item.assigned_to_name if task_item.assigned_to_name else "-" }}</td>
                            <td>{{ task_item.due_date.strftime("%d %b %Y") if task_item.due_date else "-" }}</td>
                            <td>{{ task_item.revised_due_date.strftime("%d %b %Y") if task_item.revised_due_date else "-" }}</td>
                            <td>{{ task_item.status if task_item.status else "-" }}</td>
                            <td>{{ task_item.completion_date.strftime("%d %b %Y") if task_item.completion_date else "-" }}</td>
                            <td>{{ task_item.effort_hrs if task_item.effort_hrs else "-" }}</td>
                            <td class="comments-cell">
                                {% if task_item.recent_comments and task_item.recent_comments|length > 0 %}
                                    {% for comment in task_item.recent_comments %}
                                        <div class="comment-line">{{ comment }}</div>
                                    {% endfor %}
                                {% else %}
                                    -
                                {% endif %}
                            </td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            {% endif %}

            <p>
            <a href="{{ url }}/jh-digitrack/tasks/">Click here</a> to view your tasks.
            <br/>
            <br/>
            {{initiator_mention}}
            <p class="notes"><em>Note: If this is your first time accessing the system, please use the ‘Forgot Password’ option on the login page to set up your credentials. For further assistance, you may also contact the Technology Solutions Team. To understand how to use the system, please refer to the User Manual available under your Profile Settings. </em></p>
            <p class="footer"><em>{{ footer }}</em></p>
        </div>
    </body>
</html>
    """

    header = ""
    if type == "reminder" or type == "escalation":
        header = "The below task is pending from your end:"
    elif type == "assignee_scheduler":
        header = "Past Due Tasks (Overdue Tasks):"
    elif type == "assignor_scheduler":
        header = "The below tasks are missed by the assignee:"

    footer = ""
    if type == "reminder" or type == "escalation" or type == "email_me":
        footer = "This email inbox is not actively monitored."
    elif type == "assignee_scheduler" or type == "assignor_scheduler":
        footer = (
            "This is an automated message. This email inbox is not actively monitored."
        )

    initiator_mention = ""
    if initiator_name:
        if type == "reminder":
            initiator_mention = f"Reminded by {initiator_name}"
        elif type == "escalation":
            initiator_mention = f"Escalated by {initiator_name}"

    # Add recent comments to each task
    for task in tasks:
        task.recent_comments = get_task_comments(task.name, limit=3)

    # Add recent comments to each changed task
    for changed_task in changed_tasks:
        changed_task.recent_comments = get_task_comments(changed_task.name, limit=3)
    
    # Add recent comments to each upcoming task
    for upcoming_task in upcoming_tasks:
        upcoming_task.recent_comments = get_task_comments(upcoming_task.name, limit=3)
    
    # Add recent comments to each new task
    for new_task in new_tasks:
        new_task.recent_comments = get_task_comments(new_task.name, limit=3)

    # Create Jinja2 template object
    template = Template(template_str)

    url = frappe.utils.get_url()

    # Render the template with provided context
    html_content = template.render(
        tasks=tasks,
        changed_tasks=changed_tasks,
        upcoming_tasks=upcoming_tasks,
        new_tasks=new_tasks,
        url=url,
        header=header,
        footer=footer,
        initiator_mention=initiator_mention,
        recipient_name=recipient_name,
    )

    return html_content
