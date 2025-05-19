import apiClient, { type ApiError } from './apiClient'; // Removed API_BASE_URL import

// Base URL for the auth service - should be in an env variable ideally
// apiClient.ts already has API_BASE_URL, this might need adjustment if auth service is different
// For now, assuming auth endpoints are relative to API_BASE_URL in apiClient.ts
// Or, we can construct full URLs here if auth service is on a completely different host/port.
// Let's assume for now endpoints are like '/auth/login', '/auth/register' relative to API_BASE_URL
// const AUTH_API_PREFIX = '/auth'; // Old prefix
const AUTH_SERVICE_BASE_URL = 'http://localhost:8001/api/v1/auth'; // Correct base URL for Auth Service

// Types for API responses and request payloads (mirroring backend schemas)
// These should ideally be in a separate types/interfaces directory or file

export type Role = 'candidate' | 'hr' | 'admin'; // Exporting Role type

export interface UserRegistrationData { // Exporting UserRegistrationData
  username?: string; // Made optional as per UserCreate schema in backend
  email: string;
  password?: string; // Made optional as per UserCreate schema
  role: Role; // Role is required, using exported Role type
}

interface UserLoginData {
  username: string; // This field will take email or username for login
  password?: string; // Made optional as per OAuth2PasswordRequestForm
}

interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
}

interface UserDetails {
  id: string;
  username: string;
  email: string;
  role: 'candidate' | 'hr' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile_status?: string; // Example, adjust based on actual UserOut schema
  mapping_status?: string; // Example, adjust based on actual UserOut schema
}

// --- Change Password Types ---
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// Assuming a similar response structure to other auth operations
export interface ChangePasswordResponse {
  message: string; 
}
// --- End Change Password Types ---

// --- Password Reset Types ---
export interface PasswordResetRequestPayload {
  email: string;
}

export interface PasswordResetConfirmPayload {
  token: string;
  new_password: string;
}

export interface PasswordResetResponse {
  message: string;
}
// --- End Password Reset Types ---

// Helper to extract error message from ApiError (from apiClient)
const getErrorMessage = (error: ApiError): string => {
  const detail = error.data?.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    // Assuming detail is { msg: string; type: string; loc: (string | number)[] }[]
    return detail.map(d => d.msg || String(d)).join(', ');
  }
  return error.message || 'An unknown error occurred';
};


export const registerUser = async (userData: UserRegistrationData): Promise<UserDetails> => {
  try {
    // apiClient.post already stringifies JSON body and sets Content-Type: application/json
    return await apiClient.post<UserDetails, UserRegistrationData>(`${AUTH_SERVICE_BASE_URL}/register`, userData);
  } catch (error) {
    throw new Error(getErrorMessage(error as ApiError));
  }
};

export const loginUser = async (loginData: UserLoginData): Promise<LoginResponse> => {
  const params = new URLSearchParams();
  params.append('username', loginData.username);
  if (loginData.password) {
    params.append('password', loginData.password);
  }

  try {
    // For x-www-form-urlencoded, we need to pass the URLSearchParams object directly as body
    // and set the Content-Type header. apiClient's request function might need adjustment
    // or we make a more direct fetch call here if apiClient is too rigid for this Content-Type.
    // For now, assuming apiClient.post can handle URLSearchParams if Content-Type is specified in options.
    // However, apiClient.post stringifies the body. This needs a custom call or apiClient enhancement.

    // Direct fetch for form-urlencoded:
    const response = await fetch(`${AUTH_SERVICE_BASE_URL}/login`, { // Use correct AUTH_SERVICE_BASE_URL
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });
    if (!response.ok) {
        let errorData: { detail?: string } = { detail: response.statusText };
        try { errorData = await response.json(); } catch { /* ignore */ }
        throw new Error(errorData.detail || `Login failed: ${response.statusText}`);
    }
    const loginResponse = await response.json() as LoginResponse;
    // Manually store token as this direct fetch bypasses apiClient's interceptors (if any were planned for response)
    // However, our current apiClient doesn't have response interceptors for token storage.
    // Token storage is handled by authStore.login -> which calls sessionStorage.setItem
    // So, this direct fetch is okay.
    return loginResponse;

  } catch (error) {
    if (error instanceof Error) {
        throw new Error(error.message || 'Login failed due to an unknown error.');
    }
    throw new Error('Login failed due to an unknown error.');
  }
};

export const getCurrentUser = async (): Promise<UserDetails> => {
  try {
    return await apiClient.get<UserDetails>(`${AUTH_SERVICE_BASE_URL}/me`);
  } catch (error) {
    throw new Error(getErrorMessage(error as ApiError));
  }
};

export const changePassword = async (payload: ChangePasswordPayload): Promise<ChangePasswordResponse> => {
  try {
    return await apiClient.put<ChangePasswordResponse, ChangePasswordPayload>(`${AUTH_SERVICE_BASE_URL}/users/me/password`, payload);
  } catch (error) {
    throw new Error(getErrorMessage(error as ApiError));
  }
};

export const requestPasswordReset = async (payload: PasswordResetRequestPayload): Promise<PasswordResetResponse> => {
  try {
    return await apiClient.post<PasswordResetResponse, PasswordResetRequestPayload>(`${AUTH_SERVICE_BASE_URL}/password-reset/request`, payload);
  } catch (error) {
    throw new Error(getErrorMessage(error as ApiError));
  }
};

export const resetPassword = async (payload: PasswordResetConfirmPayload): Promise<PasswordResetResponse> => {
  try {
    return await apiClient.post<PasswordResetResponse, PasswordResetConfirmPayload>(`${AUTH_SERVICE_BASE_URL}/password-reset/confirm`, payload);
  } catch (error) {
    throw new Error(getErrorMessage(error as ApiError));
  }
};
