# Role-Specific & Feature Components

This document outlines key components that are more specific to user roles (Candidate, HR, Admin) or particular features of the LLM Interviewer Platform. These components will often compose the common reusable components.

## 1. Candidate Role Components

### 1.1. `CandidateDashboardWidgets`
*   **Description**: A collection of widgets or cards displayed on the candidate's dashboard.
*   **Composed of**: `Card`, `Button`, text elements.
*   **Content**:
    *   `ProfileCompletionWidget`: Shows profile progress, links to edit profile.
    *   `UpcomingInterviewsWidget`: Lists upcoming interviews, links to start.
    *   `RecentMessagesWidget`: Shows snippets of new messages.
*   **API Interaction**: Aggregates data from `candidate_service` (profile, messages) and `interview_service` (interviews).

### 1.2. `CandidateProfileForm`
*   **Description**: A comprehensive form for creating and updating the candidate's profile. Could be a single large component or broken into sub-components for each profile section (Personal, Experience, Education, Skills, Resume).
*   **Composed of**: `Input`, `Textarea`, `FileUpload`, `Button`, `Card` (for sections).
*   **Functionality**: Handles data input, validation, and submission for all profile fields. Manages resume upload.
*   **API Interaction**:
    *   `GET candidate_service/api/v1/candidate/profile` (to populate form).
    *   `PUT candidate_service/api/v1/candidate/profile` (to save profile data).
    *   `POST candidate_service/api/v1/candidate/resume` (to upload resume).

### 1.3. `InterviewListItem` (Candidate View)
*   **Description**: A component to display a single interview in a list (upcoming or completed).
*   **Composed of**: `Card` (or table row elements), `Button`.
*   **Content**: Job Title, Date/Time, Status, "Start Interview" or "View Results" button.
*   **API Interaction**: Data passed as props. Actions trigger navigation or API calls for starting/viewing results.

### 1.4. `InterviewInterface`
*   **Description**: The main component for the interview-taking experience.
*   **Composed of**: `QuestionDisplay`, `AnswerInput` (which could be `CodeEditor`, `RichTextEditor`, `VideoRecorder`), `Timer`, navigation `Button`s.
*   **Functionality**: Manages question flow, answer submission, timing.
*   **API Interaction**:
    *   `GET interview_service/api/v1/interview/{interview_id}` (to fetch questions).
    *   `POST interview_service/api/v1/interview/submit-response` or `submit-all`.

## 2. HR Role Components

### 2.1. `HRDashboardWidgets`
*   **Description**: Widgets for the HR dashboard.
*   **Composed of**: `Card`, `Button`, statistical displays.
*   **Content**: Profile/Mapping status, assigned candidate summary, pending admin requests.
*   **API Interaction**: Aggregates data from `hr_service` and `admin_service`.

### 2.2. `HRProfileForm`
*   **Description**: Form for HR user to update their professional details and resume.
*   **Composed of**: `Input`, `Textarea`, `FileUpload`, `Button`.
*   **API Interaction**:
    *   `GET hr_service/api/v1/hr/profile-details`.
    *   `POST hr_service/api/v1/hr/profile-details`.
    *   `POST hr_service/api/v1/hr/resume`.

### 2.3. `AdminConnectionManager`
*   **Description**: Component to manage HR's connection with Admins (find, apply, view requests, unmap).
*   **Composed of**: `Table`, `Button`, `Modal` (for confirmations).
*   **API Interaction**: Uses various endpoints from `hr_service` related to admin mapping.

### 2.4. `CandidateSearchForm`
*   **Description**: Form with filters for searching candidates.
*   **Composed of**: `Input`, `Select`, `Button`.
*   **Functionality**: Collects search criteria.
*   **API Interaction**: Triggers `GET hr_service/api/v1/hr/search-candidates`.

### 2.5. `CandidateSearchResultItem`
*   **Description**: Displays a single candidate in search results.
*   **Composed of**: `Card` or table row elements, `Button`.
*   **Content**: Candidate summary, "View Profile", "Send Invitation" buttons.

### 2.6. `ScheduleInterviewForm`
*   **Description**: Form/modal for HR to schedule an interview for a candidate.
*   **Composed of**: `Select` (for candidate), `Input`, `Textarea`, `Button`.
*   **API Interaction**: `POST interview_service/api/v1/interview/schedule`.

### 2.7. `InterviewReviewPanel` (HR View)
*   **Description**: Component for HR to review a candidate's completed interview.
*   **Composed of**: `QuestionDisplay`, candidate's answer display, AI feedback display, `Textarea` (for HR feedback), `Select` (for HR rating/recommendation), `Button`.
*   **API Interaction**:
    *   `GET interview_service/api/v1/interview/results/{interview_id}`.
    *   `POST interview_service/api/v1/interview/{interview_id}/results` (for HR evaluation).

## 3. Admin Role Components

### 3.1. `AdminDashboardWidgets`
*   **Description**: Widgets for the Admin dashboard.
*   **Composed of**: `Card`, statistical displays (charts potentially).
*   **Content**: System stats overview, pending HR applications, unassigned candidates.
*   **API Interaction**: `GET admin_service/api/v1/admin/stats`, etc.

### 3.2. `UserManagementTable`
*   **Description**: Table to display and manage all system users.
*   **Composed of**: `Table`, `Button` (for actions like edit/delete), `Modal` (for forms/confirmations), search/filter inputs.
*   **API Interaction**:
    *   `GET admin_service/api/v1/admin/users`.
    *   `DELETE admin_service/api/v1/admin/users/{user_id}`.
    *   (Potentially) `PUT admin_service/api/v1/admin/users/{user_id}` for role/status changes.

### 3.3. `HRApplicationList`
*   **Description**: Component to display and manage pending HR applications.
*   **Composed of**: `Table` or list of `Card`s, `Button`s ("Approve", "Reject").
*   **API Interaction**:
    *   `GET admin_service/api/v1/admin/hr-applications`.
    *   `POST admin_service/api/v1/admin/hr-applications/{application_id}/accept` or `/reject`.

### 3.4. `HRAssignmentModal`
*   **Description**: Modal used by Admin to assign an HR to a candidate.
*   **Composed of**: `Select` (to choose an HR), `Button`.
*   **API Interaction**:
    *   `GET admin_service/api/v1/admin/users?role=hr&admin_manager_id={admin_id}&hr_status=mapped` (to populate HR list).
    *   `POST admin_service/api/v1/admin/candidates/{candidate_id}/assign-hr`.

### 3.5. `SystemStatsDisplay`
*   **Description**: Component to show detailed system statistics, possibly with charts.
*   **Composed of**: `Card`s, charting library components.
*   **API Interaction**: `GET admin_service/api/v1/admin/stats` (potentially with more parameters for detailed views).

This list is not exhaustive but covers the major specialized components needed for each role, building upon the common component base.
