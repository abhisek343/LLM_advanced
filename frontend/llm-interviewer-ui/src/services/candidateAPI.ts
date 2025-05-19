import axiosInstance from './axiosConfig';
import { AxiosError } from 'axios';

// Base URL for the candidate service - should be in an env variable ideally
const CANDIDATE_SERVICE_BASE_URL = import.meta.env.VITE_CANDIDATE_SERVICE_URL || 'http://localhost:8002/api/v1/candidate';

// Mirroring CandidateProfileOut and other relevant schemas from candidate_service_integration.md
// Ideally, these would be shared types from a common library or generated
export interface CandidateProfile { // Added export
  id: string;
  username: string;
  email: string;
  role: 'candidate';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  full_name?: string;
  phone_number?: string;
  linkedin_profile?: string;
  resume_path?: string;
  resume_text?: string;
  extracted_skills_list?: string[];
  estimated_yoe?: number;
  profile_status?: string;
  mapping_status?: string;
  assigned_hr_id?: string | null;
  professional_summary?: string;
  education?: Array<{ degree?: string; institution?: string; year?: number; field_of_study?: string }>;
  experience?: Array<{ title?: string; company?: string; start_date?: string; end_date?: string; description?: string; years?: number }>;
  skills?: string[];
}

export const getCandidateProfile = async (): Promise<CandidateProfile> => {
  // console.log('Attempting to call simplified getCandidateProfile'); // Debug log removed
  if (!axiosInstance || typeof axiosInstance.get !== 'function') {
    // console.error('axiosInstance or axiosInstance.get is not a function!'); // Debug log removed
    throw new Error('axiosInstance.get is not available');
  }
  try {
    const response = await axiosInstance.get<CandidateProfile>(`${CANDIDATE_SERVICE_BASE_URL}/profile`);
    // console.log('Simplified getCandidateProfile response:', response); // Debug log removed
    return response.data;
  } catch (error) {
    // console.error('Error in simplified getCandidateProfile:', error); // Debug log removed
    // Re-throw a generic error or a more specific one if possible
    const axiosError = error as AxiosError; // Type assertion
    const errorMessage = axiosError.message || 'Unknown error in getCandidateProfile';
    throw new Error(`Failed to get candidate profile: ${errorMessage}`);
  }
};

export interface CandidateProfileUpdateData { // Added export
  full_name?: string;
  phone_number?: string;
  linkedin_profile?: string;
  professional_summary?: string;
  education?: Array<{ degree?: string; institution?: string; year?: number; field_of_study?: string }>;
  experience?: Array<{ title?: string; company?: string; start_date?: string; end_date?: string; description?: string; years?: number }>;
  skills?: string[];
}

export interface Message {
  id: string;
  sender_id: string; // This would be the ID of the HR or Admin user who sent the message
  sender_username?: string; // Added for display convenience
  recipient_id: string; // This would be the candidate's user ID
  subject: string;
  content: string;
  sent_at: string;
  read_status: boolean;
  read_at?: string | null;
}

interface MarkReadResponse {
  acknowledged: boolean;
  modified_count: number;
}

// Assuming MarkUnreadResponse will be similar to MarkReadResponse
export interface MarkUnreadResponse { // Added export
  acknowledged: boolean;
  modified_count: number;
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
  return error.message || 'An unknown error occurred in Candidate Service API';
};

export const updateCandidateProfile = async (profileData: CandidateProfileUpdateData): Promise<CandidateProfile> => {
  try {
    const response = await axiosInstance.put<CandidateProfile>(`${CANDIDATE_SERVICE_BASE_URL}/profile`, profileData);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const uploadCandidateResume = async (formData: FormData): Promise<CandidateProfile> => {
  try {
    // Content-Type: multipart/form-data is usually set automatically by axios when passing FormData
    const response = await axiosInstance.post<CandidateProfile>(`${CANDIDATE_SERVICE_BASE_URL}/resume`, formData);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const getCandidateMessages = async (params?: { skip?: number; limit?: number; unread?: boolean }): Promise<Message[]> => {
  try {
    const response = await axiosInstance.get<Message[]>(`${CANDIDATE_SERVICE_BASE_URL}/messages`, { params });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const markMessagesAsRead = async (messageIds: string[]): Promise<MarkReadResponse> => {
  try {
    const response = await axiosInstance.post<MarkReadResponse>(`${CANDIDATE_SERVICE_BASE_URL}/messages/mark-read`, {
      message_ids: messageIds,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const markMessagesAsUnread = async (messageIds: string[]): Promise<MarkUnreadResponse> => {
  try {
    const response = await axiosInstance.post<MarkUnreadResponse>(`${CANDIDATE_SERVICE_BASE_URL}/messages/mark-unread`, {
      message_ids: messageIds,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};
