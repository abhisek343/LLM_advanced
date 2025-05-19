# Admin Service System Design

## Overview
The Admin Service is responsible for administrative tasks within the LLM Interviewer platform. It provides endpoints for managing users (excluding other admins), viewing system statistics, handling HR mapping applications and requests, and assigning HR personnel to candidates.

## Key Responsibilities
- User Management (listing, viewing, activating/deactivating, deleting non-admin users)
- System Statistics (providing counts of users, interviews, assignments)
- HR Mapping Management (accepting/rejecting HR applications, sending requests to HR)
- Candidate Assignment (assigning mapped HRs to pending candidates)

## Dependencies
- **MongoDB:** Stores user data, HR mapping requests, and potentially other administrative configurations.
- **Auth Service:** Relies on the Auth Service for user authentication and authorization (specifically, verifying admin users).

## API Endpoints (Summary)
- `/admin/users`: Get list of non-admin users.
- `/admin/stats`: Get system statistics.
- `/admin/users/{user_id}`: Get details of a specific user.
- `/admin/users/{user_id}/status`: Update user activation status.
- `/admin/users/{user_id}`: Delete a user.
- `/admin/hr-applications`: Get pending HR applications.
- `/admin/hr-applications/{application_id}/accept`: Accept an HR application.
- `/admin/hr-applications/{application_id}/reject`: Reject an HR application.
- `/admin/search-hr`: Search for HR profiles.
- `/admin/hr-mapping-requests/{hr_user_id}`: Send a mapping request to an HR.
- `/admin/me/hr-mapping-requests-sent`: Get mapping requests sent by the current admin.
- `/admin/candidates/{candidate_id}/assign-hr`: Assign an HR to a candidate.

## Data Models (Relevant)
- User (with roles, statuses like `hr_status`, `mapping_status`, `admin_manager_id`, `assigned_hr_id`)
- HRMappingRequest (tracking applications/requests between HR and Admin)

## Business Logic Highlights
- Ensures only admin users can access administrative endpoints.
- Prevents admins from modifying or deleting other admin accounts or their own.
- Manages the lifecycle of HR mapping requests and applications.
- Updates user statuses (`hr_status`, `mapping_status`) based on administrative actions.
- Un-assigns candidates from an HR if the HR user is deleted.

## Potential Future Enhancements
- More granular permissions for different admin roles.
- Audit logging for administrative actions.
- More sophisticated reporting and analytics.
- Integration with external HR systems.