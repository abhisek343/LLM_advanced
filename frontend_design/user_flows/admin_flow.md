# Admin User Flows

This document outlines the primary user flows for the Administrator role on the LLM Interviewer Platform.

**Actor**: Admin User (Authenticated User with "admin" role)

## 1. Admin Dashboard / Home

**Goal**: Admin views their main dashboard after logging in.

**Preconditions**: Admin is logged in.

**Flow**:
1.  User logs in as an Admin (see `common_auth_flow.md`).
2.  User is redirected to the Admin Dashboard (e.g., `/admin/dashboard`).
3.  **UI**: Displays:
    *   **Welcome Message**: "Welcome, [Admin Name]!"
    *   **System Statistics Overview**:
        *   Total Users (Candidates, HRs, Admins).
        *   Total Interviews Scheduled/Completed.
        *   Number of Mapped HRs / Pending HR Applications.
        *   Link to "View Detailed Stats".
    *   **Pending HR Applications/Requests**:
        *   Count of HR applications awaiting approval.
        *   Count of mapping requests sent by this Admin to HRs.
        *   Link to "Manage HR Applications & Mappings".
    *   **User Management Quick Access**:
        *   Link to "View All Users".
        *   "Create New User" (if admin can create other admins or pre-register HRs).
    *   **Quick Links**:
        *   "System Configuration" (if applicable, e.g., LLM settings, default question categories).
        *   "Audit Logs" (if applicable).
4.  **API Interactions**:
    *   `GET admin_service/api/v1/admin/stats` (for dashboard statistics).
    *   `GET admin_service/api/v1/admin/hr-applications` (to get count/summary of pending HR applications).
    *   `GET hr_service/api/v1/hr/pending-admin-requests?admin_id={admin_user_id}` (or similar, for requests sent by this admin).

## 2. User Management

**Goal**: Admin views, creates (potentially), modifies, and deletes users.

**Preconditions**: Admin is logged in.

**Flow**:

### 2.1. View All Users
1.  Admin navigates to the User Management page (e.g., `/admin/users`).
2.  **UI**: Displays a table or list of all users with columns for:
    *   Username, Email, Role, Creation Date, Status (e.g., Active, Profile Pending, Mapped).
    *   Filters (by role, status).
    *   Search bar.
    *   Action buttons per user: "View Details", "Edit User", "Delete User".
3.  **API Interaction**: `GET admin_service/api/v1/admin/users`.

### 2.2. View Specific User Details
1.  Admin clicks "View Details" for a user.
2.  **UI**: Shows a detailed view of the user's profile information (similar to what the user themselves sees, but potentially with more admin-specific fields like internal IDs, last login).
3.  **API Interaction**: `GET admin_service/api/v1/admin/users/{user_id}`.

