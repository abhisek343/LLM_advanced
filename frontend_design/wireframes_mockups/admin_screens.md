# Admin Screen Wireframes (Descriptive)

This document describes key screens specific to the Administrator user role.

## 1. Admin Dashboard

**Screen Name/Route**: Admin Dashboard / `/admin/dashboard`

**User Role(s)**: Admin

**Objective**: Provide an overview of system health, user activity, pending administrative tasks.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Welcome Message**: "Welcome, [Admin Name]!"
*   **System Statistics Cards/Widgets**:
    *   **Total Users**: Count of (Admins, HRs, Candidates).
    *   **HR Status**: Count of (Mapped HRs, Pending HR Applications, HRs needing profile completion).
    *   **Candidate Status**: Count of (Active Candidates, Candidates pending assignment, Candidates with recent interviews).
    *   **Interview Activity**: Count of (Interviews Scheduled Today/Week, Interviews Completed Today/Week).
    *   Link: "View Detailed System Stats" (links to `/admin/stats`).
*   **Pending Actions Card**:
    *   Title: "Action Required"
    *   Item: "[X] HR Applications awaiting your approval." (Links to `/admin/hr-applications`).
    *   Item: "[Y] Candidates pending HR assignment." (Links to `/admin/candidates/assign`).
*   **Quick Navigation Card**:
    *   Button: "Manage Users" (links to `/admin/users`).
    *   Button: "Manage HR Mappings" (links to `/admin/hr-management`).
    *   Button: "View All Interviews" (links to `/admin/interviews-overview`).

**Data Displayed**: Aggregated system statistics, counts of pending tasks.

**User Interactions**: Navigate to detailed views for stats, user management, HR management.

**API Connections**:
*   `GET admin_service/api/v1/admin/stats`
*   `GET admin_service/api/v1/admin/hr-applications?status=pending` (example for count)

## 2. User Management Page

**Screen Name/Route**: User Management / `/admin/users`

**User Role(s)**: Admin

**Objective**: Allow Admin to view, search, filter, and manage all users in the system.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "User Management".
*   **Search and Filter Bar**:
    *   Text input for Username/Email search.
    *   Dropdown filter for Role (All, Candidate, HR, Admin).
    *   Dropdown filter for Status (e.g., Active, Pending Profile, Pending Mapping, Mapped).
    *   Button: "Search/Filter".
