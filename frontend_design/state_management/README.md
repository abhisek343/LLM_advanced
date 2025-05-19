# Frontend State Management Strategy

This document outlines considerations and a proposed strategy for managing state in the frontend of the LLM Interviewer Platform.

## 1. Types of State

The application will involve several types of state:

*   **Global Application State**: Information that needs to be accessible across many components and user roles.
    *   Examples: Authenticated user object (ID, username, email, role), authentication token, system-wide notifications, current theme (if applicable).
*   **Feature/View-Specific State**: Data relevant to a particular feature or page, often fetched from APIs.
    *   Examples: List of candidates in HR search, details of a specific interview, content of a user's profile form.
*   **Local Component State**: State managed within individual components, not needed elsewhere.
    *   Examples: Input field values before submission, open/closed state of a modal, current tab in a tab group.
*   **Server Cache State / Remote Data**: Data fetched from the server that needs to be cached, kept in sync, and potentially re-fetched.
    *   Libraries like React Query (TanStack Query) or SWR are excellent for managing this.

## 2. Proposed Strategy

A combination of approaches is recommended:

### 2.1. Global State Management
*   **Choice**: For a moderately complex application like this with distinct user roles and shared authentication data, a dedicated global state management library is advisable.
    *   **React**: Redux Toolkit (recommended for its simplicity and power), Zustand (simpler, less boilerplate), or React Context API (for simpler global state if complexity remains low).
    *   **Vue.js**: Pinia (official, recommended) or Vuex.
    *   **Angular**: Relies on services and RxJS for state management, which is built-in.
*   **What to store globally**:
    *   `currentUser`: Object containing `{ id, username, email, role, profile_status, mapping_status, token }`.
    *   `isAuthenticated`: Boolean flag.
    *   Global error/success messages or notifications.
    *   Potentially, application-wide settings or configurations loaded at startup.

### 2.2. Server Cache State / Remote Data Management
*   **Choice**: Use a dedicated data-fetching and caching library.
    *   **React**: React Query (TanStack Query) or SWR.
    *   **Vue/Angular**: Similar libraries exist, or custom solutions with services can be built.
*   **Benefits**:
    *   Handles caching, background updates, and re-fetching of server data automatically.
    *   Manages loading and error states for API requests.
    *   Reduces boilerplate for data fetching logic in components.
    *   Improves UX by showing cached data while fetching updates.
*   **Usage**: Wrap API calls (from `src/services/`) with hooks/functions provided by these libraries. The fetched data can then be accessed by components.

### 2.3. Local Component State
*   **Choice**: Use the framework's built-in local state mechanism.
    *   **React**: `useState`, `useReducer` hooks.
    *   **Vue.js**: `data` properties, `ref`, `reactive`.
    *   **Angular**: Component class properties.
*   **Usage**: For UI-specific state like form inputs, modal visibility, toggles, etc.

## 3. State Management Flow Example (Login)

1.  `LoginForm` component captures email and password (local state).
2.  On submit, calls `authAPI.login(email, password)` from `src/services/authAPI.js`.
3.  `authAPI.login` makes the API call.
4.  On success:
    *   The token is returned.
    *   Global state action (e.g., Redux dispatch) is called: `setCurrentUser({ token, ...userDetailsFromDecodedTokenOrMeEndpoint })`.
    *   The token is stored securely (e.g., `localStorage`).
    *   `isAuthenticated` flag in global state is set to `true`.
    *   Router redirects to the appropriate dashboard.
5.  On failure:
    *   `authAPI.login` throws an error.
    *   `LoginForm` catches the error and displays an error message (local state for error message).

## 4. Data Flow

*   **Unidirectional Data Flow**: Generally preferred, especially with libraries like Redux or Vuex/Pinia. State changes flow down from stores/contexts to components, and actions flow up from components to update the state.
*   **Server Data**: Fetched via React Query/SWR hooks, which then provide the data and status (loading, error) to components. Mutations (POST, PUT, DELETE) are also handled through these libraries, which can invalidate relevant queries to re-fetch data.

## 5. Considerations

*   **Prop Drilling**: Avoid excessive prop drilling by using global state or React Context for data needed deep in the component tree.
*   **Performance**: Be mindful of how often global state updates, as it can cause re-renders. Selectors (in Redux) or memoization can help optimize.
*   **Complexity**: Choose a global state solution appropriate for the application's scale. Start simpler (e.g., Context API or Zustand) if unsure, and migrate to more complex solutions like Redux Toolkit if needed.

This strategy aims for a balance between organized global state, efficient server data management, and simple local state handling.
