# Common Authentication User Flows

This document outlines the user flows related to authentication, which are common across all user roles (Candidate, HR, Admin).

## 1. User Registration

**Goal**: A new user creates an account on the platform.

**Actors**: New User (can be Candidate, HR, or Admin - initial role selection might be part of registration or assigned later by an Admin for HR/Admin roles).

**Preconditions**: User is not logged in.

**Flow**:
1.  User navigates to the Registration page (e.g., `/register`).
2.  **UI**: Displays a form with fields for:
    *   Username (e.g., `test_user`)
    *   Email (e.g., `user@example.com`)
    *   Password (with strength indicator and confirmation field)
    *   Role selection (Dropdown: Candidate, HR). Admin registration might be a separate, restricted flow or an upgrade process.
3.  User fills in the required information.
    *   **Validation**: Frontend performs basic validation (e.g., required fields, email format, password complexity).
4.  User submits the registration form.
5.  **API Interaction**:
    *   Frontend sends a `POST` request to `auth_service/api/v1/auth/register` with the user details.
    *   **Request Body**: `{ "username": "...", "email": "...", "password": "...", "role": "candidate/hr" }`
6.  **Success Scenario**:
    *   Backend successfully creates the user and returns a `201 Created` response with user details (excluding password).
    *   Frontend displays a success message (e.g., "Registration successful! Please log in.").
    *   User is redirected to the Login page.
7.  **Failure Scenarios**:
    *   **Duplicate Email/Username**: Backend returns `400 Bad Request` with a specific error message (e.g., "Email already registered", "Username already registered"). Frontend displays the error to the user.
    *   **Validation Errors**: Backend returns `422 Unprocessable Entity` if server-side validation fails. Frontend displays appropriate error messages.
    *   **Server Error**: Backend returns `500 Internal Server Error`. Frontend displays a generic error message.

## 2. User Login

**Goal**: An existing user logs into the platform.

**Actors**: Existing User (Candidate, HR, Admin).

**Preconditions**: User has a registered account. User is not logged in.

**Flow**:
1.  User navigates to the Login page (e.g., `/login`).
2.  **UI**: Displays a form with fields for:
    *   Email (or Username)
    *   Password
    *   "Forgot Password?" link.
3.  User fills in their credentials.
4.  User submits the login form.
5.  **API Interaction**:
    *   Frontend sends a `POST` request to `auth_service/api/v1/auth/login`.
    *   **Request Body**: Form data (`application/x-www-form-urlencoded`): `username=user@example.com&password=securepassword123`
6.  **Success Scenario**:
    *   Backend validates credentials and returns a `200 OK` response with an access token and token type.
    *   **Response Body**: `{ "access_token": "...", "token_type": "bearer" }`
    *   Frontend securely stores the access token (e.g., in `localStorage`, `sessionStorage`, or a secure cookie).
    *   Frontend fetches the current user's details (`/me`) using the new token to get role and other info.
    *   User is redirected to their respective dashboard based on their role (e.g., Candidate Dashboard, HR Dashboard, Admin Dashboard).
7.  **Failure Scenarios**:
    *   **Incorrect Credentials**: Backend returns `401 Unauthorized` with an error message (e.g., "Incorrect email or password"). Frontend displays the error.
    *   **User Not Found**: Backend might return `401` or `404` (handled as incorrect credentials to avoid user enumeration). Frontend displays a generic login error.
    *   **Server Error**: Backend returns `500 Internal Server Error`. Frontend displays a generic error message.

## 3. User Logout

**Goal**: An authenticated user logs out of the platform.

**Actors**: Authenticated User.

**Preconditions**: User is logged in.

**Flow**:
1.  User clicks the "Logout" button (typically in a user menu or header).
2.  Frontend removes the stored access token.
3.  Frontend clears any user-specific state from the application's state management.
4.  User is redirected to the Login page or a public landing page.
5.  **API Interaction (Optional but Recommended)**:
    *   If using token blocklisting on the backend, the frontend could send a request to an `/auth/logout` endpoint to invalidate the token on the server-side. This is not explicitly defined in the current backend but is a good practice.

## 4. Fetch Current User Details (`/me`)

**Goal**: The frontend retrieves details of the currently authenticated user.

**Actors**: Authenticated User (via frontend application logic).

**Preconditions**: User is logged in and has a valid access token.

**Flow**:
1.  Typically occurs after login or when the application loads/refreshes and a token is present.
2.  **API Interaction**:
    *   Frontend sends a `GET` request to `auth_service/api/v1/auth/me` with the `Authorization: Bearer <token>` header.
3.  **Success Scenario**:
    *   Backend returns `200 OK` with user details (e.g., ID, username, email, role, profile status).
    *   Frontend uses this information to:
        *   Personalize the UI.
        *   Determine user role for RBAC.
        *   Store user information in the application state.
4.  **Failure Scenarios**:
    *   **Invalid/Expired Token**: Backend returns `401 Unauthorized`. Frontend should clear the invalid token and redirect to the Login page.
    *   **Server Error**: Backend returns `500 Internal Server Error`. Frontend displays an error or attempts a graceful degradation.

## 5. (Future Consideration) Forgot Password / Reset Password

**Goal**: A user who has forgotten their password can reset it.

**Actors**: User.

**Preconditions**: User has a registered account.

**Flow (High-Level)**:
1.  User clicks "Forgot Password?" on the Login page.
2.  User enters their registered email address.
3.  Frontend sends a request to a backend endpoint (e.g., `/auth/forgot-password`).
4.  Backend generates a password reset token, stores it (with expiry), and sends a password reset link to the user's email.
5.  User clicks the link in their email, which navigates them to a Reset Password page with the token in the URL.
6.  User enters a new password (and confirmation).
7.  Frontend sends a request to a backend endpoint (e.g., `/auth/reset-password`) with the token and new password.
8.  Backend validates the token and updates the user's password.
9.  User is notified of success and can now log in with the new password.
    *(This flow requires new backend endpoints in the `auth_service`)*
