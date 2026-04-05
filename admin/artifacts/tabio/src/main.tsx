import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "tabio_session_token";

setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

export { TOKEN_KEY };

createRoot(document.getElementById("root")!).render(<App />);
