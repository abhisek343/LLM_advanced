# Admin Service API Integration

This document details how frontend components and user flows interact with the `admin_service` backend API. All endpoints require authentication (Admin role token).

**Base URL**: `http://localhost:8004/api/v1/admin` (configurable)

## 1. Get All Users

*   **Frontend View/Component**: `UserManagementPage`
*   **User Flow**: Admin User Flows - 2.1. View All Users
*   **API Endpoint**: `GET /users`
*   **Request Headers**: `Authorization: Bearer <admin_access_token>`
*   **Query Parameters (Optional)**: For filtering (e.g., `role=candidate`, `status=active`), searching (`search=username_or_email`), and pagination (`skip=0`, `limit=20`).
*   **Success Response (200 OK)**: List of `UserOut` objects.
    ```json
    [
        {
            "id": "user_id_1",
            "username": "user1",
            "email": "user1@example.com",
            "role": "candidate",
            "is_active": true,
            "created_at": "datetime_string",
            // ... other UserOut fields
        },
        {
            "id": "user_id_2",
            "username": "hruser1",
            "email": "hr1@example.com",
            "role": "hr",
            // ...
        }
    ]
    ```
*   **Error Responses**: `401 Unauthorized`.
*   **Frontend Action**: Display users in a table/list with filtering and search capabilities.

## 2. Get System Stats

*   **Frontend View/Component**: `AdminDashboardWidgets`, `SystemStatisticsPage`
*   **User Flow**: Admin User Flows - 1. Admin Dashboard, 5. System Statistics Page
*   **API Endpoint**: `GET /stats`
*   **Request Headers**: `Authorization: Bearer <admin_access_token>`
*   **Success Response (200 OK)**:
    ```json
    {
        "total_users": 150,
        "total_hr_mapped": 10,
        "total_candidates_assigned": 50,
        "total_interviews_scheduled": 75,
        "total_interviews_completed": 60,
        "llm_service_status": "Operational (Placeholder)"
        // Potentially more detailed stats if the endpoint is enhanced
    }
    ```
*   **Error Responses**: `401 Unauthorized`.
*   **Frontend Action**: Display statistics on the dashboard and detailed stats page.

## 3. Get User by ID

*   **Frontend View/Component**: `UserManagementPage` (View Details action)
*   **User Flow**: Admin User Flows - 2.2. View Specific User Details
*   **API Endpoint**: `GET /users/{user_id}`
*   **Request Headers**: `Authorization: Bearer <admin_access_token>`
*   **Path Parameter**: `user_id`.
*   **Success Response (200 OK)**: `UserOut` object for the specified user.
*   **Error Responses**: `401 Unauthorized`, `404 Not Found`.
*   **Frontend Action**: Display detailed user information (possibly in a modal or separate view).

## 4. Delete User

*   **Frontend View/Component**: `UserManagementPage` (Delete action)
*   **User Flow**: Admin User Flows - 2.4. Delete User
*   **API Endpoint**: `DELETE /users/{user_id_to_delete}`
*   **Request Headers**: `Authorization: Bearer <admin_access_token>`
*   **Path Parameter**: `user_id_to_delete`.
*   **Success Response (204 No Content)**.
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `403 Forbidden`: If trying to delete self or another admin.
    *   `404 Not Found`: User to delete not found.
*   **Frontend Action**: Confirm deletion with the admin, then remove user from the list upon success. Display error messages if deletion fails.

## 5. Get HR Applications (for this Admin)

*   **Frontend View/Component**: `HRApplicationList`, `AdminDashboardWidgets`
*   **User Flow**: Admin User Flows - 3.1. View and Process HR Applications
*   **API Endpoint**: `GET /hr-applications`
*   **Request Headers**: `Authorization: Bearer <admin_access_token>`
*   **Query Parameters (Optional)**: `status=pending` (to get only pending ones).
*   **Success Response (200 OK)**: List of `HRMappingRequestOut` objects.
    ```json
    [
        {
            "id": "request_id_1",
            "requester_id": "hr_user_id", // HR who applied
            "requester_username": "hr_username", // Added for display
            "target_id": "admin_user_id", // This admin
            "request_type": "hr_to_admin_application",
            "status": "pending",
            "created_at": "datetime_string",
            "updated_at": "datetime_string"
        }
    ]
    ```
