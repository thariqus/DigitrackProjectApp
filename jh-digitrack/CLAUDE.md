# JH DigiTrack Development Guidelines

## Commands
- Build: `yarn build` - Builds the app with proper base paths
- Development: `yarn dev` - Starts Vite dev server
- Lint: `yarn lint` - Runs ESLint on codebase
- Preview: `yarn preview` - Preview the built application

## Code Style
- Use TypeScript strict mode with proper type definitions
- Follow ES2020 syntax standards
- Path aliases: Import from `@/*` instead of relative paths
- Components: Use functional components with React hooks
- State management: React Query for server state, React hooks for local state
- Styling: TailwindCSS with shadcn/ui components
- Error handling: Use try/catch with proper error messages in toast notifications
- Naming: PascalCase for components, camelCase for variables/functions
- Imports: Group by external, internal, then relative paths
- Avoid unused locals/parameters (enforced by TS config)

## Project Structure
- Components organized by feature domain
- UI components in `components/ui`
- Use Zod for form validation
- Follow frappe-react-sdk patterns for data fetching