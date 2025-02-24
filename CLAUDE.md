# The Quiz - Development Guidelines

## Commands
- Backend: `cd backend && bun run dev` (development) or `bun run start` (production)
- Frontend: `cd frontend && npm run dev` (development) or `npm run build` (production)
- Linting: `cd frontend && npm run lint`

## Code Style
- **Architecture**: Separate frontend (React/Vite) and backend (Express/Bun) in dedicated folders
- **Imports**: Group by 1) External libraries 2) Internal modules with blank line separator
- **File Structure**: Feature-based organization (backend) and component-based (frontend)
- **Naming**: Component files use PascalCase, utility files use camelCase, all React components are functional
- **Types**: Use TypeScript for backend, PropTypes for React components
- **State Management**: React hooks for local state, context for global state
- **Error Handling**: Use try/catch with specific error messages, log errors with Winston
- **Styling**: Use styled-components with theme provider
- **API Communication**: Axios for REST endpoints, Socket.io for real-time features
- **Logging**: Winston for backend logs with appropriate log levels
- **Authentication**: JWT in Authorization header, stored in localStorage

Follow consistent patterns seen in existing code when adding new features.