### 2.3. Edit User (Limited Scope)
*   Admins might have limited editing capabilities (e.g., changing a user's role, deactivating an account). Direct profile editing is usually left to the user.
*   This flow would involve fetching user data, presenting an edit form for allowed fields, and submitting changes via a `PUT` or `PATCH` request to an admin-specific user update endpoint (not explicitly defined yet, but could be `admin_service/api/v1/admin/users/{user_id}`).

### 2.4. Delete User
1.  Admin clicks "Delete User" for a specific user (with confirmation prompt).
2.  **API Interaction**: `DELETE admin_service/api/v1/admin/users/{user_id_to_delete}`.
3.  Frontend updates the user list and shows a success/error message.
    *   **Note**: Logic for unassigning candidates if an HR is deleted is handled by the backend.

## 3. Manage HR Applications and Mappings

**Goal**: Admin reviews applications from HRs and manages mappings (inviting HRs, approving/rejecting).

**Preconditions**: Admin is logged in.

**Flow**:

### 3.1. View and Process HR Applications
1.  Admin navigates to "HR Applications" page (e.g., `/admin/hr-applications`).
2.  **UI**: Lists applications from HR users who want to be mapped to this Admin.
    *   HR Name, Email, Application Date, Link to HR Profile.
    *   "Approve Application" / "Reject Application" buttons.
3.  **API Interaction (List Applications)**: `GET admin_service/api/v1/admin/hr-applications`.
4.  Admin reviews an application (may click to view HR's profile).
5.  Admin clicks "Approve" or "Reject".
    *   **API Interaction (Approve)**: `POST admin_service/api/v1/admin/hr-applications/{application_id}/accept`.
    *   **API Interaction (Reject)**: `POST admin_service/api/v1/admin/hr-applications/{application_id}/reject`.
6.  UI updates the application status.

### 3.2. Search and Invite HRs (Proactive Mapping)
1.  Admin navigates to a "Search HRs" or "Invite HR" page.
2.  **UI**: Search filters for HRs (e.g., by specialization, experience if available in HR profiles). Results list HRs.
    *   Action button: "Send Mapping Request".
3.  **API Interaction (Search HRs)**: `GET admin_service/api/v1/admin/search-hr` (with query parameters).
4.  Admin selects an HR and clicks "Send Mapping Request".
5.  **API Interaction (Send Request)**: `POST admin_service/api/v1/admin/hr-mapping-requests/{hr_user_id}`.
6.  UI shows confirmation. The request appears in the HR's "Pending Admin Requests".

## 4. Assign HR to Candidate

**Goal**: Admin assigns a mapped HR to a candidate who is pending assignment.

**Preconditions**: Admin is logged in. Candidate exists with `mapping_status: "pending_assignment"`. HR user exists, is mapped to this Admin, and has `hr_status: "mapped"`.

**Flow**:
1.  Admin navigates to a "Candidate Management" or "Unassigned Candidates" page.
2.  **UI**: Lists candidates pending assignment.
    *   Candidate Name, Email, Profile Summary.
    *   Action: "Assign HR".
3.  Admin selects a candidate and clicks "Assign HR".
4.  **UI**: Modal or dropdown to select from the Admin's list of mapped HRs.
    *   **API Interaction (to get mapped HRs for this Admin)**: Could be `GET admin_service/api/v1/admin/users?role=hr&admin_manager_id={admin_id}&hr_status=mapped` or a dedicated endpoint.
5.  Admin selects an HR and confirms assignment.
6.  **API Interaction**: `POST admin_service/api/v1/admin/candidates/{candidate_id}/assign-hr`.
    *   **Request Body**: `{ "hr_id": "..." }`
7.  UI updates candidate status, HR is notified.

## 5. View System-Wide Interview Data (Optional/Advanced)

**Goal**: Admin gets an overview of all interview activities.

**Preconditions**: Admin is logged in.

**Flow**:
1.  Admin navigates to an "All Interviews" or "Interview Analytics" page.
2.  **UI**: Displays:
    *   Table/list of all interviews across the system (or those managed by their mapped HRs).
    *   Filters: by HR, by Candidate, by Date Range, by Status (Scheduled, In Progress, Completed, Evaluated).
    *   Key metrics: Average scores, completion rates, etc.
    *   Link to view individual interview details/results.
3.  **API Interactions**:
    *   `GET interview_service/api/v1/interview/all` (Admin/HR view of all interviews).
    *   `GET interview_service/api/v1/interview/results/all` (Admin/HR view of all completed interviews).
    *   These might require query parameters for filtering and pagination.

## 6. System Configuration (Conceptual)

**Goal**: Admin configures system-level settings.

**Preconditions**: Admin is logged in.

**Flow (Highly Dependant on Actual Features)**:
1.  Admin navigates to "System Settings" page.
2.  **UI**: Could include sections for:
    *   Default question categories or types.
    *   LLM service API key management (securely handled).
    *   Email notification templates.
    *   Role permission adjustments (if a granular permission system exists beyond base roles).
3.  **API Interactions**: Would require dedicated backend endpoints in relevant services (e.g., `interview_service` for question settings, a new `config_service` or within `admin_service` for global settings).
    *This is a more advanced area and would need specific backend support.*
