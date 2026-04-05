const RENDER_BACKEND_URL = "https://cbk-4dmf.onrender.com";

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured;

  return RENDER_BACKEND_URL;
}

export const API_BASE_URL = getApiBaseUrl();
