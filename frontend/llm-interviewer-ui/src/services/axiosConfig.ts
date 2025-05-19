import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'; // AxiosError might be needed as a value for `instanceof` or type guards
import { AxiosError } from 'axios'; // Keep AxiosError as a value import if used in `catch` for type narrowing

// Function to get the auth token from sessionStorage (or your preferred storage)
const getAuthToken = (): string | null => {
  return sessionStorage.getItem('authToken');
};

// Create an Axios instance
const axiosInstance = axios.create({
  // baseURL will be set per service, or you can have a common gateway
});

// Add a request interceptor to include the token in headers
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors, e.g., 401 for logout
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      // Handle 401 Unauthorized: e.g., clear token, redirect to login
      sessionStorage.removeItem('authToken');
      // Potentially dispatch a logout action if using global state
      // window.location.href = '/login'; // Force redirect
      console.error('Unauthorized access - 401. Token might be invalid or expired.');
      // You might want to throw a specific error or let the caller handle it
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
