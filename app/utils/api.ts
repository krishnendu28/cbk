const LAMBDA_BACKEND_URL = "https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com";

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured;

  return LAMBDA_BACKEND_URL;
}

export const API_BASE_URL = getApiBaseUrl();
