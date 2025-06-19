from . import __version__ as app_version

app_name = "jh_digitrack"
app_title = "JH Digitrack"
app_publisher = "Bytsolv"
app_description = "Digitrack"
app_email = "tech@bytsolv"
app_license = "unlicense"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
add_to_apps_screen = [
    {
        "name": "jh_digitrack",
        "logo": "/assets/jh_digitrack/images/jh-logo.png",
        "title": "JH Digitrack",
        "route": "/jh-digitrack",
        "has_permission": "jh_digitrack.api.permission.has_app_permission",
    }
]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/jh_digitrack/css/navbar_hide.css"
app_include_js = "/assets/jh_digitrack/js/workspaces_button_hide.js"

# include js, css files in header of web template
# web_include_css = "/assets/jh_digitrack/css/jh_digitrack.css"
# web_include_js = "/assets/jh_digitrack/js/jh_digitrack.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "jh_digitrack/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "jh_digitrack/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "jh_digitrack.utils.jinja_methods",
# 	"filters": "jh_digitrack.utils.jinja_filters"
# }

after_migrate = "jh_digitrack.setup.after_migrate.run"

# Installation
# ------------

# before_install = "jh_digitrack.install.before_install"
# after_install = "jh_digitrack.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "jh_digitrack.uninstall.before_uninstall"
# after_uninstall = "jh_digitrack.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "jh_digitrack.utils.before_app_install"
# after_app_install = "jh_digitrack.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "jh_digitrack.utils.before_app_uninstall"
# after_app_uninstall = "jh_digitrack.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "jh_digitrack.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

permission_query_conditions = {
    "JH Travel Request": "jh_digitrack.permissions.travel_request_query",
}
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
    "User": {
        "before_save": "jh_digitrack.setup.user_events.before_save",
    }
}

# Scheduled Tasks
# ---------------

scheduler_events = {
    # "all": [
    # 	"jh_digitrack.tasks.all"
    # ],
    "daily": ["jh_digitrack.api.tasks.scheduled_emails"],
    # "hourly": [
    # 	"jh_digitrack.tasks.hourly"
    # ],
    # "weekly": [
    # 	"jh_digitrack.tasks.weekly"
    # ],
    # "monthly": [
    # 	"jh_digitrack.tasks.monthly"
    # ],
}

# Testing
# -------

# before_tests = "jh_digitrack.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "jh_digitrack.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "jh_digitrack.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["jh_digitrack.utils.before_request"]
# after_request = ["jh_digitrack.utils.after_request"]

# Job Events
# ----------
# before_job = ["jh_digitrack.utils.before_job"]
# after_job = ["jh_digitrack.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"jh_digitrack.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }


website_route_rules = [
    {"from_route": "/jh-digitrack/<path:app_path>", "to_route": "jh-digitrack"},
]
