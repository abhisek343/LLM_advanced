# HR Service System Design

## Overview
The HR Service is responsible for managing HR-specific operations within the LLM Interviewer platform. This includes managing their profile, applying to/accepting requests from Admins for mapping, searching for candidates, viewing assigned candidates, and sending messages to candidates.

## Key Responsibilities
- HR Profile Management (viewing and updating profile details, including resume upload)
- Admin Mapping Management (applying to Admins, accepting/rejecting Admin requests, unmapping)
- Candidate Search (searching for candidates based on criteria)
- Assigned Candidate Management (viewing candidates assigned by an Admin)
- Messaging (sending messages to candidates)

## Dependencies
- **MongoDB:** Stores HR user data, uploaded resume text, extracted skills, years of experience, HR mapping requests, and messages.
- **Auth Service:** Relies on the Auth Service for HR authentication and authorization.
- **Resume Parser Service:** Utilizes the Resume Parser service (likely an internal module or function) to extract text from uploaded HR resumes.
- **Resume Analyzer Service:** Utilizes the Resume Analyzer service (likely an internal module or function) to extract structured data like skills and experience from HR resume text.
- **Search Service:** Utilizes the Search Service (likely an internal module or function) to perform candidate searches.
- **Invitation Service:** Utilizes the Invitation Service (likely an internal module or function) to manage the HR-Admin mapping workflow.
- **Interview Service (implicitly):** While not a direct dependency in terms of API calls *from* the HR Service, HRs schedule interviews via the Interview Service's API.

## API Endpoints (Summary)
- `/hr/me/profile`: Get the current HR's profile.
- `/hr/profile-details`: Update the current HR's profile details.
- `/hr/resume`: Upload/update resume for the current HR.
- `/hr/admins`: List admins available for mapping application.
- `/hr/apply/{admin_id}`: Apply to an Admin for mapping.
- `/hr/pending-admin-requests`: Get pending admin requests for the current HR.
- `/hr/me/applications-sent`: Get applications sent by the current HR to Admins.
- `/hr/accept-admin-request/{request_id}`: Accept an admin mapping request.
- `/hr/reject-admin-request/{request_id}`: Reject an admin mapping request.
- `/hr/unmap`: Unmap from the current Admin manager.
- `/hr/me/assigned-candidates`: Get candidates assigned to the current HR.
- `/hr/search-candidates`: Search for candidates.
- `/hr/candidate-invitations/{candidate_id}`: Send an invitation message to a candidate.
- `/interview/schedule`: Schedule an interview for an assigned candidate (interacts with Interview Service data).
- `/interview/all`: Get all interviews (if mapped).
- `/interview/results/all`: Get all completed interview results (if mapped).
- `/interview/{interview_id}/results`: Submit interview results/feedback (if mapped).
- `/interview/responses/{response_id}/evaluate`: Trigger AI evaluation for a response (if mapped).

## Data Models (Relevant)
- User (specifically HR role, with fields like `hr_status`, `admin_manager_id`, `years_of_experience`, `resume_path`, `resume_text`, `extracted_skills_list`)
- HRMappingRequest (involved in the HR-Admin mapping workflow)
- Message (for sending messages to candidates)
- Interview (HRs interact with this collection for scheduling and viewing/submitting results)
- InterviewResponse (HRs interact with this collection for evaluating responses)

## Business Logic Highlights
- Ensures only authenticated HR users can access HR-specific endpoints.
- Manages the HR's status through the mapping/application lifecycle.
- Restricts certain actions (like scheduling interviews or searching candidates) to mapped HRs.
- Handles HR resume uploads and processing.
- Provides search functionality for candidates.
- Manages communication with candidates via messages.

## Potential Future Enhancements
- Allowing HRs to create custom interview questions.
- More detailed reporting on assigned candidates and interviews.
- Integration with calendar services for scheduling.