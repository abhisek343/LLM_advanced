import axiosInstance from './axiosConfig';
import { AxiosError } from 'axios';

const INTERVIEW_SERVICE_BASE_URL = import.meta.env.VITE_INTERVIEW_SERVICE_URL || 'http://localhost:8003/api/v1/interview';

// Types based on interview_service_integration.md
// These should ideally be shared or generated types
export interface Question {
  id: string;
  text: string;
  category: string;
  difficulty: string;
  question_type: 'text' | 'code' | 'video'; // Added to determine input type
  expected_duration_minutes: number;
  language?: string; // Added for code question language specificity
  // Add other fields if present in QuestionOut schema
}

export interface Interview {
  id: string;
  candidate_id: string;
  job_title: string;
  status: string; // e.g., "scheduled", "pending_questions", "completed", "evaluated"
  scheduled_at: string; // ISO date string
  questions: Question[];
  job_description?: string; // Added as per wireframe for details view
  tech_stack?: string[]; // Added as per wireframe for details view
  // Add other fields from InterviewOut schema
  completed_at?: string | null;
  overall_score?: number | null;
}

export interface InterviewSummary { // For lists where full detail isn't needed
  id: string;
  job_title: string;
  status: string;
  scheduled_at: string;
  completed_at?: string | null;
}

export interface AnswerSubmitPayload {
  interview_id: string;
  question_id: string;
  answer_text?: string;
  code_answer?: string;
  video_url?: string;
}

export interface Answer { // Based on AnswerOut
  id: string;
  interview_id: string;
  question_id: string;
  candidate_id: string;
  answer_text?: string | null;
  code_answer?: string | null;
  video_url?: string | null;
  submitted_at: string;
  // Add AI evaluation fields if they are part of AnswerOut
  ai_score?: number | null;
  ai_feedback?: string | null;
}

export interface BulkAnswerSubmitPayload {
  interview_id: string;
  answers: Array<Omit<AnswerSubmitPayload, 'interview_id'>>;
}

export interface InterviewResult { // Based on InterviewResultOut
  interview_id: string;
  candidate_id: string;
  job_title?: string; // Added job_title
  overall_score?: number | null;
  overall_feedback?: string | null;
  status: string;
  interview_date?: string; // Added to store scheduled_at or completed_at
  questions: Array<{
    question_id: string;
    question_text: string;
    candidate_answer_text?: string | null;
    candidate_code_answer?: string | null;
    candidate_video_url?: string | null; // Added for video playback
    ai_score?: number | null;
    ai_feedback?: string | null;
    hr_score?: number | null;
    hr_feedback?: string | null;
  }>;
  hr_overall_feedback?: string | null;
  hr_overall_score?: number | null;
  hr_recommendation?: string | null;
  hr_per_question_evaluations?: Array<{ // Added to display previously saved per-question HR feedback
    question_id: string;
    hr_notes?: string | null;
    hr_question_score?: number | null;
  }> | null;
  // Add other fields
}


interface ApiErrorDetail {
  detail?: string | { msg: string; type: string; loc: (string | number)[] }[];
}

const getErrorMessage = (error: AxiosError<ApiErrorDetail>): string => {
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map(d => d.msg).join(', ');
  }
  return error.message || 'An unknown error occurred in Interview Service API';
};

