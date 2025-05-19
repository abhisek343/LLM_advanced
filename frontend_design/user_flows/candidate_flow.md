# Candidate User Flows

This document outlines the primary user flows for the Candidate role on the LLM Interviewer Platform.

**Actor**: Candidate (Authenticated User with "candidate" role)

## 1. Candidate Dashboard / Home

**Goal**: Candidate views their main dashboard after logging in.

**Preconditions**: Candidate is logged in.

**Flow**:
1.  User logs in as a Candidate (see `common_auth_flow.md`).
2.  User is redirected to the Candidate Dashboard (e.g., `/candidate/dashboard`).
3.  **UI**: Displays:
    *   **Welcome Message**: "Welcome, [Candidate Name]!"
    *   **Profile Summary/Completion Status**:
        *   Link to "Complete/Update Profile".
        *   Indication of profile completeness (e.g., progress bar, status text like "Profile 70% complete").
        *   Highlights missing crucial information (e.g., "Upload your resume", "Add your experience").
    *   **Upcoming Interviews**:
        *   List of scheduled interviews with details (Job Title, Date/Time, Link to join/start).
        *   If no upcoming interviews, a message like "No upcoming interviews scheduled."
    *   **Recent Messages/Notifications**:
        *   Summary of new messages from HR/System.
        *   Link to "View All Messages".
    *   **Quick Links**:
        *   "View My Profile"
        *   "View Interview History"
        *   "Browse Available Practice Questions" (if applicable)
4.  **API Interactions**:
    *   `GET candidate_service/api/v1/candidate/profile` (to get profile details for summary and completion status).
    *   `GET interview_service/api/v1/interview/candidate/me` (to get list of scheduled/active interviews).
    *   `GET candidate_service/api/v1/candidate/messages?unread=true` (or similar, to get unread messages count/summary).

## 2. View/Update Candidate Profile

**Goal**: Candidate views and updates their personal and professional information.

**Preconditions**: Candidate is logged in.

**Flow**:
1.  User navigates to their Profile page (e.g., from Dashboard link or navigation menu `/candidate/profile`).
2.  **UI**: Displays:
    *   **Personal Information Section**:
        *   Fields for Full Name, Email (read-only), Phone Number.
        *   "Edit" button for this section.
    *   **Professional Summary/Objective Section**:
        *   Text area for a brief summary.
        *   "Edit" button.
    *   **Experience Section**:
        *   List of past job experiences (Title, Company, Dates, Description).
        *   "Add Experience" button, "Edit/Delete" buttons for existing entries.
    *   **Education Section**:
        *   List of educational qualifications.
        *   "Add Education" button, "Edit/Delete" buttons.
    *   **Skills Section**:
        *   List of skills (e.g., tags, text input).
        *   "Add/Edit Skills" button.
    *   **Resume Section**:
        *   Current resume file name (if uploaded) with a download link.
        *   "Upload New Resume" button / "Replace Resume" button.
        *   Displays resume parsing status/results if applicable (e.g., "Resume parsed successfully", "Extracted Skills: ...").
    *   "Save Profile" button (becomes active when changes are made).
3.  **Viewing Profile**:
    *   **API Interaction**: `GET candidate_service/api/v1/candidate/profile` to fetch and display current profile data.
4.  **Editing Profile**:
    *   User clicks "Edit" on a section or "Add" for new entries.
    *   UI enables input fields or shows a modal form.
    *   User makes changes.
5.  **Saving Profile**:
    *   User clicks "Save Profile".
    *   **API Interaction**: `PUT candidate_service/api/v1/candidate/profile` with the updated profile data.
    *   **Request Body**: JSON object with fields to be updated (e.g., `{ "full_name": "...", "phone_number": "..." }`).
    *   Frontend displays success message or errors.
6.  **Uploading Resume**:
    *   User clicks "Upload New Resume".
    *   UI presents a file input.
    *   User selects a resume file (PDF, DOCX).
    *   **API Interaction**: `POST candidate_service/api/v1/candidate/resume` with the file as `multipart/form-data`.
    *   Frontend displays upload progress, success message (including any parsing status from the backend), or errors.
    *   Profile page might refresh to show the new resume info.

## 3. View Messages

**Goal**: Candidate views messages received from HR or the system.

**Preconditions**: Candidate is logged in.

**Flow**:
1.  User navigates to the Messages page (e.g., from Dashboard or navigation menu `/candidate/messages`).
2.  **UI**: Displays:
    *   List of messages, typically sorted by date (newest first).
    *   Each message item shows: Sender (e.g., "HR - [HR Name]", "System"), Subject, Snippet of content, Date, Read/Unread status.
    *   Clicking a message opens it for full view.
    *   Option to filter by All/Unread.
    *   Option to mark messages as read/unread.
