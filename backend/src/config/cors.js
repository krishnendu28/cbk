const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
  "https://cbk-gamma.vercel.app",
];

const envAllowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];
const allowRenderPreviewOrigins = String(process.env.ALLOW_RENDER_PREVIEWS || "true").toLowerCase() === "true";
const allowVercelPreviewOrigins = String(process.env.ALLOW_VERCEL_PREVIEWS || "true").toLowerCase() === "true";
const allowPrivateNetworkOrigins = String(
  process.env.ALLOW_PRIVATE_NETWORK_ORIGINS || (process.env.NODE_ENV === "production" ? "false" : "true"),
).toLowerCase() === "true";

const privateNetworkOriginPattern =
  /^http:\/\/(?:(?:10(?:\.\d{1,3}){3})|(?:192\.168(?:\.\d{1,3}){2})|(?:172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}))(?:\:\d+)?$/;

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (allowRenderPreviewOrigins && /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin)) return true;
  if (allowVercelPreviewOrigins && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (allowPrivateNetworkOrigins && privateNetworkOriginPattern.test(origin)) return true;
  return /^http:\/\/localhost:\d+$/.test(origin);
}

function resolveOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error("Not allowed by CORS"));
}

export const corsOptions = {
  origin: resolveOrigin,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
};

export const socketCorsOptions = {
  origin: resolveOrigin,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
};
