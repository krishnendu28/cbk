import Constants from "expo-constants";

function resolveHost() {
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ||
    (Constants.manifest2 as { extra?: { expoClient?: { hostUri?: string } } } | null)?.extra?.expoClient?.hostUri;

  const host = String(hostUri || "").split(":")[0];
  if (host && host !== "localhost") return host;

  return "localhost";
}

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured;

  if (!__DEV__) return "https://cbk-4dmf.onrender.com";

  const host = resolveHost();
  if (host === "localhost") return "http://localhost:5000";
  return `http://${host}:5000`;
}

export const API_BASE_URL = getApiBaseUrl();