3.  **Fetching Messages**:
    *   **API Interaction**: `GET candidate_service/api/v1/candidate/messages` to fetch all messages.
    *   May include query parameters for pagination or filtering (e.g., `?page=1&limit=10`).
4.  **Viewing a Single Message**:
    *   UI displays the full content of the selected message.
    *   If the message was unread, it might be automatically marked as read.
    *   **API Interaction (Mark as Read)**: `POST candidate_service/api/v1/candidate/messages/mark-read` with the message ID(s).
    *   **Request Body**: `{ "message_ids": ["id1", "id2"] }`

## 4. View Scheduled Interviews

**Goal**: Candidate views their list of scheduled, ongoing, or past interviews.

**Preconditions**: Candidate is logged in.

**Flow**:
1.  User navigates to the "My Interviews" page (e.g., `/candidate/interviews`).
2.  **UI**: Displays:
    *   Tabs or filters for "Upcoming", "In Progress" (if applicable), "Completed".
    *   **Upcoming/In Progress**:
        *   List of interviews: Job Title, Scheduled Date/Time, Interview Type (e.g., "AI Screening", "Technical Round").
        *   "Start Interview" button (becomes active when it's time).
        *   Link to "View Details" (e.g., job description, assigned HR if visible).
    *   **Completed**:
        *   List of past interviews: Job Title, Completion Date.
        *   Link to "View Results/Feedback" (if available and released).
3.  **API Interactions**:
    *   `GET interview_service/api/v1/interview/candidate/me` (for upcoming/active interviews).
    *   `GET interview_service/api/v1/interview/candidate/history` (for completed interviews).
    *   `GET interview_service/api/v1/interview/results/{interview_id}` (when viewing results of a specific completed interview).

## 5. Take an Interview

**Goal**: Candidate participates in an AI-driven or scheduled interview.

**Preconditions**: Candidate is logged in. An interview is scheduled and it's time to start.

**Flow**:
1.  User clicks "Start Interview" from the dashboard or "My Interviews" page.
2.  User is taken to the Interview Interface page (e.g., `/interview/{interview_id}/take`).
3.  **UI - Interview Interface**:
    *   **Instructions/Welcome**: Brief overview of the interview process.
    *   **Question Display Area**: Shows the current question (text, possibly with code snippets or images).
    *   **Answer Input Area**:
        *   Text editor for coding questions (with basic syntax highlighting).
        *   Rich text editor or plain text area for verbal/text-based answers.
        *   Video/Audio recording controls if it's a spoken interview.
    *   **Navigation**: "Next Question", "Previous Question" (if allowed), "Submit Answer".
    *   **Timer**: If the interview or questions are timed.
    *   **Progress Indicator**: Shows current question number out of total.
    *   "Finish & Submit Interview" button.
4.  **Starting the Interview / Fetching Questions**:
    *   **API Interaction**: `GET interview_service/api/v1/interview/{interview_id}` to get interview details and questions.
    *   The questions might be loaded all at once or one by one.
5.  **Answering Questions**:
    *   Candidate types their answer or records their response.
    *   Candidate clicks "Next Question" or "Submit Answer" for the current question.
    *   **API Interaction (per question, if applicable)**: `POST interview_service/api/v1/interview/submit-response`
        *   **Request Body**: `{ "interview_id": "...", "question_id": "...", "answer_text": "...", "code_answer": "...", "video_url": "..." }`
6.  **Finishing the Interview**:
    *   Candidate clicks "Finish & Submit Interview".
    *   **API Interaction (if submitting all at once or for finalization)**: `POST interview_service/api/v1/interview/submit-all` (or a specific finalization endpoint).
        *   **Request Body**: Array of all answers if not submitted individually.
    *   Frontend displays a confirmation message (e.g., "Interview submitted successfully!").
    *   User might be redirected to their dashboard or a "Thank You" page.

## 6. View Interview Results/Feedback

**Goal**: Candidate views the results or feedback for a completed interview.

**Preconditions**: Candidate is logged in. Interview is completed and results are released.

**Flow**:
1.  User navigates to the "Completed Interviews" section and clicks "View Results" for a specific interview.
2.  User is taken to the Interview Results page (e.g., `/candidate/interviews/{interview_id}/results`).
3.  **UI**: Displays:
    *   Interview Details (Job Title, Date).
    *   Overall Score/Assessment (if provided).
    *   Breakdown by question or category (if applicable).
    *   Specific feedback points or AI-generated analysis.
    *   Status (e.g., "Pending Review by HR", "Moved to Next Round", "Not Selected").
4.  **API Interaction**:
    *   `GET interview_service/api/v1/interview/results/{interview_id}` (This endpoint needs to be designed to return candidate-appropriate results).
