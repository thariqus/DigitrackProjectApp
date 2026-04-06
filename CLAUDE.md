# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JH DigiTrack is a custom Frappe v15 app for Jaleel Holdings, evolving from a monolithic application into a **modular workflow platform** — the central system for all business workflows (tasks, travel, audits, meetings, property rental, PMS, and future modules). Every code change should move toward this direction.

- **Frappe backend**: `jh_digitrack/` — DocTypes, APIs, scheduler jobs, permissions
- **React frontend (DigiTrack)**: `jh-digitrack/` — Primary SPA: tasks, audits, meetings, dashboard, search, idle assets (React 18, Vite, TailwindCSS v4, shadcn/ui, frappe-react-sdk)
- **React frontend (PMS)**: `PMS/` — Performance Management System (separate React app, same stack, will eventually merge into the main SPA)

The single Frappe module is `JH Digitrack` (see `modules.txt`). Do **not** create new modules.

## Strategic Direction

DigiTrack is being incrementally upgraded toward a **three-layer modular architecture** (see `week1-architectural-review.md` and `future.md` for full details):

```
Module Layer      →  Business-specific implementations (Travel, Property, PMS, etc.)
Workflow Layer    →  Reusable approval engine, state machine, notification manager, permission manager
Core Layer        →  Base DocTypes, API base classes, shared UI components
```

### What This Means For Every Task

When working on any feature or fix, keep these principles in mind:

1. **Favor shared over duplicated.** If a pattern exists in one module (tasks, audits, meetings), extract it rather than copy it. The codebase has significant duplication to reduce (e.g., `audit-tasks.tsx` / `meeting-tasks.tsx` / their shrink/expanded variants are near-identical).
2. **Keep API patterns consistent.** New API endpoints should follow the same CRUD/list/export patterns so they can eventually be served by a `WorkflowAPI` base class. Domain-specific logic goes in hooks, not scattered through the endpoint.
3. **Build for module registration.** New frontend modules should be structured so they can register into a workflow selector with metadata (id, label, icon, routes, permissions). Avoid hard-coding navigation or module awareness into shared components.
4. **Consolidate, don't add more variants.** Legacy DocTypes (`JH Tasks Master`, `JH Audits`) coexist with current versions (`JH Task Master`, `JH Audit Master`). When touching these areas, consolidate rather than adding more.
5. **PMS will merge into the main SPA.** The `PMS/` app will eventually be absorbed into `jh-digitrack/` as a workflow module. Keep this in mind when building shared infrastructure.

### Planned Architectural Changes (from future.md / refactor-plan.md)

**Frontend:**
- App shell with persistent sidebar + workflow selector (replacing top nav)
- Route structure: `/jh-digitrack/:workflow/...` (e.g., `/jh-digitrack/tasks/*`, `/jh-digitrack/travel/*`)
- Single `<TaskTable>` component with props (`sourceDoctype`, `layout`, `sourceId`) replacing all audit-tasks/meeting-tasks/shrink/expanded variants
- Shared `<Timeline>` component replacing duplicated `TaskTimeline` / `AuditTimeline`
- `TaskMetaProvider` context to avoid repeated `useDocTypeMeta()` calls
- Shadcn variant props (`size="sm"`, `variant="ghost"`) instead of separate shrink component files

**Backend:**
- Core DocTypes: `JH Task` (canonical task), `JH Workflow` (workflow metadata), shared `JH Participant` / `JH Attachment` / `JH Comment Log` child tables
- `WorkflowAPI` base class with standard CRUD/approve/reject/export methods + extension hooks
- Reorganized modules: `core/` (tasks, change logs), `workflows/<name>/`, `catalog/` (scrap), `integrations/` (HRMS)
- Configuration-driven approval engine with JSON workflow definitions
- HRMS sync: upsert strategy replacing current delete-all/re-insert approach

## Development Commands

```bash
# Frappe backend
bench start                              # Start the Frappe dev server
bench --site <site> migrate              # Run migrations (also triggers after_migrate hook)
bench --site <site> console              # Python REPL with Frappe context
bench --site <site> run-tests --app jh_digitrack  # Run all tests
bench --site <site> run-tests --doctype "JH Task Master"  # Run tests for a single DocType

# React frontend (DigiTrack)
cd jh-digitrack && yarn dev              # Vite dev server on port 8080
cd jh-digitrack && yarn build            # Build to jh_digitrack/public/jh-digitrack/ + copy HTML entry
cd jh-digitrack && yarn lint             # ESLint

# React frontend (PMS)
cd PMS && yarn dev                       # Vite dev server
cd PMS && yarn build                     # Build to jh_digitrack/public/PMS/
```

## Architecture

### Backend: DocType & API Separation

**DocType controllers** (`jh_digitrack/jh_digitrack/doctype/`) contain only document lifecycle logic:
- `validate` — field-level business rules (date checks, required fields, HTML sanitization)
- `before_save` — computed/derived fields only
- `before_submit` — state-transition guards
- `before_insert` — initial setup (e.g., setting `requested_by` from session user)

**API endpoints** (`jh_digitrack/api/`) contain all business logic exposed to the frontend, split by domain (e.g., `tasks.py`, `travel.py`, `meetings.py`, `goal_creation.py`). API logic must **not** live in DocType controller files.

**API helpers** (`jh_digitrack/api/helpers/`) contain shared utilities like `email_html.py` (Jinja2 HTML email generation), `file_validation.py`, `clean_html.py`.

