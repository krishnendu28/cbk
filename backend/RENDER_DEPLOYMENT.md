Render deployment for backend

1. Connect repo and use Blueprint deploy
- Render dashboard -> New + -> Blueprint
- Select this repository
- Render reads render.yaml at repository root

2. Configure web service env vars
- Service: cbk-backend
- Set MONGO_URI to your MongoDB connection string
- Set ALLOWED_ORIGINS to your frontend URL(s), comma-separated
  Example: https://your-frontend.onrender.com,https://your-custom-domain.com
- ALLOW_RENDER_PREVIEWS defaults to true and allows *.onrender.com origins

3. Configure cron keepalive env var
- Service: cbk-backend-keepwarm
- Set BACKEND_HEALTHCHECK_URL to your backend health endpoint
  Example: https://cbk-backend.onrender.com/api/health

4. Why this setup
- Free tier web services can spin down when idle
- Cron hits /api/health every 10 minutes to reduce cold starts
- healthCheckPath is configured so Render can mark service healthy

5. Verify after deploy
- Open backend health URL in browser
- Expect JSON response: {"ok":true}
- Place a test order from frontend and verify admin live updates
