# HR Screen Wireframes (Descriptive)

This document describes key screens specific to the HR user role.

## 1. HR Dashboard

**Screen Name/Route**: HR Dashboard / `/hr/dashboard`

**User Role(s)**: HR

**Objective**: Provide an overview of HR's status, assigned candidates, pending requests, and quick actions.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Welcome Message**: "Welcome, [HR User Name]!"
*   **Profile & Mapping Status Card**:
    *   Title: "Your Status"
    *   Text: "Profile: [Complete/Pending Profile Details/Pending Resume Upload]"
    *   Text: "Admin Mapping: [Mapped to Admin X / Not Mapped / Application to Admin Y Pending]"
    *   Button: "View/Edit Profile" (links to `/hr/profile`).
    *   Button: "Manage Admin Connections" (links to `/hr/admin-connections` if not mapped or to view current mapping).
*   **Assigned Candidates Overview Card (if mapped)**:
    *   Title: "My Candidates"
    *   Statistic: "X Active Candidates"
    *   Quick List: Candidates needing immediate attention (e.g., "3 Interviews to Schedule", "2 Results to Review").
    *   Button: "View All Assigned Candidates".
*   **Pending Requests/Applications Card**:
    *   Title: "Admin Connection Requests"
    *   List of incoming mapping requests from Admins (Admin Name, Date). "View & Respond" link.
    *   Status of applications sent by this HR to Admins.
*   **Quick Actions Card**:
    *   Button: "Search New Candidates"
    *   Button: "Schedule an Interview" (might be disabled if no candidates are ready)

**Data Displayed**:
*   HR user's name.
*   Profile completion and admin mapping status.
*   Summary of assigned candidates and their statuses.
*   Pending admin mapping requests.

**User Interactions**:
*   Navigate to profile, admin connections, candidate lists, search, scheduling.
*   Respond to admin requests.

**API Connections**:
*   `GET hr_service/api/v1/hr/profile-details`
*   `GET hr_service/api/v1/hr/pending-admin-requests`
*   (Potentially) `GET admin_service/api/v1/admin/users?role=candidate&assigned_hr_id={hr_user_id}` for candidate summary.
*   (Potentially) `GET admin_service/api/v1/admin/hr-applications?requester_id={hr_user_id}` for status of own applications.

## 2. HR Profile Page

**Screen Name/Route**: HR Profile / `/hr/profile`

**User Role(s)**: HR

**Objective**: Allow HR user to view and update their professional details and resume.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "My HR Profile".
*   **Sections**:
    *   **Personal Information**: Name, Email (read-only).
    *   **Professional Details**:
        *   Form fields: Company (text input), Years of Experience (number input), Specialization/Domain (text input/tags).
        *   "Save Professional Details" button.
    *   **Resume**:
        *   Display current resume: File name, Upload date. "Download", "Replace Resume" buttons.
        *   File Input: "Upload New Resume".
    *   **Admin Mapping Status**:
        *   Text: "Currently Mapped to: [Admin Name]" or "Not Mapped to an Admin".
        *   Button: "Manage Admin Connections" or "Unmap from Admin" (if mapped).

**Data Displayed**: HR's profile information, resume details, mapping status.

**User Interactions**:
*   Edit professional details.
*   Upload/replace resume.
*   Navigate to manage admin connections or unmap.

**API Connections**:
*   `GET hr_service/api/v1/hr/profile-details`
*   `POST hr_service/api/v1/hr/profile-details` (for updates)
*   `POST hr_service/api/v1/hr/resume`

## 3. Manage Admin Connections Page

**Screen Name/Route**: Admin Connections / `/hr/admin-connections`

**User Role(s)**: HR

**Objective**: Allow HR to find Admins to apply to, view applications sent, and manage incoming requests from Admins.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "Manage Admin Connections".
*   **Tabs/Sections**:
    *   **Find Admins**:
        *   Search/Filter for Admins (e.g., by name - though admin list might be short).
        *   List of Admins: Name, Email. "Send Application" button next to each.
    *   **My Applications to Admins**:
        *   List of applications sent by this HR: Admin Name, Date Sent, Status (Pending, Accepted, Rejected).
    *   **Incoming Requests from Admins**:
        *   List of mapping requests received from Admins: Admin Name, Date Received. "Accept" / "Reject" buttons.
*   **Current Mapping Info (if mapped)**:
    *   Display: "Currently mapped to [Admin Name]".
    *   Button: "Unmap".

**Data Displayed**: List of admins, HR's applications, incoming requests, current mapping.

**User Interactions**:
*   Search/browse admins.
*   Send application to an admin.
*   Accept/reject incoming requests.
*   Unmap from current admin.

