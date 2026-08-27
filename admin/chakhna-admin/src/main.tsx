import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { TOKEN_KEY } from "@/lib/session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com";

setBaseUrl(API_BASE_URL);

setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

createRoot(document.getElementById("root")!).render(<App />);
