# System Patterns

## Architectural Overview
- **Frontend & Backend Separation:** The app is divided into a React-based frontend and a Node.js backend, communicating via REST API and WebSockets.
- **Real-Time Communication:** Utilizes WebSockets (via socket.js) to manage live quiz sessions, score updates, and state transitions.
- **Theming with Styled Components:** Implements dynamic theming (Alliance vs. Horde) through styled-components, ensuring consistent UI based on user preference.
- **State Management:** Uses React hooks (useState, useEffect) for managing component state and side effects.

## Design Decisions
- **RESTful API:** For user management, quiz creation, and data retrieval.
- **WebSockets Integration:** To manage real-time events and deliver immediate user feedback.
- **PropTypes for Robustness:** Added PropTypes across components to enforce type-checking and reduce runtime errors.