**API Connections**:
*   `GET hr_service/api/v1/hr/admins`
*   `POST hr_service/api/v1/hr/apply/{admin_id}`
*   `GET hr_service/api/v1/hr/pending-admin-requests`
*   `POST hr_service/api/v1/hr/accept-admin-request/{request_id}`
*   `POST hr_service/api/v1/hr/reject-admin-request/{request_id}`
*   `POST hr_service/api/v1/hr/unmap`
*   (Potentially) `GET admin_service/api/v1/admin/hr-applications?requester_id={hr_user_id}` for "My Applications".

## 4. Candidate Search Page

**Screen Name/Route**: Search Candidates / `/hr/search-candidates`

**User Role(s)**: HR (must be mapped to an Admin)

**Objective**: Allow HR to search for candidates based on various criteria.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "Search Candidates".
*   **Search Filters Section**:
    *   Keyword input (for general search in resume text, profile).
    *   Skills input (tags/multi-select).
    *   Years of Experience (Min/Max sliders or inputs).
    *   Education level (dropdown).
    *   Location (if applicable).
    *   Button: "Search".
    *   Button: "Clear Filters".
*   **Search Results Section**:
    *   Table or list of candidate cards.
    *   Each item: Candidate Name, Email, Key Skills (highlighted if matching search), YoE, Link to full profile, "Send Invitation/Message" button.
    *   Pagination for results.
    *   "No candidates found matching your criteria" message if applicable.

**Data Displayed**: Search filters, list of matching candidates with summary info.

**User Interactions**:
*   Enter/select search criteria.
*   Initiate search.
*   View candidate summaries.
*   Navigate to full candidate profile.
*   Initiate messaging/invitation.

**API Connections**:
*   `GET hr_service/api/v1/hr/search-candidates` (with query parameters)

## 5. Schedule Interview Page/Modal

**Screen Name/Route**: Schedule Interview / `/hr/schedule-interview` (or as a modal)

**User Role(s)**: HR (must be mapped, candidate must be assigned or selected)

**Objective**: Allow HR to configure and schedule an interview for a candidate.

**Key UI Elements**:
*   **Context**: Often initiated from a candidate's profile or an "assigned candidates" list.
*   **Form Title**: "Schedule Interview for [Candidate Name]".
*   **Form Fields**:
    *   **Candidate**: (Pre-filled if context-driven, otherwise searchable dropdown of assigned candidates).
    *   **Job Title**: Text input.
    *   **Job Description**: Text area.
    *   **Interview Type**: Dropdown (e.g., "AI Screening - Technical", "AI Screening - Behavioral", "HR Initial Chat").
    *   **Key Skills/Topics for AI Questions**: Tag input or text area (helps guide AI question generation).
    *   **Number of Questions**: (Optional) Number input, or default based on type.
    *   **Difficulty Level**: (Optional) Dropdown.
    *   **Specific Instructions for Candidate**: Text area.
*   **Button**: "Schedule Interview".

**Data Displayed**: Candidate name, form fields.

**User Interactions**:
*   Select candidate (if not pre-filled).
*   Fill in interview configuration details.
*   Submit to schedule.

**API Connections**:
*   `POST interview_service/api/v1/interview/schedule`

## 6. Interview Results Review Page (HR View)

**Screen Name/Route**: Review Interview / `/hr/interviews/{interview_id}/review`

**User Role(s)**: HR (for candidates they manage/scheduled for)

**Objective**: Allow HR to review AI-generated results, candidate answers, and add their own evaluation.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "Review Interview: [Job Title] - [Candidate Name]".
*   **Interview Summary**: Candidate Name, Job Title, Interview Date, Overall AI Score (if applicable).
*   **Question & Answer Section**:
    *   List of questions.
    *   For each question:
        *   Question text.
        *   Candidate's answer (text, code display, video/audio playback controls).
        *   AI-generated score/feedback for that answer (if applicable).
        *   (Optional) HR's notes/score input field for this specific question.
*   **HR Evaluation Section**:
    *   **Overall Feedback**: Text area for HR's qualitative assessment.
    *   **Overall Score/Rating**: HR's own rating (e.g., scale of 1-5, dropdown).
    *   **Recommendation**: Dropdown (e.g., "Proceed to Next Step", "Hold", "Reject", "Further Review Needed").
*   **Button**: "Submit HR Evaluation".
*   **Button**: (Optional) "Trigger Re-evaluation by AI" for specific answers if supported.

**Data Displayed**: All interview details, candidate answers, AI analysis, HR input fields.

**User Interactions**:
*   Review questions, answers, AI feedback.
*   Play video/audio responses.
*   Enter HR-specific scores, feedback, and recommendation.
*   Submit final HR evaluation.

**API Connections**:
*   `GET interview_service/api/v1/interview/results/{interview_id}` (to get full details for HR review).
*   `POST interview_service/api/v1/interview/{interview_id}/results` (or similar endpoint for HR to submit their evaluation).
*   (Optional) `POST interview_service/api/v1/interview/responses/{response_id}/evaluate` if HR can trigger individual AI re-evaluations.
