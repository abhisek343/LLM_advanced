import axiosInstance from './axiosConfig';
import { AxiosError } from 'axios';
// Removed: import { useAuth } from '../contexts/AuthContext';
// adminGetHrApplications and HRApplicationToAdmin are no longer used here
// CandidateProfileOut is defined in hr_service/app/schemas/user.py,
// We'll use a similar structure for the frontend type if direct import isn't feasible.
// For now, we'll map fields from the backend's CandidateProfileOut to CandidateSummary/CandidateForHRView.

const HR_SERVICE_BASE_URL = import.meta.env.VITE_HR_SERVICE_URL || 'http://localhost:8005/api/v1/hr';

// Types based on hr_service_integration.md
// These should ideally be shared or generated types
export interface HrProfile {
  id: string;
  username: string;
  email: string;
  role: 'hr';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company?: string;
  years_of_experience?: number;
  specialization?: string;
  resume_path?: string;
  hr_status?: string; // e.g., pending_profile, profile_complete, pending_mapping_approval, mapped
  admin_manager_id?: string | null;
}

export interface HrProfileUpdateData {
  company?: string;
  years_of_experience?: number;
  specialization?: string;
}

// Simplified for now, expand as needed
export interface AdminRequest { // Request from an Admin to an HR
  id: string; // request_id (HRMappingRequestOut id)
  requester_id: string; // Admin who sent the request
  requester_username?: string; // Admin's username
  // target_id is this HR
  status: string; // e.g. "pending"
  created_at: string;
  // Add other fields from HRMappingRequestOut if needed
}

export interface HRApplication { // Application from this HR to an Admin
    id: string; // request_id (HRMappingRequestOut id)
    target_id: string; // Admin to whom HR applied
    target_username?: string; // Admin's username
    status: string; // e.g. "pending", "accepted", "rejected"
    created_at: string;
    updated_at: string;
}

export interface AdminInfo { // For listing admins HR can apply to
    id: string;
    username: string;
    email: string;
}

export interface CandidateSummary { // For HR's assigned candidates list
    id: string;
    username: string;
    email: string;
    full_name?: string;
    status?: string; // Candidate's current application/interview status
}

export interface CandidateForHRView { // For HR's detailed view of assigned candidates
    id: string;
    username: string;
    full_name?: string;
    email: string;
    status?: string; // Candidate's current status in the interview process with this HR
    date_assigned?: string; // ISO date string
    // Potentially other details like upcoming interview date, last activity, etc.
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
  return error.message || 'An unknown error occurred in HR Service API';
};