### Key Domain Modules

- **Tasks**: Core feature — personal, created-by-me, and team views with reminders, escalations, change logs, PDF exports. Serial numbers auto-increment per source. `JH Task Master` is the canonical DocType (legacy `JH Tasks Master` still exists).
- **Audits / Meetings**: Grouped task containers (`JH Audit Master`, `JH Grouped Task Master`) with parallel API structure mirroring tasks. These share ~95% logic with tasks and are prime candidates for consolidation.
- **Travel**: Multi-role workflow (requester → manager → credit card holder → workflow user) with Frappe Workflow States. JS client scripts adapt UI per role. `travel_request_query` in `permissions.py` handles row-level access.
- **Property Rental**: New module (see `property_automation_system_spec.md` and `convention.md`). Multi-stage approval pipeline for lease renewals with audit trail. Uses `JH Property` prefix for all DocTypes.
- **PMS**: Goal setting and evaluation cycle (Goal Pending → Submitted → Evaluation → Submitted). Separate React app at `/PMS/`, separate API files (`pms_report.py`, `goal_assignment.py`, `goal_creation.py`, `goal_evaluation.py`, `goal_master.py`). Has its own role system (`PMS Employees` flags: `pms_admin`, `pms_manager`, `pms_employee`, `pms_master`).
- **Idle Assets / Scrap Items**: Public catalog with guest-accessible APIs (security concern noted — scope guest access when touching this).

### Permissions

- DocType-level permissions are defined in the DocType JSON
- Row-level filtering uses `permission_query_conditions` in hooks.py (see `permissions.py` for the `travel_request_query` pattern)
- API-level access control: every `@frappe.whitelist()` method must have explicit role/permission checks at the top
- Key roles: JH Digitrack Member/Admin, JH Credit Card Holder, JH Travel Workflow User, Inbox User, JRC Permission

### Document Events (Cross-DocType Hooks)

`doc_events` in hooks.py hooks into non-app DocTypes (User, Comment, File). Domain-specific doc event handlers live in `jh_digitrack/jh_digitrack/doc_events/`.

### Scheduler Jobs

Registered in hooks.py under `scheduler_events > cron`. Handler functions live in the `api/` directory. Current jobs: task email digests (00:10, 00:30 daily), HRMS access token sync (01:00 daily).

### Frontend → Backend Integration

Both React apps use `frappe-react-sdk` for auth and API calls. Built assets output to `jh_digitrack/public/` and are served through Frappe via HTML entries in `jh_digitrack/www/`. Website route rules in hooks.py map `/jh-digitrack/<path>` and `/PMS/<path>` to their respective SPAs.

### After-Migrate Hook

`jh_digitrack/setup/after_migrate.py` runs on every `bench migrate` — it creates the JH admin user and preloads travel request type data. Patches are registered in `patches.txt`.

## Naming & Coding Conventions (from convention.md)

### DocType Naming
- Prefix new property-related DocTypes with **JH Property** — keeps them grouped and avoids collisions
- Other DocTypes use **JH** prefix (e.g., `JH Task Master`, `JH Travel Request`)
- Child tables: use a descriptive suffix (e.g., `JH Property Cheque Detail`)
- Create DocTypes via Frappe UI or JSON, **never** by hand-editing JSON (broken checksums)
- Place all DocTypes under `jh_digitrack/jh_digitrack/doctype/`

### Python
- `snake_case` for all files, functions, variables — no camelCase in Python
- API decorators must specify HTTP method: `@frappe.whitelist(methods=["GET"])` — never bare `@frappe.whitelist()`
- Use `frappe.db.get_value()`, `frappe.db.get_all()`, and `frappe.qb` over raw SQL; use `frappe.db.escape()` when raw SQL is unavoidable
- Sanitize user-facing text fields in `validate()` with `frappe.utils.sanitize_html()`
- Never trust client-side input for workflow state transitions — validate current state and user role server-side

### JavaScript / TypeScript
- `snake_case` for JS file names (e.g., `file_upload_validator.js`)
- Client scripts use `frappe.ui.form.on()` pattern
- React: PascalCase for components, camelCase for variables/functions, `@/*` path aliases

### Git Workflow
- One DocType per PR (API + scheduler logic for that DocType can be in the same PR)
- PR descriptions must be elaborate
- Do not commit unrelated files
- Pre-push hook on `develop` branch auto-bumps version

## Known Technical Debt

- **Component duplication**: `audit-tasks.tsx`, `meeting-tasks.tsx`, and their `-shrink`/`-expanded` variants repeat ~95% of the same code. Same for `TaskTimeline` vs `AuditTimeline`.
- **Dead code**: `src/router.tsx` is an unused duplicate of the routes defined in `App.tsx`.
- **Legacy DocTypes**: `JH Tasks Master` and `JH Audits` are older versions that coexist with `JH Task Master` and `JH Audit Master`.
- **Guest API exposure**: Several endpoints (`scrapitem_search`, `employee_search`, `employee_requests`, `doctype`) allow unauthenticated access.
- **HRMS sync brittleness**: `user_details.py` deletes all rows and re-inserts on each sync cycle — risks data loss during API outages.
- **Idle logout**: Uses direct `window.location.href` redirect instead of React Router navigation.

## Fixtures

Fixtures are defined in hooks.py: `Navbar Settings` and the `JRC Permission` role. These are exported/imported on migrate.
