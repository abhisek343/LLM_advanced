# Interview Service System Design

## Overview
The Interview Service is the core component responsible for the interview process within the LLM Interviewer platform. It handles scheduling interviews, generating questions (potentially with LLM assistance), managing candidate responses, and processing interview results and feedback.

## Key Responsibilities
- Interview Scheduling (creating new interview sessions for assigned candidates)
- Question Management (providing default questions, generating new questions based on job/resume context)
- Response Submission (receiving and storing candidate answers)
- Interview Completion (marking interviews as completed once all responses are submitted)
- Results and Feedback Management (storing overall and per-response scores and feedback)
- AI Evaluation Integration (triggering AI evaluation of candidate responses)
- Interview Data Retrieval (providing details, responses, and results for interviews)

## Dependencies
- **MongoDB:** Stores interview data, questions, and candidate responses.
- **Auth Service:** Relies on the Auth Service for user authentication and authorization (checking if the user is a candidate, HR, or admin).
- **Gemini Service:** Integrates with the Gemini Service (likely an external or internal LLM wrapper) for generating interview questions and evaluating candidate responses.
- **Candidate Service (implicitly):** Relies on candidates being in the 'assigned' status, which is managed by the Admin Service and reflected in the User data accessed by the Interview Service.
- **HR Service (implicitly):** HR users interact with this service's API to schedule interviews and submit results.

## API Endpoints (Summary)
- `/interview/default-questions`: Get a list of default interview questions.
- `/interview/schedule`: Schedule a new interview (HR/Admin only).
- `/interview/all`: Get a list of all interviews (HR/Admin only).
- `/interview/results/all`: Get a list of all completed interviews (HR/Admin only).
- `/interview/submit-response`: Submit a single response for an interview (Candidate only).
- `/interview/submit-all`: Submit all responses for an interview (Candidate only).
- `/interview/candidate/me`: Get interviews scheduled for the current candidate.
- `/interview/candidate/history`: Get completed interview history for the current candidate.
- `/interview/results/{interview_id}`: Get the result (overall score/feedback) for a completed interview.
- `/interview/{interview_id}/results`: Submit overall and per-response results/feedback (HR/Admin only).
- `/interview/responses/{response_id}/evaluate`: Trigger AI evaluation for a specific response (HR/Admin only).
- `/interview/{interview_id}`: Get details of a specific interview.
- `/interview/{interview_id}/responses`: Get all responses for a specific interview.

## Data Models (Relevant)
- Interview (stores interview details, including embedded questions, status, timestamps, overall results)
- Question (schema for question structure)
- InterviewResponse (stores candidate answers, scores, feedback, evaluation details)
- User (accessed to verify roles and candidate assignments)

## Business Logic Highlights
- Enforces role-based access control for different endpoints (Candidate vs. HR/Admin).
- Validates candidate status before allowing interview scheduling.
- Integrates with the Gemini service for question generation and response evaluation.
- Manages the state transitions of an interview (scheduled -> completed -> evaluated).
- Stores and retrieves candidate responses and evaluation results.
- Provides different views of interview data based on user role.

## Potential Future Enhancements
- Real-time interview session management (e.g., tracking progress).
- Support for different interview formats (e.g., coding challenges, video responses).
- More sophisticated AI evaluation metrics and feedback.
- Integration with calendar services for scheduling.