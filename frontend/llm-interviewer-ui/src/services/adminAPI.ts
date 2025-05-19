import axiosInstance from './axiosConfig';
import { AxiosError } from 'axios';

const ADMIN_SERVICE_BASE_URL = import.meta.env.VITE_ADMIN_SERVICE_URL || 'http://localhost:8004/api/v1/admin';

// Types based on admin_service_integration.md
export interface AdminProfile { // Assuming an AdminProfile exists, though not explicitly in design doc for admin
  id: string;
  username: string;
  email: string;
  role: 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Admin specific fields if any
}

interface UserInfoFromRequest {
  id: string;
  username: string;
  email: string;
  role: string; // 'hr' or 'admin'
  company?: string; // Added for HR company info
  // Add other fields if present in requester_info/target_info
}

export interface SystemStats {
  total_users: number; // Represents non-admin, non-test users from backend
  // total_candidates, total_hrs, total_admins are not directly provided by /stats
  total_interviews_completed: number; // Changed from total_interviews_conducted
  total_hr_mapped?: number;
  total_candidates_assigned?: number;
  total_interviews_scheduled?: number;
  llm_service_status?: string;
  // Add other stats as defined by the backend
}

export interface HRApplicationForAdmin { // HR's application to an Admin
  _id: string; // This is the request_id
  request_type: string; // e.g., "application"
  requester_id: string; // This is the hr_user_id (applicant)
  target_id: string; // This is the admin_user_id (recipient of application)
  status: string; // e.g., "pending"
  created_at: string; // This is the application_date
  updated_at: string;
  requester_info: UserInfoFromRequest | null; // Information about the HR
  target_info: UserInfoFromRequest | null; // Information about the Admin (can be null)
  // hr_company and hr_specialization are not directly in this structure,
  // they might be part of requester_info if fetched, or need separate fetching.
  // For now, let's assume they are not part of this specific API response object.
}

export interface UserManagementInfo { // For listing users
    id: string;
    username: string;
    email: string;
    role: 'candidate' | 'hr' | 'admin';
    is_active: boolean;
    created_at: string;
    last_login_at?: string | null; // Added for Last Login display
    company?: string; // for HR
    hr_status?: string; // for HR
    years_of_experience?: number; // for HR, added for detail page
    assigned_admin_id?: string; // for HR (Admin this HR is mapped to)
    
    mapping_status?: string; // for Candidate, e.g., CandidateMappingStatus type from backend models
    assigned_hr_id?: string | null; // for Candidate (HR assigned to this candidate)
    
    assigned_candidates_count?: number; // Added for HR load display (primarily for HR lists)
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
  return error.message || 'An unknown error occurred in Admin Service API';
};