// For Candidate: Get their own upcoming/active interviews
export const getMyScheduledInterviews = async (): Promise<InterviewSummary[]> => {
  try {
    const response = await axiosInstance.get<InterviewSummary[]>(`${INTERVIEW_SERVICE_BASE_URL}/candidate/me`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

// For Candidate: Get their interview history
export const getMyInterviewHistory = async (): Promise<InterviewSummary[]> => {
  try {
    const response = await axiosInstance.get<InterviewSummary[]>(`${INTERVIEW_SERVICE_BASE_URL}/candidate/history`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

// Get full details of a specific interview (e.g., for taking it)
export const getInterviewDetails = async (interviewId: string): Promise<Interview> => {
  try {
    const response = await axiosInstance.get<Interview>(`${INTERVIEW_SERVICE_BASE_URL}/${interviewId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

// Submit a single response
export const submitInterviewResponse = async (payload: AnswerSubmitPayload): Promise<Answer> => {
  try {
    const response = await axiosInstance.post<Answer>(`${INTERVIEW_SERVICE_BASE_URL}/submit-response`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

// Submit all responses for an interview
export const submitAllInterviewResponses = async (payload: BulkAnswerSubmitPayload): Promise<{ message: string; interview_id: string; status: string }> => {
  try {
    const response = await axiosInstance.post<{ message: string; interview_id: string; status: string }>(`${INTERVIEW_SERVICE_BASE_URL}/submit-all`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

// Get results for a specific interview (candidate view)
export const getInterviewResults = async (interviewId: string): Promise<InterviewResult> => {
  try {
    const response = await axiosInstance.get<InterviewResult>(`${INTERVIEW_SERVICE_BASE_URL}/results/${interviewId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

// --- HR/Admin specific functions ---

export interface InterviewScheduleRequest {
  candidate_id: string;
  job_title: string;
  job_description: string; // Made required as per design doc
  role?: string; // For tailoring questions
  tech_stack?: string[]; // For tailoring questions
  num_questions?: number;
  scheduled_by_id: string; // HR or Admin ID
  interview_type?: string; // Added from wireframe
  difficulty_level?: string; // Added from wireframe
  specific_instructions?: string; // Added from wireframe
  // Add other fields from InterviewScheduleRequest schema if any
}

export const scheduleInterview = async (scheduleData: InterviewScheduleRequest): Promise<Interview> => {
  try {
    const response = await axiosInstance.post<Interview>(`${INTERVIEW_SERVICE_BASE_URL}/schedule`, scheduleData);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export interface PerQuestionHREvaluation {
  question_id: string;
  hr_notes?: string;
  hr_question_score?: number; // e.g., 1-5
}

export interface HREvaluationPayload {
  hr_feedback: string; // Overall feedback
  hr_score?: number; // Overall score
  hr_recommendation: string; 
  per_question_evaluations?: PerQuestionHREvaluation[]; // Added for per-question feedback
}

// Get results for a specific interview (HR/Admin view - might be same as candidate or more detailed)
// Reusing getInterviewResults for now, assuming backend handles role-based data filtering.
// If HR needs more data than candidate, a separate endpoint/function might be better.
// export const getInterviewResultsForHR = async (interviewId: string): Promise<InterviewResult> => { ... }


// Submit HR evaluation for an interview
export const submitHrEvaluation = async (interviewId: string, evaluationData: HREvaluationPayload): Promise<InterviewResult> => {
  try { // Added missing try keyword
    // The endpoint in design doc is POST /{interview_id}/results.
    // This might conflict if GET /{interview_id}/results is for fetching.
    // Assuming a more specific endpoint like /evaluate/hr or that the backend handles POST to /results for evaluation.
    const response = await axiosInstance.post<InterviewResult>(`${INTERVIEW_SERVICE_BASE_URL}/${interviewId}/results/hr-evaluation`, evaluationData); // Example specific endpoint
    // Or if using the same /results endpoint:
    // const response = await axiosInstance.post<InterviewResult>(`${INTERVIEW_SERVICE_BASE_URL}/results/${interviewId}`, evaluationData);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};


// Define a common type for filter parameters
export interface InterviewListParams {
  status?: string;
  candidate_id?: string;
  hr_id?: string; // Assuming scheduled_by_id can be used to filter by HR
  admin_id?: string; // Assuming scheduled_by_id can be used to filter by Admin
  date_from?: string; // ISO date string
  date_to?: string; // ISO date string
  skip?: number;
  limit?: number;
}

// Functions for Admin/HR to get lists of all interviews / results
export const getAllInterviews = async (params?: InterviewListParams): Promise<InterviewSummary[]> => {
  try {
    const response = await axiosInstance.get<InterviewSummary[]>(`${INTERVIEW_SERVICE_BASE_URL}/all`, { params });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const getAllInterviewResults = async (params?: InterviewListParams): Promise<InterviewResult[]> => {
  try {
    const response = await axiosInstance.get<InterviewResult[]>(`${INTERVIEW_SERVICE_BASE_URL}/results/all`, { params });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const getDefaultQuestions = async (): Promise<Question[]> => {
  try {
    const response = await axiosInstance.get<Question[]>(`${INTERVIEW_SERVICE_BASE_URL}/default-questions`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};
// Add other HR/Admin specific interview functions as needed
