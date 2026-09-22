export const TOKEN_KEY = "tabio_session_token";
export const DEMO_SESSION_KEY = "cbk_tabio_demo_owner";

export const DEMO_AUTH_ENABLED = import.meta.env.VITE_TABIO_DEMO_AUTH === "true";

export function isDemoSessionActive(): boolean {
  return (
    DEMO_AUTH_ENABLED &&
    typeof localStorage !== "undefined" &&
    localStorage.getItem(DEMO_SESSION_KEY) === "1"
  );
}
