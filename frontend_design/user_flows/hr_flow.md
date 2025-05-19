# HR User Flows

This document outlines the primary user flows for the HR (Human Resources) role on the LLM Interviewer Platform.

**Actor**: HR User (Authenticated User with "hr" role)

## 1. HR Dashboard / Home

**Goal**: HR user views their main dashboard after logging in.

**Preconditions**: HR user is logged in. Their profile is ideally complete and mapped to an Admin.

**Flow**:
1.  User logs in as an HR user (see `common_auth_flow.md`).
2.  User is redirected to the HR Dashboard (e.g., `/hr/dashboard`).
3.  **UI**: Displays:
    *   **Welcome Message**: "Welcome, [HR User Name]!"
    *   **Profile & Mapping Status**:
        *   Link to "Complete/Update Profile".
        *   Status: "Profile: [Complete/Pending]", "Mapped to Admin: [Admin Name/Pending]".
        *   If profile incomplete or not mapped, prompts to complete these steps.
    *   **Assigned Candidates Overview (if mapped)**:
        *   Count of currently assigned candidates.
        *   Quick view of candidates needing action (e.g., interviews to schedule, results to review).
        *   Link to "View All Assigned Candidates".
    *   **Pending Admin Requests/Applications**:
        *   Notifications for new mapping requests from Admins.
        *   Status of applications sent by HR to Admins.
        *   Link to "Manage Admin Connections".
    *   **Recent Activity/Notifications**:
        *   Summary of recent interview completions, new candidate assignments.
    *   **Quick Links**:
        *   "Search Candidates"
        *   "View My Profile"
        *   "Schedule Interview"
        *   "View Messages"
4.  **API Interactions**:
    *   `GET hr_service/api/v1/hr/profile-details` (to get profile and mapping status).
    *   `GET admin_service/api/v1/admin/users?role=candidate&assigned_hr_id={hr_user_id}` (or a dedicated HR endpoint to get their candidates).
    *   `GET hr_service/api/v1/hr/pending-admin-requests` (for requests from Admins).
    *   `GET admin_service/api/v1/admin/hr-applications?requester_id={hr_user_id}` (for applications HR sent).

## 2. View/Update HR Profile

**Goal**: HR user views and updates their professional information.

**Preconditions**: HR user is logged in.

**Flow**:
1.  User navigates to their Profile page (e.g., `/hr/profile`).
2.  **UI**: Displays:
    *   **Personal Information**: Name, Email (read-only).
    *   **Professional Details Section**:
        *   Company, Years of Experience, Specialization/Domain.
        *   "Edit" button.
    *   **Resume Section**:
        *   Current resume file name (if uploaded) with download/replace options.
        *   "Upload Resume" button.
    *   **Admin Mapping Status**:
        *   If mapped: "Currently mapped to [Admin Name]". Option to "Unmap".
        *   If not mapped: "Not mapped to an Admin." Link to "Connect with Admin".
    *   "Save Profile" button.
3.  **Viewing/Editing Profile**:
    *   **API Interaction (Fetch)**: `GET hr_service/api/v1/hr/profile-details`.
    *   **API Interaction (Update)**: `POST hr_service/api/v1/hr/profile-details` with updated data.
        *   **Request Body**: `{ "company": "...", "years_of_experience": ... }`
4.  **Uploading Resume**:
    *   **API Interaction**: `POST hr_service/api/v1/hr/resume` with `multipart/form-data`.

## 3. Manage Admin Connections (Mapping Workflow)

**Goal**: HR user applies to an Admin or accepts/rejects requests from Admins.

**Preconditions**: HR user is logged in. Profile should be complete to apply.

**Flow**:

### 3.1. HR Applies to an Admin
1.  HR navigates to a "Connect with Admin" or "Find Admins" page.
2.  **UI**: Lists available Admins (e.g., name, email). Search/filter options.
3.  **API Interaction (List Admins)**: `GET hr_service/api/v1/hr/admins`.
4.  HR selects an Admin and clicks "Send Application" or "Request Mapping".
5.  **API Interaction (Send Application)**: `POST hr_service/api/v1/hr/apply/{admin_id}`.
6.  Frontend shows confirmation or error.

### 3.2. HR Views and Responds to Admin Requests
1.  HR navigates to "Pending Admin Requests" (e.g., from dashboard or `/hr/admin-requests`).
2.  **UI**: Lists requests from Admins, showing Admin name and request date. "Accept" / "Reject" buttons.
3.  **API Interaction (List Requests)**: `GET hr_service/api/v1/hr/pending-admin-requests`.
4.  HR clicks "Accept" or "Reject" for a request.
    *   **API Interaction (Accept)**: `POST hr_service/api/v1/hr/accept-admin-request/{request_id}`.
        *   On success, UI updates status, HR is now mapped.
    *   **API Interaction (Reject)**: `POST hr_service/api/v1/hr/reject-admin-request/{request_id}`.
        *   On success, UI removes the request.

