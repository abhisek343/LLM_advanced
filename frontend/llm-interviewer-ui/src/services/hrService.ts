// frontend/llm-interviewer-ui/src/services/hrService.ts

const API_BASE_URL = 'http://localhost:8005/api/v1/hr'; // Adjust if your backend runs elsewhere

// --- Re-exported and Local Type Definitions ---

// Matches the backend schema's RequestMappingStatus
export type RequestMappingStatusType =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "pending_admin_approval"
  | "admin_approved"
  | "admin_rejected"
  | "hr_confirmed_mapping"
  | "hr_rejected_invitation"
  | "hr_cancelled_application"
  | "request_pending_hr_approval"
  | "superceded";

export interface UserInfoBasic {
  id: string;
  username: string;
  email: string;
  role: 'hr' | 'admin' | 'candidate' | 'superadmin';
}

// For API responses like /admins
export interface AdminBasicOut {
  id: string;
  username: string;
  email: string;
  // is_active might also be present from backend
}

// For HR Profile details
// Aligned with backend User model's HrStatus and relevant fields
export type HrStatusType = 
  | "pending_profile" 
  | "profile_complete" 
  | "application_pending" 
  | "admin_request_pending" 
  | "mapped" 
  | "unmapped"; // Added unmapped as per backend User model

export interface HrProfileOut {
  id: string;
  username: string;
  email: string;
  role: 'hr';
  hr_status: HrStatusType;
  admin_manager_id?: string | null;
  admin_manager_name?: string | null; // This might be a frontend-derived field or needs specific backend support
  company?: string | null;
  years_of_experience?: number | null;
  resume_path?: string | null;
  specialization?: string | null;
  extracted_skills_list?: string[] | null; // Added
  created_at: string; // Added (ISO date string)
  updated_at?: string | null; // (ISO date string)
  // other fields as needed
}

// For updating HR Profile
export interface HrProfileUpdate {
  company?: string | null;
  years_of_experience?: number | null;
  specialization?: string | null;
  // Add other updatable fields as necessary
}

// Represents a generic mapping request from the backend (used for various endpoints)
export interface HRMappingRequest {
  id: string; // alias for _id
  request_type: "application" | "request";
  requester_id: string;
  requester_role: 'hr' | 'admin';
  target_id: string;
  target_role: 'hr' | 'admin';
  status: RequestMappingStatusType;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  requester_info?: UserInfoBasic | null;
  target_info?: UserInfoBasic | null;
}

// Specific type for what ManageAdminConnectionsPage expects for "My Applications"
export interface HRApplicationWithAdminName {
  id: string;
  target_id: string; // Admin's ID
  admin_name: string;
  created_at: string; // Date sent
  status: RequestMappingStatusType;
}

// Specific type for what ManageAdminConnectionsPage expects for "Incoming Requests"
export interface HRMappingRequestFromAdmin {
  id: string;
  requester_id: string; // Admin's ID
  requester_name: string; // Admin's name
  created_at: string; // Date received
  status: RequestMappingStatusType; // Should be 'request_pending_hr_approval'
}

// For Candidate Search
export interface SearchFilters {
  keyword?: string;
  required_skills?: string[];
  yoe_min?: number;
}

export interface RankedCandidate { // Assuming structure based on backend
  id: string;
  username: string;
  email: string;
  score: number;
  // other candidate details
}

// For Messaging
export interface MessageContentCreate {
  subject?: string;
  content: string;
}

export interface MessageOut {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string | null;
  content: string;
  sent_at: string; // ISO date string
  read_status: boolean;
  read_at?: string | null; // ISO date string
  sender_info?: UserInfoBasic | null;
}

// For HR's assigned candidates
// This should align with the CandidateProfileOut schema from the backend
export interface CandidateProfileOut {
  id: string;
  username: string;
  email: string;
  role: 'candidate';
  candidate_status?: string | null; // e.g., "pending_invitation", "invited", "interview_scheduled", "completed"
  assigned_hr_id?: string | null;
  assigned_admin_id?: string | null; // Assuming admin might also be linked
  // Add other relevant candidate fields that HR might see
  created_at: string; // ISO date string
  updated_at?: string | null; // ISO date string
  // Potentially: years_of_experience, extracted_skills_list if HR needs quick view
}


// --- API Client Helper ---
async function apiClient<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown> | unknown // More specific than 'any' for body
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    // Assuming a token is stored in localStorage, typical for JWT auth
    // Adjust token retrieval as per your auth mechanism (e.g., from AuthContext)
  };
  const token = sessionStorage.getItem('authToken'); // Changed from localStorage to sessionStorage
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn("Auth token not found in sessionStorage. API calls will likely be unauthorized.");
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (parseError) { // Give the error variable a name to use or log it
      console.error("Failed to parse error response as JSON:", parseError);
      // If response is not JSON, use status text
      throw new Error(response.statusText || `Request failed with status ${response.status}`);
    }
    // Use detail from FastAPI error response if available
    throw new Error(errorData?.detail || `Request failed with status ${response.status}`);
  }

  // For 204 No Content or similar, response.json() might fail
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T; // Or an appropriate empty response
  }
  
  return response.json() as Promise<T>;
}

// --- Service Methods ---

