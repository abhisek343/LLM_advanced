# HR Service API Integration

This document details how frontend components and user flows interact with the `hr_service` backend API. All endpoints require authentication (HR role token).

**Base URL**: `http://localhost:8005/api/v1/hr` (configurable)

## 1. Get HR Profile Details

*   **Frontend View/Component**: `HRProfilePage`, `HRDashboardWidgets`
*   **User Flow**: HR User Flows - 1. HR Dashboard, 2. View/Update HR Profile
*   **API Endpoint**: `GET /profile-details`
*   **Request Headers**: `Authorization: Bearer <hr_access_token>`
*   **Success Response (200 OK)**:
    ```json
    {
        "id": "mongodb_object_id_string",
        "username": "testhr1",
        "email": "testhr1@example.com",
        "role": "hr",
        "is_active": true,
        "created_at": "datetime_string",
        "updated_at": "datetime_string",
        "company": "HR Corp",
        "years_of_experience": 5,
        "specialization": "Tech Recruiting",
        "resume_path": "/path/to/hr_resumes/uuid_filename.pdf",
        "hr_status": "mapped", // e.g., pending_profile, profile_complete, pending_mapping_approval, mapped
        "admin_manager_id": "admin_object_id_string" // if mapped
        // Other fields from HrProfileOut
    }
    ```
*   **Error Responses**: `401 Unauthorized`, `404 Not Found`.
*   **Frontend Action**: Populate HR profile forms, display status on dashboard.

## 2. Update HR Profile Details

*   **Frontend View/Component**: `HRProfileForm`
*   **User Flow**: HR User Flows - 2. View/Update HR Profile
*   **API Endpoint**: `POST /profile-details`
*   **Request Headers**: `Authorization: Bearer <hr_access_token>`, `Content-Type: application/json`
*   **Request Body (JSON)** (HrProfileUpdate schema):
    ```json
    {
        "company": "New HR Solutions",
        "years_of_experience": 6,
        "specialization": "IT and Engineering Recruitment"
        // Only fields that can be updated by HR
    }
    ```
*   **Success Response (200 OK)**: Returns the updated `HrProfileOut` object.
*   **Error Responses**: `401 Unauthorized`, `422 Unprocessable Entity`.
*   **Frontend Action**: Display success, update local state.

## 3. Upload HR Resume

*   **Frontend View/Component**: `HRProfileForm`
*   **User Flow**: HR User Flows - 2. View/Update HR Profile
*   **API Endpoint**: `POST /resume`
*   **Request Headers**: `Authorization: Bearer <hr_access_token>` (Content-Type: `multipart/form-data`)
*   **Request Body (multipart/form-data)**:
    *   `resume`: (File) The HR's resume file.
*   **Success Response (200 OK)**: Returns updated `HrProfileOut` (includes new resume path, potentially extracted info).
*   **Error Responses**: `400 Bad Request`, `401 Unauthorized`, `422 Unprocessable Entity`, `500 Internal Server Error`.
*   **Frontend Action**: Display success/error, update profile state.

## 4. List Admins for Application

*   **Frontend View/Component**: `AdminConnectionManager` (Find Admins tab)
*   **User Flow**: HR User Flows - 3.1. HR Applies to an Admin
*   **API Endpoint**: `GET /admins`
*   **Request Headers**: `Authorization: Bearer <hr_access_token>`
*   **Success Response (200 OK)**:
    ```json
    [
        {
            "id": "admin_id_1",
            "username": "admin_user_1",
            "email": "admin1@example.com"
        },
        // ... more admins
    ]
    ```
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden` (if HR profile not complete).
*   **Frontend Action**: Display list of admins for HR to apply to.

## 5. HR Apply to Admin

*   **Frontend View/Component**: `AdminConnectionManager` (Find Admins tab)
*   **User Flow**: HR User Flows - 3.1. HR Applies to an Admin
*   **API Endpoint**: `POST /apply/{admin_id}`
*   **Request Headers**: `Authorization: Bearer <hr_access_token>`
*   **Path Parameter**: `admin_id` (ID of the admin HR is applying to).
*   **Success Response (202 Accepted)**:
    ```json
    {
        "id": "request_object_id",
        "requester_id": "hr_user_id",
        "target_id": "admin_id",
        "request_type": "hr_to_admin_application",
        "status": "pending",
        "created_at": "datetime_string",
        "updated_at": "datetime_string"
    }
    ```
*   **Error Responses**: `400 Bad Request` (e.g., already applied, admin not found), `401 Unauthorized`, `403 Forbidden`.
*   **Frontend Action**: Display confirmation, update "My Applications to Admins" list.

## 6. Get Pending Admin Requests for HR

*   **Frontend View/Component**: `AdminConnectionManager` (Incoming Requests tab), `HRDashboardWidgets`
*   **User Flow**: HR User Flows - 3.2. HR Views and Responds to Admin Requests
*   **API Endpoint**: `GET /pending-admin-requests`
*   **Request Headers**: `Authorization: Bearer <hr_access_token>`
*   **Success Response (200 OK)**: List of `HRMappingRequestOut` objects (requests sent by Admins to this HR).
*   **Error Responses**: `401 Unauthorized`.
*   **Frontend Action**: Display list of pending requests from admins.

## 7. Accept Admin Request

*   **Frontend View/Component**: `AdminConnectionManager` (Incoming Requests tab)
*   **User Flow**: HR User Flows - 3.2. HR Views and Responds to Admin Requests
*   **API Endpoint**: `POST /accept-admin-request/{request_id}`
*   **Request Headers**: `Authorization: Bearer <hr_access_token>`
*   **Path Parameter**: `request_id`.
*   **Success Response (200 OK)**: Returns updated `HrProfileOut` (now mapped).
*   **Error Responses**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`.
*   **Frontend Action**: Update UI to reflect mapping, remove request from pending list.

