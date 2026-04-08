# Vercel Deployment for User and Admin Web Apps

This repository has two separate Vite apps you should deploy as two separate Vercel projects:

- User web app: `frontend`
- Admin web app: `admin/chakhna-admin`

## Final domain plan

- User web: https://cbk-user.vercel.app
- Admin web: https://cbk-admin.vercel.app
- Backend API: https://cbk-4dmf.onrender.com

## 1) Deploy the user web app

1. In Vercel, create a new project from this repository.
2. Set **Root Directory** to `frontend`.
3. Build settings are already defined in `frontend/vercel.json`.
4. Add these exact environment variables in Vercel Project Settings:

   - `VITE_API_BASE_URL=https://cbk-4dmf.onrender.com`
   - `VITE_ADMIN_DASHBOARD_URL=https://cbk-admin.vercel.app`

5. Deploy and note the generated user app URL.

## 2) Deploy the admin web app

1. Create another Vercel project from the same repository.
2. Set **Root Directory** to `admin/chakhna-admin`.
3. Build settings are already defined in `admin/chakhna-admin/vercel.json`.
4. Add these exact environment variables in Vercel Project Settings:

   - `VITE_API_BASE_URL=https://cbk-4dmf.onrender.com`
   - `VITE_BRAND_LOGO_URL=https://cbk-user.vercel.app/logo.jpeg`

5. Deploy and note the generated admin app URL.

## 3) Render backend CORS update (required)

Set this exact value in Render for `ALLOWED_ORIGINS`:

`http://localhost:5173,http://localhost:5174,http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006,https://cbk-user.vercel.app,https://cbk-admin.vercel.app,https://cbk-gamma.vercel.app`

Note: use `http://localhost:5174` as the origin in local development; `/pos` is a route path, not a separate CORS origin.

Keep:

- `ALLOW_RENDER_PREVIEWS=true`

## 4) One-shot go-live checklist

1. Create Vercel project `cbk-user` with root directory `frontend`.
2. Set user env vars exactly as above and deploy.
3. Create Vercel project `cbk-admin` with root directory `admin/chakhna-admin`.
4. Set admin env vars exactly as above and deploy.
5. In Render backend service, update `ALLOWED_ORIGINS` to the exact value above and redeploy backend.
6. Validate user app:
   - Loads menu
   - Places order successfully
7. Validate admin app:
   - Shows live orders
   - Status updates work (`Preparing` -> `Ready` -> `Delivered`)
8. Validate cross-links:
   - User page "Owner and Admin Login" opens `https://cbk-admin.vercel.app`
   - Admin login logo loads from `https://cbk-user.vercel.app/logo.jpeg`

## 5) If domain name unavailable on Vercel

If `cbk-user` or `cbk-admin` is unavailable, use any available project names and only replace:

- `VITE_ADMIN_DASHBOARD_URL`
- `VITE_BRAND_LOGO_URL`
- Render `ALLOWED_ORIGINS` with your final two Vercel URLs