const hrService = {
  getProfileDetails: async (): Promise<HrProfileOut> => {
    return apiClient<HrProfileOut>('/me/profile');
  },

  listAdmins: async (): Promise<AdminBasicOut[]> => {
    return apiClient<AdminBasicOut[]>('/admins');
  },

  // Fetches applications sent by the HR, expects admin name to be populated by backend
  getHrApplications: async (): Promise<HRApplicationWithAdminName[]> => {
    const rawApplications = await apiClient<HRMappingRequest[]>('/me/applications-sent');
    return rawApplications.map(app => ({
      id: app.id,
      target_id: app.target_id,
      admin_name: app.target_info?.username || 'Unknown Admin',
      created_at: app.created_at,
      status: app.status,
    }));
  },

  // Fetches requests sent by Admins to the HR
  getPendingAdminRequests: async (): Promise<HRMappingRequestFromAdmin[]> => {
    const rawRequests = await apiClient<HRMappingRequest[]>('/pending-admin-requests');
    return rawRequests.map(req => ({
      id: req.id,
      requester_id: req.requester_id,
      requester_name: req.requester_info?.username || 'Unknown Admin',
      created_at: req.created_at,
      status: req.status,
    }));
  },
  
  getAdminApprovedApplications: async (): Promise<HRMappingRequest[]> => {
    // This endpoint on the backend returns HRMappingRequestOut which should include target_info
    return apiClient<HRMappingRequest[]>('/me/approved-applications');
  },

  applyToAdmin: async (adminId: string): Promise<HRMappingRequest> => {
    return apiClient<HRMappingRequest>(`/apply/${adminId}`, 'POST');
  },

  acceptAdminRequest: async (requestId: string): Promise<HrProfileOut> => {
    return apiClient<HrProfileOut>(`/accept-admin-request/${requestId}`, 'POST');
  },

  rejectAdminRequest: async (requestId: string): Promise<{ message: string }> => {
    return apiClient<{ message: string }>(`/reject-admin-request/${requestId}`, 'POST');
  },

  unmapFromAdmin: async (): Promise<HrProfileOut> => {
    return apiClient<HrProfileOut>('/unmap', 'POST');
  },

  confirmAdminChoice: async (requestId: string): Promise<HrProfileOut> => {
    return apiClient<HrProfileOut>(`/applications/${requestId}/confirm-mapping`, 'POST');
  },

  cancelApplication: async (requestId: string): Promise<HRMappingRequest> => {
    return apiClient<HRMappingRequest>(`/applications/${requestId}/cancel`, 'POST');
  },

  // --- Added missing methods ---
  updateProfileDetails: async (profileData: HrProfileUpdate): Promise<HrProfileOut> => {
    return apiClient<HrProfileOut>('/profile-details', 'POST', profileData);
  },

  uploadResume: async (resumeFile: File): Promise<HrProfileOut> => {
    const formData = new FormData();
    formData.append('resume', resumeFile);
    // For FormData, apiClient needs to be adjusted or use a specific fetch call
    // For simplicity, assuming apiClient can handle FormData if headers are adjusted
    // This part might need a custom fetch call if apiClient is strictly JSON
    const response = await fetch(`${API_BASE_URL}/resume`, {
      method: 'POST',
      headers: { // Authorization header might be needed here too
        // 'Content-Type': 'multipart/form-data' is set automatically by browser for FormData
        ...(sessionStorage.getItem('authToken') ? { 'Authorization': `Bearer ${sessionStorage.getItem('authToken')}` } : {}) // Changed from localStorage
      },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }
    return response.json();
  },

  searchCandidates: async (filters: SearchFilters): Promise<RankedCandidate[]> => {
    // Convert filters to query string
    const queryParams = new URLSearchParams();
    if (filters.keyword) queryParams.append('keyword', filters.keyword);
    if (filters.required_skills) {
      filters.required_skills.forEach(skill => queryParams.append('required_skills', skill));
    }
    if (filters.yoe_min !== undefined) queryParams.append('yoe_min', String(filters.yoe_min));
    
    return apiClient<RankedCandidate[]>(`/search-candidates?${queryParams.toString()}`);
  },

  sendCandidateInvitation: async (candidateId: string, messageData: MessageContentCreate): Promise<{ message: string }> => {
    return apiClient<{ message: string }>(`/candidate-invitations/${candidateId}`, 'POST', messageData);
  },

  getMessages: async (limit: number = 50, offset: number = 0): Promise<MessageOut[]> => {
    return apiClient<MessageOut[]>(`/messages?limit=${limit}&offset=${offset}`);
  },

  markMessagesAsRead: async (messageIds: string[]): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>('/messages/mark-read', 'POST', { message_ids: messageIds });
  },

  sendMessageToUser: async (recipientUserId: string, messageData: MessageContentCreate): Promise<MessageOut> => {
    return apiClient<MessageOut>(`/messages/send/${recipientUserId}`, 'POST', messageData);
  },

  getMyAssignedCandidates: async (): Promise<CandidateProfileOut[]> => {
    return apiClient<CandidateProfileOut[]>('/me/assigned-candidates');
  },

};

export default hrService;
// Types are already exported at their definition. This re-export block is not needed.
// export type { 
//     SearchFilters, 
//     MessageContentCreate, 
//     MessageOut,
//     HrProfileUpdate,
//     RankedCandidate
// };
