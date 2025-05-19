# Interview Service API Integration

This document details how frontend components and user flows interact with the `interview_service` backend API. Authentication requirements vary by endpoint (Candidate, HR, or Admin tokens).

**Base URL**: `http://localhost:8003/api/v1/interview` (configurable)

## 1. Get Default Questions

*   **Frontend View/Component**: Potentially for an admin/HR interface to review default questions, or for a candidate practice area.
*   **User Flow**: (Not explicitly in current flows, but a utility endpoint)
*   **API Endpoint**: `GET /default-questions`
*   **Request Headers**: None (public) or Admin/HR token if restricted.
*   **Success Response (200 OK)**: List of `QuestionOut` objects.
    ```json
    [
        {
            "id": "q_id_1",
            "text": "Describe a challenging project you worked on.",
            "category": "Behavioral",
            "difficulty": "Medium",
            "expected_duration_minutes": 5
        }
    ]
    ```
    (Returns `[]` if no default questions are configured).
*   **Frontend Action**: Display default questions.

## 2. Schedule Interview

*   **Frontend View/Component**: `ScheduleInterviewForm` (used by HR)
*   **User Flow**: HR User Flows - 6. Schedule Interview for a Candidate
*   **API Endpoint**: `POST /schedule`
*   **Request Headers**: `Authorization: Bearer <hr_or_admin_access_token>`, `Content-Type: application/json`
*   **Request Body (JSON)** (InterviewScheduleRequest schema):
    ```json
    {
        "candidate_id": "candidate_object_id_string",
        "job_title": "Software Engineer",
        "job_description": "Develop awesome features...",
        "role": "Backend Developer", // For tailoring questions
        "tech_stack": ["Python", "FastAPI"], // For tailoring questions
        "num_questions": 5, // Optional, defaults might apply
        "scheduled_by_id": "hr_or_admin_object_id_string"
    }
    ```
*   **Success Response (201 Created)**: `InterviewOut` object.
    ```json
    {
        "id": "interview_object_id_string",
        "candidate_id": "candidate_object_id_string",
        "job_title": "Software Engineer",
        "status": "scheduled", // or "pending_questions" initially
        "scheduled_at": "datetime_string",
        "questions": [ /* list of QuestionOut for the scheduled interview */ ],
        // ... other InterviewOut fields
    }
    ```
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `422 Unprocessable Entity`.
*   **Frontend Action**: Confirm scheduling, notify candidate (potentially via a message through another service or a direct notification if supported).

## 3. Get Interview Details (for taking/viewing)

*   **Frontend View/Component**: `InterviewInterface` (Candidate), Interview Review (HR/Admin)
*   **User Flow**: Candidate User Flows - 5. Take an Interview; HR/Admin flows for review.
*   **API Endpoint**: `GET /{interview_id}`
*   **Request Headers**: `Authorization: Bearer <candidate_hr_or_admin_access_token>`
*   **Path Parameter**: `interview_id`.
*   **Success Response (200 OK)**: `InterviewOut` object with full details including questions.
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.
*   **Frontend Action**: Populate the interview interface for the candidate, or the review screen for HR/Admin.

## 4. Submit Single Interview Response (Candidate)

*   **Frontend View/Component**: `InterviewInterface`
*   **User Flow**: Candidate User Flows - 5. Take an Interview
*   **API Endpoint**: `POST /submit-response`
*   **Request Headers**: `Authorization: Bearer <candidate_access_token>`, `Content-Type: application/json`
*   **Request Body (JSON)** (AnswerSubmit schema):
    ```json
    {
        "interview_id": "interview_object_id_string",
        "question_id": "question_object_id_string",
        "answer_text": "The candidate's textual answer.",
        "code_answer": "print('Hello')", // Optional
        "video_url": "s3_or_other_storage_url_for_video_answer" // Optional
    }
    ```
