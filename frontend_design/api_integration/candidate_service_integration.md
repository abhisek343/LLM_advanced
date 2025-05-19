# Candidate Service API Integration

This document details how frontend components and user flows interact with the `candidate_service` backend API. All endpoints require authentication (Candidate role token).

**Base URL**: `http://localhost:8002/api/v1/candidate` (configurable)

## 1. Get Candidate Profile

*   **Frontend View/Component**: `CandidateProfilePage`, `CandidateDashboardWidgets`
*   **User Flow**: Candidate User Flows - 1. Candidate Dashboard, 2. View/Update Candidate Profile
*   **API Endpoint**: `GET /profile`
*   **Request Headers**: `Authorization: Bearer <candidate_access_token>`
*   **Success Response (200 OK)**:
    ```json
    {
        "id": "mongodb_object_id_string",
        "username": "testcand1",
        "email": "testcand1@example.com",
        "role": "candidate",
        "is_active": true,
        "created_at": "2023-10-26T10:00:00Z",
        "updated_at": "2023-10-26T10:00:00Z",
        "full_name": "Test Candidate Name",
        "phone_number": "1234567890",
        "linkedin_profile": "https://linkedin.com/in/testcand1",
        "resume_path": "/path/to/uploads/resumes/uuid_filename.pdf",
        "resume_text": "Parsed resume text content...",
        "extracted_skills_list": ["Python", "FastAPI", "MongoDB"],
        "estimated_yoe": 3,
        "profile_status": "profile_complete", // e.g., pending_profile, profile_complete
        "mapping_status": "pending_assignment", // e.g., pending_assignment, assigned, invited
        "assigned_hr_id": null // or ObjectId string if assigned
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Invalid/missing token.
    *   `404 Not Found`: Candidate profile not found (should ideally not happen for an authenticated candidate).
*   **Frontend Action**: Populate profile forms, display profile information on dashboard/profile page.

## 2. Update Candidate Profile

*   **Frontend View/Component**: `CandidateProfileForm`
*   **User Flow**: Candidate User Flows - 2. View/Update Candidate Profile
*   **API Endpoint**: `PUT /profile`
*   **Request Headers**: `Authorization: Bearer <candidate_access_token>`, `Content-Type: application/json`
*   **Request Body (JSON)**:
    ```json
    {
        "full_name": "Updated Candidate Name",
        "phone_number": "9876543210",
        "linkedin_profile": "https://linkedin.com/in/updatedprofile",
        "professional_summary": "A new summary.",
        "education": [
            {"degree": "MSc Computing", "institution": "Imperial College", "year": 2022}
        ],
        "experience": [
            {"title": "Dev", "company": "Old Corp", "years": 1, "description": "Worked on X"}
        ],
        "skills": ["Python", "JavaScript", "React"]
        // Only include fields that are being updated or are part of the schema
    }
    ```
*   **Success Response (200 OK)**: Returns the updated `CandidateProfileOut` object (similar to GET /profile response).
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `422 Unprocessable Entity`: Validation errors in the request body.
*   **Frontend Action**: Display success message, update local profile state with the response.

## 3. Upload Candidate Resume

*   **Frontend View/Component**: `CandidateProfileForm` (Resume section)
*   **User Flow**: Candidate User Flows - 2. View/Update Candidate Profile
*   **API Endpoint**: `POST /resume`
*   **Request Headers**: `Authorization: Bearer <candidate_access_token>` (Content-Type will be `multipart/form-data`, handled by the form submission library like Axios/Fetch).
*   **Request Body (multipart/form-data)**:
    *   `resume`: (File) The resume file selected by the user.
*   **Success Response (200 OK)**: Returns the updated `CandidateProfileOut` object, which should now include `resume_path`, `resume_text`, `extracted_skills_list`, `estimated_yoe`.
    ```json
    {
        // ... other profile fields ...
        "resume_path": "/app/uploads/candidate_resumes/user_id_uuid.pdf",
        "resume_text": "Full parsed text of the resume...",
        "extracted_skills_list": ["Python", "FastAPI", "Problem Solving"],
        "estimated_yoe": 5,
        "profile_status": "profile_complete" // Potentially updated
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid file type, file too large (if size limits are implemented).
    *   `401 Unauthorized`.
    *   `422 Unprocessable Entity`: If no file is provided.
    *   `500 Internal Server Error`: If resume parsing/analysis fails critically on the backend.
*   **Frontend Action**: Display success message (e.g., "Resume uploaded and processed!"), update profile state, potentially show extracted skills or YoE. Handle errors by showing appropriate messages.

## 4. Get Candidate Messages

*   **Frontend View/Component**: `CandidateMessagesPage`, `CandidateDashboardWidgets`
*   **User Flow**: Candidate User Flows - 1. Candidate Dashboard, 3. View Messages
*   **API Endpoint**: `GET /messages`
*   **Request Headers**: `Authorization: Bearer <candidate_access_token>`
*   **Query Parameters (Optional)**:
    *   `skip` (int, e.g., 0): For pagination.
    *   `limit` (int, e.g., 10): For pagination.
    *   `unread` (bool, e.g., `true`): To fetch only unread messages.
*   **Success Response (200 OK)**:
    ```json
    [
        {
            "id": "message_object_id_string",
            "sender_id": "hr_user_id_string",
            "sender_username": "HR John Doe", // Added for display
            "recipient_id": "candidate_user_id_string",
            "subject": "Interview Invitation",
            "content": "We would like to invite you for an interview...",
            "sent_at": "datetime_string",
            "read_status": false,
            "read_at": null
        },
        // ... more messages
    ]
    ```
    (If no messages, returns an empty list `[]`)
*   **Error Responses**:
    *   `401 Unauthorized`.
*   **Frontend Action**: Display list of messages. Update unread message count on dashboard.

## 5. Mark Messages as Read

*   **Frontend View/Component**: `CandidateMessagesPage` (when a message is viewed or explicitly marked)
*   **User Flow**: Candidate User Flows - 3. View Messages
*   **API Endpoint**: `POST /messages/mark-read`
*   **Request Headers**: `Authorization: Bearer <candidate_access_token>`, `Content-Type: application/json`
*   **Request Body (JSON)**:
    ```json
    {
        "message_ids": ["message_id_1", "message_id_2"]
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
        "acknowledged": true,
        "modified_count": 2 // Number of messages updated
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `422 Unprocessable Entity`: If `message_ids` is missing or not a list.
*   **Frontend Action**: Update the read status of messages in the UI. Potentially refresh message list or unread count.

This covers the primary frontend interactions with the `candidate_service`.
