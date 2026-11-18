const LAMBDA_BACKEND_URL = "https://cbk-backend.vercel.app";

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured;

  return LAMBDA_BACKEND_URL;
}

export const API_BASE_URL = getApiBaseUrl();
