"""
This module contains functions for generating HTML emails for task reminders.
"""

import frappe
from jinja2 import Template


def generate_task_reminder_email(tasks, type, initiator_name=""):
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
    <body>
        <div class="container">
            <p>Dear {{ tasks[0].assigned_to_name }},</p>
            
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
                    </tr>
                    {% endfor %}
                </tbody>
            </table>

            <p>
            <a href="{{ url }}/jh-digitrack/tasks/">Click here</a> to view your tasks.
            <br/>
            <br/>
            {{initiator_mention}}
            
            <p class="footer"><em>{{ footer }}</em></p>
        </div>
    </body>
</html>
    """

    header = ""
    if type == "reminder" or type == "escalation" or type == "email_me":
        header = "The below task is pending from your end:"
    elif type == "scheduled":
        header = "The below tasks are opened in your name:"

    footer = ""
    if type == "reminder" or type == "escalation" or type == "email_me":
        footer = "This email inbox is not actively monitored."
    elif type == "scheduled":
        footer = (
            "This is an automated message. This email inbox is not actively monitored."
        )

    initiator_mention = ""
    if initiator_name:
        if type == "reminder":
            initiator_mention = f"Reminded by {initiator_name}"
        elif type == "escalation":
            initiator_mention = f"Escalated by {initiator_name}"
        elif type == "email_me":
            initiator_mention = f"Emailed me by {initiator_name}"

    # Create Jinja2 template object
    template = Template(template_str)

    url = frappe.utils.get_url()

    # Render the template with provided context
    html_content = template.render(
        tasks=tasks,
        url=url,
        header=header,
        footer=footer,
        initiator_mention=initiator_mention,
    )

    return html_content
