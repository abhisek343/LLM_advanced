# Candidate Screen Wireframes (Descriptive)

This document describes key screens specific to the Candidate user role.

## 1. Candidate Dashboard

**Screen Name/Route**: Candidate Dashboard / `/candidate/dashboard`

**User Role(s)**: Candidate

**Objective**: Provide an overview of the candidate's status, upcoming interviews, profile completeness, and recent messages.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout (Header, Sidebar/Nav, Footer).
*   **Welcome Message**: Prominent "Welcome, [Candidate Name]!"
*   **Profile Completion Card**:
    *   Title: "Your Profile"
    *   Progress bar or percentage indicating profile completeness.
    *   Text: e.g., "70% Complete. Upload your resume to improve your chances!"
    *   Button: "View/Edit Profile" (links to `/candidate/profile`).
*   **Upcoming Interviews Card**:
    *   Title: "Upcoming Interviews"
    *   List of interviews (if any):
        *   Each item: Job Title, Company (if applicable, though likely internal), Date & Time, "Start Interview" button (enabled when appropriate).
    *   If no interviews: Message "You have no upcoming interviews scheduled."
    *   Link: "View All Interviews" (links to `/candidate/interviews`).
*   **Recent Messages Card**:
    *   Title: "Recent Messages"
    *   List of 2-3 most recent unread messages (Sender, Subject, Snippet).
    *   If no unread messages: "No new messages."
    *   Link: "View All Messages" (links to `/candidate/messages`).

**Data Displayed**:
*   Candidate's name.
*   Profile completion status (calculated based on profile fields and resume upload).
*   List of scheduled interviews (job title, date/time).
*   Summary of recent/unread messages.

**User Interactions**:
*   Click "View/Edit Profile".
*   Click "Start Interview".
*   Click "View All Interviews".
*   Click "View All Messages" or individual message snippets.

**API Connections**:
*   `GET candidate_service/api/v1/candidate/profile`
*   `GET interview_service/api/v1/interview/candidate/me`
*   `GET candidate_service/api/v1/candidate/messages?limit=3&unread=true` (example)

## 2. Candidate Profile Page

**Screen Name/Route**: My Profile / `/candidate/profile`

**User Role(s)**: Candidate

**Objective**: Allow candidate to view, create, and update their detailed profile information.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "My Profile".
*   **Sections (each potentially editable via a modal or inline editing)**:
    *   **Personal Information**:
        *   Form fields: Full Name (text input), Email (text input, read-only), Phone Number (text input).
        *   "Save" button for this section.
    *   **Professional Summary**:
        *   Text area for summary/objective.
        *   "Save" button.
    *   **Work Experience**:
        *   List of experiences. Each item: Job Title, Company, Start Date, End Date, Description. "Edit"/"Delete" icons.
        *   Button: "Add New Experience" (opens a form/modal).
        *   Form for adding/editing experience: Text inputs for all fields.
    *   **Education**:
        *   List of education entries. Each item: Degree, Institution, Graduation Year, Field of Study. "Edit"/"Delete" icons.
        *   Button: "Add Education" (opens a form/modal).
    *   **Skills**:
        *   Tag input field or multi-select for skills. Display current skills as tags.
        *   "Save Skills" button.
    *   **Resume**:
        *   Display current resume: File name, Upload date. "Download" button.
        *   File Input: "Upload New Resume" / "Replace Resume". Accepts PDF, DOCX.
        *   Display area for resume parsing status/feedback (e.g., "Resume processed. Skills found: Python, FastAPI.").
*   **Overall "Save All Changes" button** (if edits are not saved per section).

**Data Displayed**: All fields from the candidate's profile.

**User Interactions**:
*   View existing profile data.
*   Click to edit sections or add new entries (experience, education).
*   Input/modify text in fields and text areas.
*   Select/upload resume file.
*   Save changes.

**API Connections**:
*   `GET candidate_service/api/v1/candidate/profile` (on page load)
*   `PUT candidate_service/api/v1/candidate/profile` (on save)
*   `POST candidate_service/api/v1/candidate/resume` (on resume upload)

## 3. Candidate Messages Page

**Screen Name/Route**: Messages / `/candidate/messages`

**User Role(s)**: Candidate

**Objective**: Allow candidate to view and manage messages from HR and the system.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "My Messages".
*   **Message List Pane**:
    *   List of message threads or individual messages.
    *   Each item: Sender (HR Name/System), Subject, Date, Unread indicator.
    *   Sort/filter options (e.g., All, Unread, Archived).
*   **Message View Pane**:
    *   Displays content of the selected message.
    *   Sender, Subject, Date, Full Message Body.
*   **Actions**:
    *   "Mark as Read/Unread" button.
    *   "Delete Message" button (optional).
    *   "Reply" button (if two-way communication is supported, currently seems one-way to candidate).

**Data Displayed**: List of messages, content of selected message.

**User Interactions**:
*   Select a message to view.
*   Mark messages.
*   Filter/sort messages.