*   **Error Responses**: `401 Unauthorized`.
*   **Frontend Action**: Display list of HR applications needing review.

## 6. Accept HR Application

*   **Frontend View/Component**: `HRApplicationList`
*   **User Flow**: Admin User Flows - 3.1. View and Process HR Applications
*   **API Endpoint**: `POST /hr-applications/{application_id}/accept`
*   **Request Headers**: `Authorization: Bearer <admin_access_token>`
*   **Path Parameter**: `application_id`.
*   **Success Response (200 OK)**: `{"message": "Application {application_id} accepted."}` (Backend also updates HR user's status and `admin_manager_id`).
*   **Error Responses**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`.
*   **Frontend Action**: Update application status in UI, potentially refresh mapped HR list.

## 7. Reject HR Application

*   **Frontend View/Component**: `HRApplicationList`
*   **User Flow**: Admin User Flows - 3.1. View and Process HR Applications
*   **API Endpoint**: `POST /hr-applications/{application_id}/reject`
*   **Request Headers**: `Authorization: Bearer <admin_access_token>`
*   **Path Parameter**: `application_id`.
*   **Success Response (200 OK)**: `{"message": "Application {application_id} rejected."}`.
*   **Error Responses**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`.
*   **Frontend Action**: Update application status in UI.

## 8. Search HR Profiles (for Admin to invite)

*   **Frontend View/Component**: `HRApplication & MappingManagementPage` (Search & Invite HRs tab)
*   **User Flow**: Admin User Flows - 3.2. Search and Invite HRs
*   **API Endpoint**: `GET /search-hr`
*   **Request Headers**: `Authorization: Bearer <admin_access_token>`
*   **Query Parameters (Optional)**: `status_filter` (e.g., "profile_complete"), `keyword`, `yoe_min`, `limit`.
*   **Success Response (200 OK)**: List of `RankedHR` (or similar HR profile summary) objects.
    ```json
    [
        {
            "id": "hr_user_id",
            "username": "hr_username",
            "email": "hr@example.com",
            "company": "HR Solutions Ltd.",
            "years_of_experience": 5,
            "hr_status": "profile_complete", // Important for inviting
            // "rank_score": 0.9 // if applicable
        }
    ]
    ```
*   **Error Responses**: `401 Unauthorized`.
*   **Frontend Action**: Display searchable list of HRs.

## 9. Send HR Mapping Request (Admin invites HR)

*   **Frontend View/Component**: `HRApplication & MappingManagementPage` (Search & Invite HRs tab)
*   **User Flow**: Admin User Flows - 3.2. Search and Invite HRs
*   **API Endpoint**: `POST /hr-mapping-requests/{hr_user_id}`
*   **Request Headers**: `Authorization: Bearer <admin_access_token>`
*   **Path Parameter**: `hr_user_id` (ID of the HR to invite).
*   **Success Response (200 OK)**: `HRMappingRequestOut` object representing the created request.
*   **Error Responses**: `400 Bad Request` (e.g., HR already mapped, request already exists), `401 Unauthorized`, `404 Not Found` (HR not found).
*   **Frontend Action**: Display confirmation, update "Sent Mapping Requests" list.

## 10. Assign HR to Candidate

*   **Frontend View/Component**: `CandidateAssignmentPage`, `HRAssignmentModal`
*   **User Flow**: Admin User Flows - 4. Assign HR to Candidate
*   **API Endpoint**: `POST /candidates/{candidate_id}/assign-hr`
*   **Request Headers**: `Authorization: Bearer <admin_access_token>`, `Content-Type: application/json`
*   **Path Parameter**: `candidate_id`.
*   **Request Body (JSON)** (AssignHrRequest schema):
    ```json
    {
        "hr_id": "selected_hr_user_id"
    }
    ```
*   **Success Response (200 OK)**: Updated `CandidateProfileOut` object for the candidate (now with `assigned_hr_id` and updated `mapping_status`).
*   **Error Responses**: `400 Bad Request` (e.g., candidate not pending, HR not mapped to this admin), `401 Unauthorized`, `404 Not Found` (candidate or HR not found).
*   **Frontend Action**: Display success, update candidate's status in UI.

This covers the primary frontend interactions with the `admin_service`.