*   **Success Response (200 OK)**: `AnswerOut` object.
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found` (interview/question), `422 Unprocessable Entity`.
*   **Frontend Action**: Confirm answer submission, allow navigation to next question.

## 5. Submit All Interview Responses (Candidate)

*   **Frontend View/Component**: `InterviewInterface` (Final submit button)
*   **User Flow**: Candidate User Flows - 5. Take an Interview
*   **API Endpoint**: `POST /submit-all`
*   **Request Headers**: `Authorization: Bearer <candidate_access_token>`, `Content-Type: application/json`
*   **Request Body (JSON)** (BulkAnswerSubmit schema):
    ```json
    {
        "interview_id": "interview_object_id_string",
        "answers": [
            { "question_id": "q1_id", "answer_text": "...", "code_answer": "..." },
            { "question_id": "q2_id", "video_url": "..." }
        ]
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
        "message": "Interview responses submitted successfully.",
        "interview_id": "interview_object_id_string",
        "status": "completed" // Interview status updated
    }
    ```
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `422 Unprocessable Entity`.
*   **Frontend Action**: Display confirmation, redirect to dashboard or thank you page.

## 6. Get Interview Results

*   **Frontend View/Component**: `InterviewResultsPage` (Candidate), `InterviewReviewPanel` (HR/Admin)
*   **User Flow**: Candidate User Flows - 6. View Interview Results; HR User Flows - 7. View Interview Results
*   **API Endpoint**: `GET /results/{interview_id}`
*   **Request Headers**: `Authorization: Bearer <candidate_hr_or_admin_access_token>`
*   **Path Parameter**: `interview_id`.
*   **Success Response (200 OK)**: `InterviewResultOut` object.
    ```json
    {
        "interview_id": "interview_object_id_string",
        "candidate_id": "candidate_id_string",
        "overall_score": 85.5, // Example
        "overall_feedback": "Good performance, strong problem-solving skills.",
        "status": "evaluated", // or "pending_hr_review"
        "questions": [
            {
                "question_id": "q1_id",
                "question_text": "...",
                "candidate_answer_text": "...",
                "candidate_code_answer": "...",
                "ai_score": 90,
                "ai_feedback": "Clear and concise answer.",
                "hr_score": null, // To be filled by HR
                "hr_feedback": null // To be filled by HR
            }
        ],
        "hr_overall_feedback": null, // Filled by HR
        "hr_overall_score": null,    // Filled by HR
        "hr_recommendation": null    // Filled by HR
    }
    ```
    *(The exact structure might vary based on what's available and role permissions)*
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.
*   **Frontend Action**: Display results to the user.

## 7. Submit HR/Admin Evaluation for Interview

*   **Frontend View/Component**: `InterviewReviewPanel` (HR/Admin)
*   **User Flow**: HR User Flows - 7. View Interview Results and Provide Feedback; Admin User Flows (similar)
*   **API Endpoint**: `POST /{interview_id}/results` (or a more specific e.g. `/evaluate/hr`)
*   **Request Headers**: `Authorization: Bearer <hr_or_admin_access_token>`, `Content-Type: application/json`
*   **Path Parameter**: `interview_id`.
*   **Request Body (JSON)** (e.g., HREvaluationCreate schema):
    ```json
    {
        "hr_feedback": "Candidate demonstrated strong analytical skills.",
        "hr_score": 4, // e.g., on a 1-5 scale
        "hr_recommendation": "proceed_to_next_round" // e.g., proceed, hold, reject
    }
    ```
*   **Success Response (200 OK)**: Updated `InterviewResultOut` object.
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `422 Unprocessable Entity`.
*   **Frontend Action**: Confirm submission, update UI.

## 8. Get Candidate's Own Interviews/History

*   **Frontend View/Component**: `CandidateMyInterviewsPage`
*   **User Flow**: Candidate User Flows - 4. View Scheduled Interviews
*   **API Endpoints**:
    *   `GET /candidate/me` (for active/upcoming interviews for the logged-in candidate)
    *   `GET /candidate/history` (for completed interviews for the logged-in candidate)
*   **Request Headers**: `Authorization: Bearer <candidate_access_token>`
*   **Success Response (200 OK)**: List of `InterviewOut` or `InterviewSummaryOut` objects.
*   **Error Responses**: `401 Unauthorized`.
*   **Frontend Action**: Display lists of interviews.

## 9. Get All Interviews (Admin/HR View)

*   **Frontend View/Component**: Admin/HR Interview Overview Page
*   **User Flow**: Admin User Flows - 5. View System-Wide Interview Data
*   **API Endpoint**: `GET /all`
*   **Request Headers**: `Authorization: Bearer <admin_or_hr_access_token>`
*   **Query Parameters (Optional)**: For filtering by status, candidate_id, hr_id, date range, etc.
*   **Success Response (200 OK)**: List of `InterviewOut` or `InterviewSummaryOut` objects.
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`.
*   **Frontend Action**: Display comprehensive list of interviews with filtering.

## 10. Get All Interview Results (Admin/HR View)

*   **Frontend View/Component**: Admin/HR Interview Results Overview Page
*   **User Flow**: Admin User Flows - 5. View System-Wide Interview Data
*   **API Endpoint**: `GET /results/all`
*   **Request Headers**: `Authorization: Bearer <admin_or_hr_access_token>`
*   **Query Parameters (Optional)**: For filtering.
*   **Success Response (200 OK)**: List of `InterviewResultOut` objects.
*   **Error Responses**: `401 Unauthorized`, `403 Forbidden`.
*   **Frontend Action**: Display comprehensive list of interview results.

This covers the primary frontend interactions with the `interview_service`.
