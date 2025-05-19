# Candidate Service System Design

## Overview
The Candidate Service is responsible for managing candidate-specific operations within the LLM Interviewer platform. This includes resume uploads, profile management, and accessing interview-related information and messaging.

## Key Responsibilities
- Candidate Profile Management (viewing and updating profile details)
- Resume Upload and Processing (saving, parsing, and analyzing candidate resumes)
- Accessing Interview Information (viewing scheduled interviews and history)
- Messaging (viewing messages from HRs/Admins and marking them as read/unread)

## Dependencies
- **MongoDB:** Stores candidate user data, uploaded resume text, extracted skills, years of experience, and messages.
- **Auth Service:** Relies on the Auth Service for candidate authentication and authorization.
- **Resume Parser Service:** Utilizes the Resume Parser service (likely an internal module or function) to extract text from uploaded files.
- **Resume Analyzer Service:** Utilizes the Resume Analyzer service (likely an internal module or function) to extract structured data like skills and experience from resume text.
- **Interview Service (implicitly):** While not a direct dependency in terms of API calls *from* the Candidate Service, it interacts with the same MongoDB collections (`interviews`, `responses`) and relies on interviews being scheduled by HR/Admins via the Interview Service.

## API Endpoints (Summary)
- `/candidate/profile`: Get the current candidate's profile.
- `/candidate/profile`: Update the current candidate's profile.
- `/candidate/resume`: Upload a resume for the current candidate.
- `/candidate/me`: Get interviews scheduled for the current candidate.
- `/candidate/history`: Get completed interview history for the current candidate.
- `/candidate/messages`: Get messages for the current candidate.
- `/candidate/messages/mark-read`: Mark messages as read.
- `/candidate/messages/mark-unread`: Mark messages as unread.
- `/interview/submit-response`: Submit a single interview response (interacts with Interview Service data).
- `/interview/submit-all`: Submit all interview responses (interacts with Interview Service data).

## Data Models (Relevant)
- User (specifically candidate role, with fields like `mapping_status`, `assigned_hr_id`, `resume_path`, `resume_text`, `extracted_skills_list`, `estimated_yoe`)
- Message (for communication with HR/Admins)
- Interview (read-only access to relevant fields for the candidate)
- InterviewResponse (candidate writes to this collection)

## Business Logic Highlights
- Ensures only authenticated candidate users can access candidate-specific endpoints.
- Handles file uploads securely and processes resumes.
- Updates candidate status based on resume upload and assignment by Admin.
- Provides access to interview details and history relevant to the candidate.
- Manages message read/unread status for the candidate.

## Potential Future Enhancements
- Allowing candidates to view their interview results and feedback.
- Providing notifications for new messages or interview assignments.
- More detailed profile fields for candidates.