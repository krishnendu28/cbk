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
- Set ADMIN_API_KEYS for role-based admin access
  Example: owner:super-secret-owner-key,manager:super-secret-manager-key
- Optional: set ENFORCE_ADMIN_AUTH=true to strictly require admin keys for protected routes
  - If false (default), protected routes are temporarily allowed when ADMIN_API_KEYS is not configured
- ALLOW_RENDER_PREVIEWS defaults to true and allows *.onrender.com origins
- ALLOW_VERCEL_PREVIEWS defaults to true and allows *.vercel.app origins

3. Configure cron keepalive env var
- Service: cbk-backend-keepwarm
- Set BACKEND_HEALTHCHECK_URL to your backend health endpoint
  Example: https://cbk-4dmf.onrender.com/api/health

4. Why this setup
- Free tier web services can spin down when idle
- Cron hits /api/health every 10 minutes to reduce cold starts
- healthCheckPath is configured so Render can mark service healthy

5. Verify after deploy
- Open backend health URL in browser
- Expect JSON response: {"ok":true}
- Place a test order from frontend and verify admin live updates

6. Admin-protected route usage
- For protected endpoints, send one of these headers:
  - Authorization: Bearer <admin_key>
  - x-admin-key: <admin_key>
- Role restrictions:
  - owner/manager: menu create/update, order status update
  - owner only: menu delete, order delete

7. MongoDB checklist (Render + Atlas)
- Render web service env var key must be exactly: MONGO_URI
- Use a URI with an explicit database name:
  - mongodb+srv://<username>:<password>@<cluster-url>/chakhna?retryWrites=true&w=majority
- Atlas user permissions:
  - Database Access -> Edit user -> Role must include readWrite on the target DB (for example chakhna)
- Atlas network access:
  - Network Access -> Add IP Address -> Allow Access from Anywhere (0.0.0.0/0) for initial testing
  - After verification, tighten rules as needed
- Redeploy backend after changing env vars
- Verify /api/health shows database: "mongo" (not "memory")