export const getHrProfileDetails = async (): Promise<HrProfile> => {
  try {
    const response = await axiosInstance.get<HrProfile>(`${HR_SERVICE_BASE_URL}/me/profile`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const updateHrProfileDetails = async (profileData: HrProfileUpdateData): Promise<HrProfile> => {
  try {
    // The design doc says POST for update, which is unusual. Typically PUT or PATCH.
    // Assuming POST as per doc for now.
    const response = await axiosInstance.post<HrProfile>(`${HR_SERVICE_BASE_URL}/profile-details`, profileData);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const uploadHrResume = async (formData: FormData): Promise<HrProfile> => {
  try {
    const response = await axiosInstance.post<HrProfile>(`${HR_SERVICE_BASE_URL}/resume`, formData);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

// Example: Get pending admin requests for this HR user
export const getPendingAdminRequestsForHr = async (): Promise<AdminRequest[]> => {
    try {
        const response = await axiosInstance.get<AdminRequest[]>(`${HR_SERVICE_BASE_URL}/pending-admin-requests`);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
}

export const getHRAssignedCandidatesSummary = async (): Promise<CandidateSummary[]> => {
    try {
        // Calls the new HR-specific endpoint
        const response = await axiosInstance.get<CandidateProfileOut[]>(`${HR_SERVICE_BASE_URL}/me/assigned-candidates`);
        // Transform CandidateProfileOut (from backend) to CandidateSummary (frontend type)
        return response.data.map((candidate: CandidateProfileOut) => ({
            id: candidate.id,
            username: candidate.username,
            email: candidate.email,
            full_name: candidate.username, // Assuming username can be used if full_name is not directly available
            status: candidate.mapping_status || 'N/A', 
        }));
    } catch (error) {
        console.error("Error fetching assigned candidates summary for HR:", error);
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
};

// Define a frontend version of CandidateProfileOut if not already present,
// or ensure CandidateForHRView can be mapped from it.
// For now, assuming CandidateProfileOut is the structure from the backend.
interface CandidateProfileOut { // Based on hr_service/app/schemas/user.py
    id: string;
    username: string;
    email: string;
    role: 'candidate';
    resume_text?: string | null;
    extracted_skills_list?: string[] | null;
    estimated_yoe?: number | null;
    mapping_status?: string | null;
    assigned_hr_id?: string | null;
    created_at?: string;
    // Add any other fields that might come from the backend's CandidateProfileOut
}

export const listAdminsForApplication = async (): Promise<AdminInfo[]> => {
    try {
        const response = await axiosInstance.get<AdminInfo[]>(`${HR_SERVICE_BASE_URL}/admins`);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
};

export const applyToAdmin = async (adminId: string): Promise<HRApplication> => {
    try {
        const response = await axiosInstance.post<HRApplication>(`${HR_SERVICE_BASE_URL}/apply/${adminId}`);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
};

// getPendingAdminRequestsForHr is already defined

export const acceptAdminRequest = async (requestId: string): Promise<HrProfile> => {
    try {
        const response = await axiosInstance.post<HrProfile>(`${HR_SERVICE_BASE_URL}/accept-admin-request/${requestId}`);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
};

export const rejectAdminRequest = async (requestId: string): Promise<{ message: string }> => {
    try {
        const response = await axiosInstance.post<{ message: string }>(`${HR_SERVICE_BASE_URL}/reject-admin-request/${requestId}`);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
};

export const unmapFromAdmin = async (): Promise<HrProfile> => {
    try {
        const response = await axiosInstance.post<HrProfile>(`${HR_SERVICE_BASE_URL}/unmap`);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
};

// HRMappingRequestOut is the backend schema for requests/applications
// HRApplication is the frontend schema
interface HRMappingRequestOut { // Based on backend schema
    id: string;
    requester_id: string;
    target_id: string;
    request_type: string;
    status: string;
    created_at: string;
    updated_at: string;
    // Add target_username if backend provides it for HR applications to Admin
    target_username?: string; // Assuming backend might populate this for convenience
}

export const getMyApplicationsToAdmins = async (): Promise<HRApplication[]> => {
    try {
        // Calls the new HR-specific endpoint
        const response = await axiosInstance.get<HRMappingRequestOut[]>(`${HR_SERVICE_BASE_URL}/me/applications-sent`);
        // Transform HRMappingRequestOut (from backend) to HRApplication (frontend type)
        return response.data.map((app: HRMappingRequestOut) => ({
            id: app.id, // This is the request_id
            target_id: app.target_id, // This is the admin_id HR applied to
            target_username: app.target_username || app.target_id, // Placeholder if username not directly on this model
            status: app.status,
            created_at: app.created_at,
            updated_at: app.updated_at,
        }));
    } catch (error) {
        console.error("Error fetching HR's sent applications:", error);
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
};

export interface CandidateSearchResult extends CandidateSummary {
    extracted_skills_list?: string[];
    estimated_yoe?: number;
    resume_path?: string; // Added as per design doc
    // rank_score?: number; // If ranking is part of the response
}

export interface SearchCandidateParams {
    keyword?: string;
    required_skills?: string; // Comma-separated string
    yoe_min?: number;
    yoe_max?: number; // Added
    education_level?: string; // Added
    location?: string; // Added
    limit?: number;
    skip?: number;
    // Add other filter params as needed
}

// Define a paginated response structure for candidate search results
export interface PaginatedCandidateSearchResults {
  items: CandidateSearchResult[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const searchCandidates = async (params: SearchCandidateParams): Promise<PaginatedCandidateSearchResults> => {
    try {
        // Assuming the backend will return a paginated structure
        const response = await axiosInstance.get<PaginatedCandidateSearchResults>(`${HR_SERVICE_BASE_URL}/search-candidates`, { params });
        return response.data;
    } catch (error) {
        // If backend returns CandidateSearchResult[] and we need to mock pagination (less ideal):
        // For now, we assume backend provides the PaginatedCandidateSearchResults structure.
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
};

export interface MessageContentCreate {
    subject: string;
    content: string;
}

export const sendCandidateInvitation = async (candidateId: string, messageData: MessageContentCreate): Promise<{ message: string }> => {
    try {
        const response = await axiosInstance.post<{ message: string }>(`${HR_SERVICE_BASE_URL}/candidate-invitations/${candidateId}`, messageData);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
};

// Basic Message types for HR (can be expanded or shared if structure is identical to candidate's)
export interface HRMessage {
  id: string;
  sender_id: string; // Could be candidate_id or system
  sender_username?: string;
  recipient_id: string; // This HR user's ID
  subject: string;
  content: string;
  sent_at: string;
  read_status: boolean;
  read_at?: string | null;
}

// For pagination, assuming a structure like this from backend:
export interface PaginatedHRMessages {
  items: HRMessage[];
  total: number;
  page: number;
  size: number;
  pages: number; 
}

export const getHRMessages = async (params?: { page?: number; size?: number; unread?: boolean }): Promise<PaginatedHRMessages> => {
  // TODO: Adjust API call and response mapping when backend pagination is confirmed.
  // For now, simulating pagination if backend returns flat list.
  try {
    // Assuming backend might not support pagination directly yet, or params are different.
    // This is a placeholder to align with HRMessagesPage.tsx's expectation.
    // const response = await axiosInstance.get<HRMessage[]>(`${HR_SERVICE_BASE_URL}/messages`, { params });
    // return { items: response.data, total: response.data.length, page: params?.page || 1, size: params?.size || response.data.length, pages: 1 }; // Mocked pagination

    // More realistic mock if backend *does* support pagination:
    const response = await axiosInstance.get<PaginatedHRMessages>(`${HR_SERVICE_BASE_URL}/messages`, { params });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const markHRMessagesAsRead = async (messageIds: string[]): Promise<{ acknowledged: boolean; modified_count: number }> => {
  try {
    const response = await axiosInstance.post<{ acknowledged: boolean; modified_count: number }>(`${HR_SERVICE_BASE_URL}/messages/mark-read`, {
      message_ids: messageIds,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const markHRMessageAsUnread = async (messageId: string): Promise<{ message: string }> => {
  try {
    const response = await axiosInstance.post<{ message: string }>(`${HR_SERVICE_BASE_URL}/messages/${messageId}/mark-unread`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const getHRAssignedCandidatesDetailedList = async (): Promise<CandidateForHRView[]> => {
  try {
    const response = await axiosInstance.get<CandidateProfileOut[]>(`${HR_SERVICE_BASE_URL}/me/assigned-candidates`);
    // Transform CandidateProfileOut (from backend) to CandidateForHRView (frontend type)
    return response.data.map((candidate: CandidateProfileOut) => ({
        id: candidate.id,
        username: candidate.username,
        email: candidate.email,
        full_name: candidate.username, // Or a dedicated full_name field if available
        status: candidate.mapping_status || 'Assigned',
        date_assigned: candidate.created_at, // Or a specific assignment date field
        // Map other relevant fields from CandidateProfileOut to CandidateForHRView
    }));
  } catch (error) {
    console.error("Error fetching assigned candidates detailed list for HR:", error);
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};
// Add other HR service API functions as needed