**API Connections**:
*   `GET candidate_service/api/v1/candidate/messages`
*   `POST candidate_service/api/v1/candidate/messages/mark-read`

## 4. Candidate "My Interviews" Page

**Screen Name/Route**: My Interviews / `/candidate/interviews`

**User Role(s)**: Candidate

**Objective**: Allow candidate to view their scheduled, ongoing, and past interviews.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "My Interviews".
*   **Tabs/Filters**: "Upcoming", "Completed".
*   **Interview List (for selected tab)**:
    *   Table or card view.
    *   Each interview item:
        *   Job Title.
        *   Scheduled Date/Time (for upcoming).
        *   Completion Date (for completed).
        *   Status (e.g., "Scheduled", "Awaiting Results", "Results Available", "Expired").
        *   Action Button:
            *   Upcoming: "Start Interview" (if within start window), "View Details".
            *   Completed: "View Results" (if available).
*   **Interview Details Modal/Pane (when "View Details" is clicked)**:
    *   Job Description.
    *   Tech stack/skills involved.
    *   Assigned HR (if applicable/visible).

**Data Displayed**: List of interviews with their details and status.

**User Interactions**:
*   Switch between tabs/filters.
*   Click "Start Interview".
*   Click "View Details".
*   Click "View Results".

**API Connections**:
*   `GET interview_service/api/v1/interview/candidate/me` (for upcoming/active)
*   `GET interview_service/api/v1/interview/candidate/history` (for completed)
*   `GET interview_service/api/v1/interview/{interview_id}` (for details)
*   `GET interview_service/api/v1/interview/results/{interview_id}` (for results)

## 5. Interview Taking Interface

**Screen Name/Route**: Take Interview / `/interview/{interview_id}/take`

**User Role(s)**: Candidate

**Objective**: Provide the interface for the candidate to take the AI-driven interview.

**Key UI Elements**:
*   **Minimal Layout**: Focused, distraction-free. May hide main navigation.
*   **Header**: Interview Title (e.g., "Software Engineer Screening"). Progress (e.g., "Question 3 of 10"). Timer (if applicable).
*   **Question Display Area**:
    *   Clearly displays the current question text.
    *   May include code blocks (read-only), images, or other media.
*   **Answer Input Area**:
    *   **Textual/Conceptual Questions**: Rich text editor or plain textarea.
    *   **Coding Questions**:
        *   Code editor (e.g., Monaco, CodeMirror) with syntax highlighting for selected language.
        *   Language selection dropdown (if multiple languages allowed for the question).
        *   "Run Code" button (if execution environment is provided for practice/testing).
        *   Output/Console area for run results.
    *   **Video/Audio Response Questions**:
        *   Camera/Microphone access prompt.
        *   "Start Recording", "Stop Recording", "Preview" buttons.
        *   Video feed preview.
*   **Navigation Controls**:
    *   "Next Question" button.
    *   "Previous Question" button (if allowed by interview configuration).
    *   "Submit Answer & Next" or just "Next".
*   **Final Submission**:
    *   "Review Answers" button (if review is allowed before final submit).
    *   "Finish & Submit Interview" button (appears on last question or after review).
*   **Help/Instructions**: Icon or link to brief instructions or technical help.

**Data Displayed**:
*   Current question.
*   Interview progress, timer.
*   Candidate's draft answers.

**User Interactions**:
*   Read questions.
*   Type text/code answers.
*   Record video/audio.
*   Navigate between questions (if allowed).
*   Submit individual answers or the entire interview.

**API Connections**:
*   `GET interview_service/api/v1/interview/{interview_id}` (to load interview structure and questions).
*   `POST interview_service/api/v1/interview/submit-response` (to submit answer for a single question, if submitting incrementally).
*   `POST interview_service/api/v1/interview/submit-all` (to submit all answers at the end).

## 6. Interview Results Page (Candidate View)

**Screen Name/Route**: Interview Results / `/candidate/interviews/{interview_id}/results`

**User Role(s)**: Candidate

**Objective**: Allow candidate to view their performance and feedback for a completed interview.

**Key UI Elements**:
*   **Layout**: Uses Main Application Layout.
*   **Page Title**: "Interview Results: [Job Title]".
*   **Summary Section**:
    *   Overall Score (if applicable and released to candidate).
    *   Overall Feedback/Comments (if provided by HR/Admin and released).
    *   Interview Status (e.g., "Completed - Awaiting HR Review", "Reviewed - See Feedback Below", "Moved to Next Stage").
*   **Detailed Breakdown (Optional, depends on what's shared)**:
    *   Per-question scores or AI analysis snippets.
    *   Areas of strength/weakness.
    *   Comparison to ideal answers (if applicable for practice interviews).
*   **Link**: "Back to My Interviews".

**Data Displayed**: Scores, feedback, analysis as released by HR/Admin.

**User Interactions**: Read results.

**API Connections**:
*   `GET interview_service/api/v1/interview/results/{interview_id}` (endpoint needs to be tailored for candidate view, potentially filtering sensitive info).
