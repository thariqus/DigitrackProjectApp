
Reject -> re negotiate or close the workflow



## Basic Rules

1. Prefix every new DocType with JH Property.
Examples: JH Property Master, JH Property Rental Renewal, JH Property Global Config, JH Property Audit Trail. This keeps them grouped in the DocType
list and avoids collision with existing doctypes like JH Division Master.
2. Use snake_case for all Python files, functions, and variables. Match the existing pattern: jh_property_master.py, validate_renewal_dates(),
cheque_amount. No camelCase in Python.
3. Use snake_case for all JS file names. Match existing file_upload_validator.js pattern. Use frappe.ui.form.on() for doctype client scripts.
4. Name child tables with a JH Property prefix and a Table or descriptive suffix. Example: JH Property Cheque Detail

## DocType Structure

5. Create all DocTypes via the Frappe UI or JSON, never by hand-editing JSON. After creation, commit the generated JSON as-is. Manual JSON edits lead
to broken checksums and migration issues.
6. Place all new DocTypes under the module path jh_digitrack/jh_digitrack/doctype/. Do not create new modules or sub-apps. The modules.txt file should
remain unchanged.
7. Use the validate hook for all field-level business rules (date checks, required field enforcement, rent increase % calculations). Use before_save
only for derived/computed fields. Use before_submit for state-transition guards.

## API Layer

8. Place all API endpoints in /jh_digitrack/api/ as separate files per domain. For this feature, create property.py (or split into
property_master.py, property_renewal.py if large). Do not put API logic inside DocType controller files.
9. Decorate every API endpoint with an explicit HTTP method:
    @frappe.whitelist(methods=["GET"])
    def get_expiring_properties(days: int = 90):
10. Never use bare @frappe.whitelist() without specifying the method.
11. Use frappe.has_permission() or role checks at the top of every whitelisted method. Do not rely solely on DocType permissions for API-level access
control.

## Notifications & Scheduler

12. Register notification scheduler jobs in hooks.py under scheduler_events > cron. Follow the existing pattern. Use descriptive function names:
"0 7 * * *": ["jh_digitrack.api.property.send_renewal_notifications"]
13. Implement the three-tier notification logic in a single scheduler function that queries JH Property Master for upcoming renewal dates, checks for
existing JH Property Rental Renewal records, and dispatches emails accordingly. Do not create three separate scheduler entries.
14. Use the email_html.py helper pattern for email templates. Create a property_email_html.py in api/helpers/ with Jinja2-based HTML generation. Do
not inline HTML strings in Python logic.

## Audit Trail

15. Create JH Property Audit Trail as a standalone DocType with all fields from the spec (timestamp, user, document_type, document_name,
previous_state, new_state, action, comment). Set permissions to read-only for all roles except System Manager.
16. In the DocType controller, override delete and save to prevent modification:
class JHPropertyAuditTrail(Document):
    def before_save(self):
        if not self.is_new():
              frappe.throw(_("Audit Trail records cannot be modified."))

      def before_cancel(self):
          frappe.throw(_("Audit Trail records cannot be cancelled."))
17. Log every workflow transition by hooking into on_update of the Rental Renewal DocType. Compare self._doc_before_save.workflow_state with
self.workflow_state and create an audit record on change.

## Permissions

18. Define DocType-level permissions in the DocType JSON using the role names. Follow the existing pattern from JH Travel Request —
grant read, write, create per role as needed.
19. For row-level filtering, add a permission_query_conditions entry in hooks.py and implement the query in permissions.py. Match the existing
travel_request_query pattern.
20. The Property Module Admin role gets full CRUD + delete. All other roles get only the permissions needed for their workflow stage. No role should
have delete permission on Rental Renewal.

## Security

21. Sanitize all user-facing text fields in validate():
if self.comments:
    self.comments = frappe.utils.sanitize_html(self.comments, always_sanitize=True)
22. This matches the existing pattern in JHTravelRequest.
23. Use frappe.db.escape() in any raw SQL queries. Prefer frappe.db.get_value(), frappe.db.get_all(), and frappe.qb (query builder) over raw SQL
wherever possible.
24. Never trust client-side input for workflow state transitions. Always validate the current state and user role server-side before allowing a
transition.

## Git & Code Review

25. One DocType per PR. Do not bundle multiple DocType definitions in a single pull request. API endpoints and scheduler logic for that DocType can be
included in the same PR.
26. PR description must be elaborate.
27. Do not commit unrelated files.