// src/services/interviewService.ts
import apiClient from './apiClient';
import type { InterviewScheduleData } from '../features/hr/components/ScheduleInterviewForm'; // Assuming type is here
import type { InterviewData, HREvaluationPayload } from '../features/hr/components/InterviewReviewPanel'; // Assuming types are here

// This should align with backend API prefix for interview-related endpoints
const INTERVIEW_SERVICE_API_PREFIX = '/interview'; 

export interface InterviewScheduleResponse {
    interviewId: string;
    message: string;
    // Add other relevant fields from actual backend response
}

export interface HrEvaluationSubmitResponse {
    message: string;
    // Add other relevant fields
}

const interviewService = {
  async scheduleInterview(data: InterviewScheduleData): Promise<InterviewScheduleResponse> {
    return apiClient.post<InterviewScheduleResponse, InterviewScheduleData>(`${INTERVIEW_SERVICE_API_PREFIX}/schedule`, data);
  },

  async getInterviewResults(interviewId: string): Promise<InterviewData> {
    return apiClient.get<InterviewData>(`${INTERVIEW_SERVICE_API_PREFIX}/results/${interviewId}`);
  },

  async submitHrEvaluation(interviewId: string, evaluation: HREvaluationPayload): Promise<HrEvaluationSubmitResponse> {
    return apiClient.post<HrEvaluationSubmitResponse, HREvaluationPayload>(`${INTERVIEW_SERVICE_API_PREFIX}/${interviewId}/hr-evaluation`, evaluation);
  },

  // Add other interview-related service methods here
  // For example, if there's an endpoint to get a list of interviews for HR to review:
  // async getInterviewsForReview(): Promise<SomeInterviewListItem[]> {
  //   return apiClient.get<SomeInterviewListItem[]>(`${INTERVIEW_SERVICE_API_PREFIX}/reviews`);
  // }
  // e.g., getCandidateInterviewList, getInterviewDetailsForCandidate, submitAnswer, etc.
};

export default interviewService;
