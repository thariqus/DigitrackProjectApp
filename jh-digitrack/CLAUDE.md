# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **DigiTrack React SPA** — the primary user-facing frontend for JH DigiTrack. It is being incrementally upgraded to become the **unified shell** for all Jaleel Holdings business workflows (tasks, travel, audits, meetings, property rental, PMS, and future modules). See the root `CLAUDE.md` for full-stack context.

## Commands

```bash
yarn dev              # Vite dev server on port 8080
yarn build            # Build to ../jh_digitrack/public/jh-digitrack/ + copy HTML entry to www/
yarn lint             # ESLint
yarn preview          # Preview the built application
```

Build output goes to `../jh_digitrack/public/jh-digitrack/` and the HTML entry point is copied to `../jh_digitrack/www/jh-digitrack.html`. This is how Frappe serves the SPA at `/jh-digitrack/<path>`.

## Code Style

- TypeScript strict mode with proper type definitions
- Path aliases: `@/*` maps to `src/` (configured in vite.config.ts and tsconfig)
- Functional components with React hooks — no class components
- React Query (`@tanstack/react-query`) for server state, React hooks for local state
- TailwindCSS v4 with shadcn/ui components (in `components/ui/`)
- Zod for form validation with `react-hook-form` + `@hookform/resolvers`
- `frappe-react-sdk` for all Frappe API calls (auth, document CRUD, method calls)
- PascalCase for components, camelCase for variables/functions
- Group imports: external → internal (`@/`) → relative paths

## Architecture & Current State

### App Bootstrap (App.tsx)

`App.tsx` is the single entry point. It sets up:
1. `QueryClientProvider` — React Query with shared `queryClient`
2. `BrowserRouter` — all routes under `/jh-digitrack/`
3. `AuthProvider` — validates ERP login, JH User Master record, and maintenance mode
4. Idle logout (15-min timeout via `window.location.href` redirect)

Routes are defined directly in `App.tsx`. Note: `src/router.tsx` is dead code (stale duplicate) — do not use it.

### Component Organization

- `components/<domain>/` — feature modules: `tasks/`, `audits/`, `meetings/`, `scrapitem/`, `search/`, `dashboard/`, `projects/`, `jrc-permission/`
- `components/ui/` — shadcn/ui primitives (button, dialog, table, select, etc.)
- `components/utils/` — shared display components
- `hooks/` — React Query hooks per domain (`task.ts`, `audits.ts`, `meetings.ts`, `system.ts`, etc.)
- `types/` — TypeScript type definitions per domain
- `utils/` — query client config, frappe client wrapper

### Key Patterns

**Data fetching**: Every API call goes through a typed React Query hook in `hooks/`. Hooks use `frappe-react-sdk`'s `useFrappeGetCall` / `useFrappePostCall` or the `frappeClient` wrapper. New hooks should follow the same pattern — typed params, typed return values, consistent query keys.

**Domain components**: Each module (tasks, audits, meetings) has its own directory with list views, detail views, and UI subcomponents. These are accessed via routes in `App.tsx`.

## Strategic Direction — Incremental Upgrade

This app is evolving from a monolithic SPA into a **modular workflow platform**. When making any change, align with these targets:

### 1. Eliminate Component Duplication (Priority)

The biggest technical debt is duplicated task table components. These files are near-identical and should be consolidated:
- `task-table/audit-tasks.tsx`, `audit-tasks-expanded.tsx`, `audit-tasks-shrink.tsx`
- `task-table/meeting-tasks.tsx`, `meeting-tasks-expanded.tsx`, `meeting-tasks-shrink.tsx`

**Target**: A single `<TaskTable sourceDoctype="JH Audit Master" layout="compact" />` component that accepts props for `sourceDoctype`, `sourceId`, layout density, and optional column overrides.

Similarly, `TaskTimeline` and `AuditTimeline` share ~95% code → merge into a shared `<Timeline doctype={...} referenceId={...} />`.

**Principle**: Instead of creating `-shrink` / `-expanded` file variants, use shadcn variant props (`size="sm"`, `variant="ghost"`) and responsive Tailwind classes on a single component.

### 2. Module Registration Architecture (Future)

The app will transition to a **workflow registry** pattern:
- Sidebar-based workflow selector replacing current top navigation
- Route structure: `/jh-digitrack/:workflow/...` (e.g., `/jh-digitrack/tasks/*`, `/jh-digitrack/travel/*`)
- Each module registers metadata: `{ id, label, icon, defaultRoute, permissions, featureFlags }`
- Lazy-loaded workflow bundles per module
- Role-guarded navigation driven by the registry

When adding new modules or routes, structure them so they can plug into this registry without refactoring.

### 3. Shared UI Primitives (Design System)

Build typed domain components on top of shadcn/ui primitives, then reuse across modules:
- `<FilterBar>` — dynamic filter generation from DocType field metadata
- `<DataTable>` — configurable columns, pagination, sorting, exports
- `<DetailSheet>` — slide-over detail view with tabs
- `<ApprovalWidget>` — visual approval flow with role-based action buttons

### 4. Centralize Metadata & Hooks

- `useDocTypeMeta("JH Task Master")` is called redundantly across filters, status selectors, and timelines. Wrap in a `TaskMetaProvider` context that preloads the schema once.
- Namespace hooks by domain: `useTasks()`, `useTravel()`, `useAudits()` — with shared hooks for search, permissions, and notifications.

### 5. PMS Convergence

The `PMS/` app (at project root) will eventually merge into this SPA as a workflow module. Its patterns (role-based dashboard redirect, goal assessment cycle, report views) should inform how we structure the module registration system.

## What To Avoid

- **Don't create new `-shrink` or `-expanded` file variants.** Use props and responsive styles instead.
- **Don't hard-code module awareness into shared components.** A `<TaskTable>` should not import from `audits/` — pass configuration as props.
- **Don't duplicate hooks.** If a hook exists for a similar pattern in another domain, extract a shared hook.
- **Don't use `window.location.href` for internal navigation.** Use React Router's `useNavigate()`. (Existing idle logout is a known debt item.)
- **Don't add routes to `src/router.tsx`** — it's dead code. All routes are in `App.tsx`.