## 8. Reject Admin Request

*   **Frontend View/Component**: `AdminConnectionManager` (Incoming Requests tab)
*   **User Flow**: HR User Flows - 3.2. HR Views and Responds to Admin Requests
*   **API Endpoint**: `POST /reject-admin-request/{request_id}`
*   **Request Headers**: `Authorization: Bearer <hr_access_token>`
*   **Path Parameter**: `request_id`.
*   **Success Response (200 OK)**: `{"message": "Request {request_id} rejected."}`
*   **Error Responses**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`.
*   **Frontend Action**: Remove request from pending list.

## 9. HR Unmap from Admin

*   **Frontend View/Component**: `HRProfilePage`, `AdminConnectionManager`
*   **User Flow**: HR User Flows - 3.3. HR Unmaps from Admin
*   **API Endpoint**: `POST /unmap`
*   **Request Headers**: `Authorization: Bearer <hr_access_token>`
*   **Success Response (200 OK)**: Returns updated `HrProfileOut` (now unmapped).
*   **Error Responses**: `400 Bad Request` (e.g., not currently mapped), `401 Unauthorized`.
*   **Frontend Action**: Update UI to show "Not Mapped".

## 10. Search Candidates

*   **Frontend View/Component**: `CandidateSearchForm`, `CandidateSearchPage`
*   **User Flow**: HR User Flows - 4. Search and View Candidates
*   **API Endpoint**: `GET /search-candidates`
*   **Request Headers**: `Authorization: Bearer <hr_access_token>`
*   **Query Parameters**: `keyword`, `required_skills`, `yoe_min`, `limit`, etc.
*   **Success Response (200 OK)**: List of `RankedCandidate` objects.
    ```json
    [
        {
            "id": "candidate_id_string",
            "username": "candidate1",
            "email": "candidate1@example.com",
            "full_name": "Candidate Full Name",
            "extracted_skills_list": ["Python", "Java"],
            "estimated_yoe": 4,
            "resume_path": "path/to/resume.pdf",
            // "rank_score": 0.85 // If ranking is implemented and returned
        }
    ]
    ```
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden` (if HR not mapped).
*   **Frontend Action**: Display search results.

## 11. Send Candidate Invitation Message

*   **Frontend View/Component**: `CandidateSearchResultItem`, Candidate Profile (HR View)
*   **User Flow**: HR User Flows - 5. Send Invitation/Message to Candidate
*   **API Endpoint**: `POST /candidate-invitations/{candidate_id}`
*   **Request Headers**: `Authorization: Bearer <hr_access_token>`, `Content-Type: application/json`
*   **Path Parameter**: `candidate_id`.
*   **Request Body (JSON)** (MessageContentCreate schema):
    ```json
    {
        "subject": "Invitation to Interview",
        "content": "Dear Candidate, we would like to invite you..."
    }
    ```
*   **Success Response (200 OK)**: `{"message": "Invitation message sent to Candidate {candidate_id}."}`
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found` (candidate not found), `400 Bad Request`.
*   **Frontend Action**: Display confirmation.

## 12. Get HR Messages & Mark Read

*   **Frontend View/Component**: `HRMessagesPage`
*   **User Flow**: HR User Flows - 8. View HR Messages
*   **API Endpoints**:
    *   `GET /messages` (similar to candidate, returns list of `MessageOut`)
    *   `POST /messages/mark-read` (similar to candidate, body: `{"message_ids": [...]}`)
*   **Frontend Action**: Similar to candidate message handling.

This covers the primary frontend interactions with the `hr_service`.