export const getSystemStats = async (): Promise<SystemStats> => {
  try {
    const response = await axiosInstance.get<SystemStats>(`${ADMIN_SERVICE_BASE_URL}/stats`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const getPendingHRApplications = async (): Promise<HRApplicationForAdmin[]> => {
  try {
    const response = await axiosInstance.get<HRApplicationForAdmin[]>(`${ADMIN_SERVICE_BASE_URL}/hr-applications`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const approveHRApplication = async (requestId: string): Promise<{ message: string }> => {
  try {
    // Corrected path from /approve to /accept to match backend route
    const response = await axiosInstance.post<{ message: string }>(`${ADMIN_SERVICE_BASE_URL}/hr-applications/${requestId}/accept`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const rejectHRApplication = async (requestId: string): Promise<{ message: string }> => {
  try {
    const response = await axiosInstance.post<{ message: string }>(`${ADMIN_SERVICE_BASE_URL}/hr-applications/${requestId}/reject`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

// User Management related functions
export interface GetAllUsersParams {
  search_term?: string; // Added for searching by username/email
  role?: string;
  is_active?: boolean;
  limit?: number;
  skip?: number;
  assigned_hr_id?: string; // For filtering candidates by assigned HR
  admin_manager_id?: string; // For filtering HRs by their admin manager
  hr_status?: string; // For filtering HRs by their status (e.g., "mapped")
}

// Expected paginated response structure from the backend
export interface PaginatedUsersResponse {
  items: UserManagementInfo[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// The backend /users endpoint currently returns a direct list (UserManagementInfo[]), not a PaginatedUsersResponse object.
// Adjusting the return type here to match the backend.
// If a paginated structure is needed for other components, that specific component's data fetching
// or this service function might need further adaptation or splitting.
export const getAllUsers = async (params?: GetAllUsersParams): Promise<UserManagementInfo[]> => {
    try {
        const response = await axiosInstance.get<UserManagementInfo[]>(`${ADMIN_SERVICE_BASE_URL}/users`, { params });
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
};

export const updateUserActivationStatus = async (userId: string, isActive: boolean): Promise<UserManagementInfo> => {
    try {
        const response = await axiosInstance.patch<UserManagementInfo>(`${ADMIN_SERVICE_BASE_URL}/users/${userId}/status`, { is_active: isActive });
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
    }
};

// For HR to see their applications sent to Admins
export interface HRApplicationToAdmin { // Similar to HRApplicationForAdmin but from HR's perspective
  request_id: string;
  admin_user_id: string; // target_id
  admin_username?: string;
  application_date: string;
  status: string;
}

export const getHrApplicationsByRequester = async (hrUserId: string): Promise<HRApplicationToAdmin[]> => {
  try {
    // This endpoint is based on the design doc: GET admin_service/api/v1/admin/hr-applications?requester_id={hr_user_id}
    const response = await axiosInstance.get<HRApplicationToAdmin[]>(`${ADMIN_SERVICE_BASE_URL}/hr-applications`, { params: { requester_id: hrUserId } });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const getUserById = async (userId: string): Promise<UserManagementInfo> => {
  try {
    const response = await axiosInstance.get<UserManagementInfo>(`${ADMIN_SERVICE_BASE_URL}/users/${userId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await axiosInstance.delete(`${ADMIN_SERVICE_BASE_URL}/users/${userId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

// HR Management by Admin
export interface RankedHR { // Based on admin_service_integration.md
  id: string;
  username: string;
  email: string;
  company?: string;
  years_of_experience?: number;
  hr_status: string;
  // rank_score?: number;
}

export interface SearchHrParams {
  status_filter?: string;
  keyword?: string;
  yoe_min?: number;
  limit?: number;
  skip?: number;
}

export const searchHrProfiles = async (params?: SearchHrParams): Promise<RankedHR[]> => {
  try {
    const response = await axiosInstance.get<RankedHR[]>(`${ADMIN_SERVICE_BASE_URL}/search-hr`, { params });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export interface HRMappingRequestOut { // Based on admin_service_integration.md
  id: string;
  requester_id: string; // Admin's ID
  target_id: string;    // HR's ID
  request_type: string; // e.g., "admin_to_hr_invitation"
  status: string;
  created_at: string;
  updated_at: string;
}

export const sendHrMappingRequest = async (hrUserId: string): Promise<HRMappingRequestOut> => {
  try {
    const response = await axiosInstance.post<HRMappingRequestOut>(`${ADMIN_SERVICE_BASE_URL}/hr-mapping-requests/${hrUserId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export interface AssignHrRequest {
  hr_id: string;
}

// Assuming CandidateProfileOut is similar to UserManagementInfo for now
export const assignHrToCandidate = async (candidateId: string, hrId: string): Promise<UserManagementInfo> => {
  try {
    const payload: AssignHrRequest = { hr_id: hrId };
    const response = await axiosInstance.post<UserManagementInfo>(`${ADMIN_SERVICE_BASE_URL}/candidates/${candidateId}/assign-hr`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const getMappedHrsForAdmin = async (adminId: string): Promise<UserManagementInfo[]> => {
  try {
    // Uses the existing getAllUsers with specific filters
    const params: GetAllUsersParams = { role: 'hr', admin_manager_id: adminId, hr_status: 'mapped' };
    // Assuming the /users endpoint returns UserManagementInfo[] directly for this query,
    // consistent with comments for getAllUsers.
    const response = await axiosInstance.get<UserManagementInfo[]>(`${ADMIN_SERVICE_BASE_URL}/users`, { params });
    return response.data; // Return the array directly
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export const unmapHrFromAdmin = async (hrUserId: string): Promise<{ message: string }> => {
  try {
    // Assuming an endpoint like this. The actual endpoint might differ.
    // This might involve setting the HR's admin_manager_id to null and updating their hr_status.
    const response = await axiosInstance.post<{ message: string }>(`${ADMIN_SERVICE_BASE_URL}/hr-mappings/${hrUserId}/unmap`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

export interface SentMappingRequest { // Information about a mapping request sent by an Admin
  id: string; // request_id
  hr_user_id: string; // target_id
  hr_username?: string;
  hr_email?: string;
  date_sent: string; // created_at
  status: string; // 'pending', 'accepted', 'rejected_by_hr'
}

export const getSentMappingRequestsByAdmin = async (): Promise<SentMappingRequest[]> => {
  try {
    const response = await axiosInstance.get<SentMappingRequest[]>(`${ADMIN_SERVICE_BASE_URL}/me/hr-mapping-requests-sent`);
    return response.data;
  } catch (error) {
    // If the endpoint returns 404 or empty specifically when no requests are found,
    // it might be better to catch that and return [] instead of throwing.
    // For now, any error will be thrown.
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

// Import Role type from authAPI or define it if not already globally available
// For now, assuming it might need to be imported or re-defined if not using a shared types package.
// Let's assume Role is available from authAPI as per UserManagementPage.tsx's import.
import type { Role } from './authAPI'; // Adjust path if Role is elsewhere or defined locally

export interface UpdateUserRolePayload {
  new_role: Role;
}

export const updateUserRole = async (userId: string, payload: UpdateUserRolePayload): Promise<UserManagementInfo> => {
  try {
    const response = await axiosInstance.patch<UserManagementInfo>(`${ADMIN_SERVICE_BASE_URL}/users/${userId}/role`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail>));
  }
};

// Placeholder for sending interview invitation to a candidate
export interface CandidateInterviewInvitationResponse {
  message: string;
  invitation_link?: string; // Optionally, the backend might return the link
}

export const sendCandidateInterviewInvitation = async (candidateId: string): Promise<CandidateInterviewInvitationResponse> => {
  try {
    // This is a placeholder. The actual endpoint and payload will depend on backend implementation.
    // Assuming a simple POST request to an endpoint like /candidates/{candidateId}/send-interview-invitation
    const response = await axiosInstance.post<CandidateInterviewInvitationResponse>(`${ADMIN_SERVICE_BASE_URL}/candidates/${candidateId}/send-interview-invitation`);
    return response.data;
  } catch (error) {
    // It's good practice to provide a more specific error message if possible
    throw new Error(getErrorMessage(error as AxiosError<ApiErrorDetail> || 'Failed to send interview invitation.'));
  }
};


// Add other Admin service API functions as needed (e.g., managing interview templates, site settings)
