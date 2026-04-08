import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const TOKEN_KEY = "tabio_session_token";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://cbk-4dmf.onrender.com";

setBaseUrl(API_BASE_URL);

setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

export { TOKEN_KEY };

createRoot(document.getElementById("root")!).render(<App />);
