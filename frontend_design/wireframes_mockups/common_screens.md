# Common Screen Wireframes (Descriptive)

This document describes common screens and layout elements applicable across multiple user roles or the entire application.

## 1. Main Application Layout

**Objective**: Define the consistent structure for authenticated user views.

**User Role(s)**: Candidate, HR, Admin (once logged in)

**Key UI Elements**:
*   **Header**:
    *   **Logo**: Application logo/name (links to dashboard).
    *   **User Menu**: Displays logged-in user's name/avatar.
        *   Dropdown with links: "My Profile", "Settings" (if any), "Logout".
    *   **Notifications Icon**: (Optional) Bell icon with a badge for unread notifications/messages.
*   **Main Navigation (Sidebar or Top Navigation Bar)**:
    *   Links vary based on user role.
    *   **Candidate**: Dashboard, My Profile, My Interviews, Messages.
    *   **HR**: Dashboard, My Profile, Search Candidates, Assigned Candidates, Schedule Interview, Messages, Admin Connections.
    *   **Admin**: Dashboard, User Management, HR Applications, System Stats, (System Config).
    *   Selected/active link is highlighted.
*   **Main Content Area**:
    *   The central part of the screen where specific page content is rendered.
    *   Includes a page title/breadcrumb.
*   **Footer**:
    *   Copyright information, links to "Terms of Service", "Privacy Policy".

## 2. Login Screen

**Screen Name/Route**: Login / `/login`

**User Role(s)**: All (Unauthenticated)

**Objective**: Allow existing users to authenticate and access the platform.

**Key UI Elements**:
*   **Application Title/Logo**.
*   **Form Title**: "Login" or "Sign In".
*   **Email/Username Input Field**: Label "Email" or "Username". Placeholder text.
*   **Password Input Field**: Label "Password". Placeholder text. Type `password`.
*   **"Forgot Password?" Link**: Navigates to a password recovery flow (future).
*   **Submit Button**: Text "Login" or "Sign In".
*   **Registration Link**: Text "Don't have an account? Register here." Navigates to `/register`.
*   **Error Message Area**: Displays login errors (e.g., "Incorrect email or password.").

**Data Displayed**: None initially. Error messages upon failed login.

**User Interactions**:
*   Enter email/username.
*   Enter password.
*   Click "Login" button.
*   Click "Forgot Password?" link.
*   Click "Register here" link.

**API Connections**:
*   `POST auth_service/api/v1/auth/login`

## 3. Registration Screen

**Screen Name/Route**: Register / `/register`

**User Role(s)**: All (Unauthenticated - for Candidate/HR roles primarily)

**Objective**: Allow new users to create an account.

**Key UI Elements**:
*   **Application Title/Logo**.
*   **Form Title**: "Create Account" or "Register".
*   **Username Input Field**: Label "Username".
*   **Email Input Field**: Label "Email".
*   **Password Input Field**: Label "Password". Type `password`.
    *   May include password strength indicator.
*   **Confirm Password Input Field**: Label "Confirm Password". Type `password`.
*   **Role Selection Dropdown**: Label "I am a:". Options: "Candidate", "HR".
    *   Admin registration might be a separate, restricted process or an upgrade path.
*   **Terms of Service Checkbox**: (Optional but recommended) "I agree to the Terms of Service and Privacy Policy."
*   **Submit Button**: Text "Register" or "Create Account".
*   **Login Link**: Text "Already have an account? Login here." Navigates to `/login`.
*   **Error Message Area**: Displays registration errors (e.g., "Email already exists," "Passwords do not match").

**Data Displayed**: None initially. Error messages upon failed registration.

**User Interactions**:
*   Enter username, email, password, confirm password.
*   Select role.
*   Agree to terms (if applicable).
*   Click "Register" button.
*   Click "Login here" link.

**API Connections**:
*   `POST auth_service/api/v1/auth/register`

## 4. Generic Page Not Found (404) Screen

**Screen Name/Route**: Not Found / `/*` (Catch-all for invalid routes)

**User Role(s)**: All

**Objective**: Inform the user that the requested page does not exist.

**Key UI Elements**:
*   **Error Message**: "404 - Page Not Found".
*   **Descriptive Text**: "Sorry, the page you are looking for does not exist or has been moved."
*   **Link/Button**: "Go to Homepage" or "Go to Dashboard" (if logged in).

**Data Displayed**: Static error information.

**User Interactions**:
*   Click link/button to navigate to a valid page.

**API Connections**: None.