*   **User Table/List**:
    *   Columns: User ID, Username, Email, Role, Status, Date Registered, Last Login (optional).
    *   Action buttons per row:
        *   "View Details" (links to user's detailed profile view, potentially read-only for admin).
        *   "Edit User" (e.g., change role, activate/deactivate - opens modal).
        *   "Delete User" (with confirmation).
*   **Button**: "Create New User" (Optional, if Admins can create users, especially other Admins or pre-register HRs).
*   **Pagination Controls**.

**Data Displayed**: List of users with their key attributes.

**User Interactions**:
*   Search and filter users.
*   View user details.
*   Edit user roles/status.
*   Delete users.
*   Create new users (if feature exists).

**API Connections**:
*   `GET admin_service/api/v1/admin/users` (with query parameters for search/filter/pagination).
*   `GET admin_service/api/v1/admin/users/{user_id}` (for details).
*   `PUT/PATCH admin_service/api/v1/admin/users/{user_id}` (for edits - endpoint to be defined).
*   `DELETE admin_service/api/v1/admin/users/{user_id_to_delete}`.
*   `POST auth_service/api/v1/auth/register` (if admin creates users, potentially with special privileges).

## 3. HR Application & Mapping Management Page

**Screen Name/Route**: HR Management / `/admin/hr-management` (or similar)

**User Role(s)**: Admin

**Objective**: Allow Admin to review HR applications, approve/reject them, search for HRs, and send mapping requests.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "HR Applications & Mappings".
*   **Tabs/Sections**:
    *   **Pending HR Applications**:
        *   Table/List of applications from HRs: HR Name, Email, Application Date, Link to HR Profile.
        *   Action buttons: "Approve", "Reject".
    *   **Search & Invite HRs**:
        *   Search filters for HRs (Name, Email, Specialization - if available from HR profile).
        *   Results list: HR Name, Email, Current Status (e.g., "Profile Complete, Not Mapped"). "Send Mapping Request" button.
    *   **My Mapped HRs**:
        *   List of HRs currently mapped to this Admin: HR Name, Email, Date Mapped. "View Details", "Unmap HR" buttons.
    *   **Sent Mapping Requests**:
        *   List of mapping requests sent by this Admin to HRs: HR Name, Date Sent, Status (Pending, Accepted, Rejected by HR).

**Data Displayed**: Lists of HR applications, searchable HRs, mapped HRs, sent requests.

**User Interactions**:
*   Approve/reject HR applications.
*   Search for HRs.
*   Send mapping requests to HRs.
*   View details of mapped HRs.
*   Unmap an HR.

**API Connections**:
*   `GET admin_service/api/v1/admin/hr-applications`
*   `POST admin_service/api/v1/admin/hr-applications/{application_id}/accept`
*   `POST admin_service/api/v1/admin/hr-applications/{application_id}/reject`
*   `GET admin_service/api/v1/admin/search-hr`
*   `POST admin_service/api/v1/admin/hr-mapping-requests/{hr_user_id}`
*   `GET admin_service/api/v1/admin/users?role=hr&admin_manager_id={admin_id}&hr_status=mapped` (for "My Mapped HRs").
*   (Backend endpoint needed for Admin to unmap an HR).
*   (Backend endpoint needed to view status of mapping requests sent by Admin).

## 4. Candidate Assignment Page

**Screen Name/Route**: Assign Candidates / `/admin/candidates/assign` (or part of User Management)

**User Role(s)**: Admin

**Objective**: Allow Admin to assign candidates (who are `pending_assignment`) to one of their mapped HRs.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "Assign Candidates to HR".
*   **Filter/Search for Candidates**:
    *   Filter by status: "Pending Assignment".
    *   Search by candidate name/email.
*   **List of Unassigned Candidates**:
    *   Table/List: Candidate Name, Email, Profile Summary Link, Date Registered.
    *   Action: "Assign HR" button per candidate.
*   **Assign HR Modal (when "Assign HR" is clicked)**:
    *   Displays Candidate Name.
    *   Dropdown list of HRs mapped to the current Admin (HR Name, current load - optional).
    *   Button: "Confirm Assignment".

**Data Displayed**: List of unassigned candidates, list of admin's mapped HRs.

**User Interactions**:
*   Select a candidate.
*   Select an HR from the dropdown.
*   Confirm assignment.

**API Connections**:
*   `GET admin_service/api/v1/admin/users?role=candidate&mapping_status=pending_assignment` (to list unassigned candidates).
*   `GET admin_service/api/v1/admin/users?role=hr&admin_manager_id={admin_id}&hr_status=mapped` (to populate HR dropdown).
*   `POST admin_service/api/v1/admin/candidates/{candidate_id}/assign-hr`

## 5. System Statistics Page

**Screen Name/Route**: System Statistics / `/admin/stats`

**User Role(s)**: Admin

**Objective**: Provide a detailed view of various system metrics and analytics.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "System Statistics".
*   **Data Cards/Charts/Tables for various metrics**:
    *   **User Statistics**:
        *   Total users by role (Candidate, HR, Admin) - Chart (e.g., pie, bar).
        *   New user registrations over time (line chart).
    *   **HR Statistics**:
        *   Number of HRs: Total, Mapped, Pending Profile, Pending Mapping.
        *   Average candidates per mapped HR.
    *   **Candidate Statistics**:
        *   Number of Candidates: Total, Profile Complete, With Resume, Assigned, Pending Assignment.
    *   **Interview Statistics**:
        *   Total interviews: Scheduled, In Progress, Completed, Evaluated.
        *   Interviews per type (AI Screening, Technical, etc.).
        *   Average interview scores (if applicable).
        *   Interview completion rate.
    *   **LLM Service Status/Usage** (if available from backend): "Operational", "Error Rate", "Tokens Used".
*   **Date Range Filters**: Allow admin to view stats for specific periods.

**Data Displayed**: Various numerical and graphical representations of system data.

**User Interactions**: Select date ranges, potentially drill down into specific stats.

**API Connections**:
*   `GET admin_service/api/v1/admin/stats` (This endpoint might need to be enhanced to support date ranges or more detailed breakdowns if not already).
*   Potentially other specific stat-related endpoints if data is too complex for a single call.
