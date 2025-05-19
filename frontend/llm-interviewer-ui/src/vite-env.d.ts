/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_SERVICE_URL: string;
  readonly VITE_CANDIDATE_SERVICE_URL: string;
  readonly VITE_INTERVIEW_SERVICE_URL: string;
  readonly VITE_HR_SERVICE_URL: string;
  readonly VITE_ADMIN_SERVICE_URL: string;
  readonly VITE_API_BASE_URL: string;
  // Add other environment variables here as they are defined
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
