// src/services/apiClient.ts

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'; // Export API_BASE_URL

export interface ApiError extends Error {
  status?: number;
  data?: { detail?: string | { msg: string; type: string }[]; [key: string]: unknown };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = sessionStorage.getItem('authToken');

  const defaultHeaders: HeadersInit = {
    // 'Content-Type': 'application/json', // Will be set by default for JSON, overridden for FormData
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  // Set Content-Type for non-GET and non-FormData requests
  if (options.method && options.method.toUpperCase() !== 'GET' && !(options.body instanceof FormData)) {
    (config.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }


  try {
    // console.log(`API Request: ${config.method || 'GET'} ${url}`, config.body ? `Body: ${config.body}` : '');
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData: { detail?: string | { msg: string; type: string }[]; [key: string]: unknown } = { detail: response.statusText };
      try {
        const parsedError = await response.json();
        if (typeof parsedError === 'object' && parsedError !== null) {
          errorData = parsedError;
        }
      } catch {
        // Non-JSON error response, use status text
      }
      
      const error = new Error(
        typeof errorData.detail === 'string' ? errorData.detail : 
        (Array.isArray(errorData.detail) && errorData.detail[0]?.msg) ? errorData.detail[0].msg : 
        response.statusText
      ) as ApiError;
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    if (response.status === 204) { // No Content
      return undefined as T; 
    }
    
    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json() as Promise<T>;
    } else {
        // Handle non-JSON responses, like plain text for a success message
        // Or if no content is expected but status is 200/201
        // For now, if not JSON and not 204, we assume it might be an issue or needs specific handling
        // If a text response is expected, use response.text()
        // This part might need adjustment based on actual API responses for non-JSON success
        return undefined as T; // Or handle as text: await response.text() as unknown as T;
    }

  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    // Ensure the error thrown is an instance of ApiError or has similar properties
    if (error instanceof Error && !(error as ApiError).status) {
        const apiError = error as ApiError;
        apiError.message = `Network error or an issue reaching the API: ${error.message}`;
        // status might be undefined if it's a network error before response
        throw apiError;
    }
    throw error; // Re-throw if already an ApiError or other type of error
  }
}


const apiClient = {
  get: <T>(endpoint: string, options?: Omit<RequestInit, 'method' | 'body'>) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T, U>(endpoint: string, data: U, options?: Omit<RequestInit, 'method' | 'body'>) => 
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),

  put: <T, U>(endpoint: string, data: U, options?: Omit<RequestInit, 'method' | 'body'>) => 
    request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),

  delete: <T>(endpoint: string, options?: Omit<RequestInit, 'method' | 'body'>) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
  
  postMultipart: async <T, U extends FormData>(endpoint: string, formData: U, options: Omit<RequestInit, 'body' | 'headers' | 'method'> = {}): Promise<T> => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const token = sessionStorage.getItem('authToken');
    
    const headers: HeadersInit = {}; 
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // For FormData, Content-Type is set by the browser. Do not set it manually.

    const config: RequestInit = {
      ...options,
      method: 'POST',
      headers: headers, // Only auth header
      body: formData,
    };

    try {
      // console.log(`API Multipart Request: POST ${url}`);
      const response = await fetch(url, config);
      if (!response.ok) {
        let errorData: { detail?: string | { msg: string; type: string }[]; [key: string]: unknown } = { detail: response.statusText };
        try { 
            const parsedError = await response.json();
            if (typeof parsedError === 'object' && parsedError !== null) {
                errorData = parsedError;
            }
        } catch { /* Non-JSON error response */ }
        const error = new Error(
            typeof errorData.detail === 'string' ? errorData.detail : 
            (Array.isArray(errorData.detail) && errorData.detail[0]?.msg) ? errorData.detail[0].msg : 
            response.statusText
        ) as ApiError;
        error.status = response.status;
        error.data = errorData;
        throw error;
      }
      if (response.status === 204) return undefined as T;
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
          return response.json() as Promise<T>;
      }
      return undefined as T; 

    } catch (error) {
      console.error(`API multipart request to ${endpoint} failed:`, error);
      if (error instanceof Error && !(error as ApiError).status) {
        const apiError = error as ApiError;
        apiError.message = `Network error or an issue reaching the API: ${error.message}`;
        throw apiError;
      }
      throw error;
    }
  }
};

export default apiClient;