### 3.3. HR Unmaps from Admin
1.  HR navigates to their profile or a "Manage Connection" page.
2.  **UI**: Shows current mapped Admin, provides "Unmap" button.
3.  HR clicks "Unmap" (with confirmation).
4.  **API Interaction**: `POST hr_service/api/v1/hr/unmap`.
5.  UI updates to show "Not Mapped".

## 4. Search and View Candidates

**Goal**: HR user searches for candidates based on criteria.

**Preconditions**: HR user is logged in and mapped to an Admin.

**Flow**:
1.  User navigates to "Search Candidates" page (e.g., `/hr/search-candidates`).
2.  **UI**: Displays:
    *   Search filters: Keywords, Skills, Years of Experience (Min/Max), etc.
    *   "Search" button.
    *   Results area: Table or card list of candidates matching criteria.
        *   Candidate info: Name, Email, Key Skills, YoE, Resume link (if available), Current Status.
        *   Action buttons: "View Profile", "Send Invitation/Message".
3.  User enters search criteria and clicks "Search".
4.  **API Interaction**: `GET hr_service/api/v1/hr/search-candidates` with query parameters.
    *   Example: `?keyword=python&required_skills=fastapi,mongodb&yoe_min=3`
5.  Frontend displays search results.

## 5. Send Invitation/Message to Candidate

**Goal**: HR user sends an invitation or message to a candidate found via search.

**Preconditions**: HR user is logged in, mapped. Candidate is identified.

**Flow**:
1.  From the candidate search results or a candidate's profile view, HR clicks "Send Invitation" or "Message Candidate".
2.  **UI**: Opens a modal or navigates to a message composition page.
    *   Fields for Subject and Message Content.
    *   "Send" button.
3.  HR composes the message.
4.  **API Interaction**: `POST hr_service/api/v1/hr/candidate-invitations/{candidate_id}`.
    *   **Request Body**: `{ "subject": "...", "content": "..." }`
5.  Frontend displays success or error message.

## 6. Schedule Interview for a Candidate

**Goal**: HR user schedules an interview for an assigned candidate.

**Preconditions**: HR user is logged in, mapped. Candidate is assigned to this HR by an Admin.

**Flow**:
1.  HR navigates to their list of assigned candidates or a specific assigned candidate's profile.
2.  **UI**: For an assigned candidate, an option "Schedule Interview" is available.
3.  HR clicks "Schedule Interview".
4.  **UI**: Displays a form/modal to configure the interview:
    *   Job Title (pre-fill if available, or input)
    *   Job Description (text area)
    *   Interview Type (e.g., AI Screening, Technical, Behavioral - might influence question sets)
    *   Specific skills/topics to focus on (tags/text input for question generation).
    *   Number of questions (optional, might be default).
    *   Date/Time (if applicable for a specific slot, otherwise AI interviews might be on-demand for candidate).
    *   "Schedule" button.
5.  HR fills in the details.
6.  **API Interaction**: `POST interview_service/api/v1/interview/schedule`.
    *   **Request Body**: `{ "candidate_id": "...", "job_title": "...", "job_description": "...", "role": "...", "tech_stack": [...], "scheduled_by_id": "{hr_user_id}" }`
7.  Frontend displays success (e.g., "Interview scheduled for [Candidate Name]") or error.
8.  Candidate receives a notification/message about the scheduled interview.

## 7. View Interview Results and Provide Feedback

**Goal**: HR user views the results of a completed interview for an assigned candidate and provides their evaluation.

**Preconditions**: HR user is logged in, mapped. Candidate assigned to HR has completed an interview.

**Flow**:
1.  HR navigates to a list of completed interviews for their candidates (e.g., from candidate's profile or a general "Interview Results" page).
2.  HR selects an interview to review.
3.  **UI**: Displays:
    *   Candidate Details.
    *   Interview Details (Job, Date).
    *   AI-generated scores and analysis (if applicable).
    *   Candidate's answers (text, code, video/audio playback).
    *   Section for HR to add their own overall feedback, score, and recommendation (e.g., Proceed, Hold, Reject).
    *   "Submit Evaluation" button.
4.  **API Interaction (Fetch Results)**: `GET interview_service/api/v1/interview/results/{interview_id}`.
5.  HR reviews the information and adds their evaluation.
6.  **API Interaction (Submit HR Evaluation)**: `POST interview_service/api/v1/interview/{interview_id}/results` (or a dedicated HR evaluation endpoint).
    *   **Request Body**: `{ "hr_feedback": "...", "hr_score": ..., "hr_recommendation": "proceed" }`
7.  Frontend confirms submission. This might trigger notifications to Admin or update candidate status.

## 8. View HR Messages

**Goal**: HR views messages (similar to Candidate message flow).

**Preconditions**: HR user is logged in.

**Flow**:
1.  User navigates to Messages page (e.g., `/hr/messages`).
2.  **UI**: Similar to candidate messages - list, view, mark read.
3.  **API Interactions**:
    *   `GET hr_service/api/v1/hr/messages`.
    *   `POST hr_service/api/v1/hr/messages/mark-read`.
