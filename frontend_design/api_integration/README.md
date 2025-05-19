# API Integration Strategy

This section details how the frontend application will interact with the backend microservices.

## 1. General Principles

*   **Dedicated API Service Clients**: For each backend microservice (`auth_service`, `candidate_service`, etc.), a corresponding client-side service module (e.g., `src/services/authAPI.js`, `src/services/candidateAPI.js`) will be created. These modules will encapsulate all logic for making API calls to that specific service.
*   **Centralized API Configuration**: Base URLs for each microservice will be managed in a central configuration file (e.g., environment variables or a config module). This allows for easy updates if backend service URLs change.
*   **Asynchronous Operations**: All API calls will be asynchronous, typically using `async/await` with `fetch` or a library like `axios`.
*   **Error Handling**:
    *   API service clients will handle common HTTP error responses (e.g., 400, 401, 403, 404, 500).
    *   They will attempt to parse error messages from the backend response body.
    *   Consistent error objects or exceptions will be thrown/returned to the calling UI components for user-friendly display.
*   **Authentication (JWT)**:
    *   The `auth_service` client will handle login and registration.
    *   Upon successful login, the JWT access token will be securely stored (e.g., `localStorage` or a secure cookie).
    *   For all subsequent requests to protected endpoints in other services, the API client modules will automatically include the `Authorization: Bearer <token>` header.
    *   If a `401 Unauthorized` response is received (e.g., due to an expired token), the API client or a global interceptor should clear the stored token and redirect the user to the login page.
*   **Request/Response Data Formatting**:
    *   Requests sending data (POST, PUT) will typically use `Content-Type: application/json`, with bodies stringified to JSON.
    *   File uploads (e.g., resumes) will use `multipart/form-data`.
    *   Responses are expected to be in JSON format.
*   **Loading States**: UI components making API calls will manage their own loading states (e.g., displaying a `Spinner` component) while waiting for responses. This can be facilitated by the API service clients returning promises that resolve/reject.

## 2. API Client Module Structure (Example)

A typical API service client module (e.g., `src/services/candidateAPI.js`) might look like this:

```javascript
// src/services/candidateAPI.js
import axiosInstance from './axiosConfig'; // Centralized axios instance with base URL and interceptors

const API_BASE_URL = process.env.REACT_APP_CANDIDATE_SERVICE_URL || 'http://localhost:8002/api/v1/candidate';

// Function to get the auth token (implementation depends on where it's stored)
const getAuthToken = () => localStorage.getItem('authToken');

const getHeaders = () => {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const getCandidateProfile = async () => {
    try {
        // Using a pre-configured axiosInstance that might handle base URL and error interceptors
        // const response = await axiosInstance.get('/candidate/profile');
        // Or directly using axios/fetch:
        const response = await axios.get(`${API_BASE_URL}/profile`, { headers: getHeaders() });
        return response.data;
    } catch (error) {
        // Handle/re-throw error
        console.error("Error fetching candidate profile:", error.response?.data || error.message);
        throw error.response?.data || new Error("Failed to fetch profile");
    }
};

export const updateCandidateProfile = async (profileData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/profile`, profileData, { headers: getHeaders() });
        return response.data;
    } catch (error) {
        console.error("Error updating candidate profile:", error.response?.data || error.message);
        throw error.response?.data || new Error("Failed to update profile");
    }
};

export const uploadCandidateResume = async (formData) => { // formData is a FormData object
    try {
        const token = getAuthToken();
        const response = await axios.post(`${API_BASE_URL}/resume`, formData, {
            headers: {
                ... (token && { 'Authorization': `Bearer ${token}` }), // Conditional auth header
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading resume:", error.response?.data || error.message);
        throw error.response?.data || new Error("Failed to upload resume");
    }
};

// ... other functions for candidate messages, etc.
```

## 3. Service-Specific Integration Details

Detailed mapping of frontend components/views to specific backend API endpoints for each service will be documented in separate files:

*   `auth_service_integration.md`
*   `candidate_service_integration.md`
*   `hr_service_integration.md`
*   `admin_service_integration.md`
*   `interview_service_integration.md`

These documents will list each frontend feature/action and the corresponding backend API call(s), expected request payloads, and response data structures.
