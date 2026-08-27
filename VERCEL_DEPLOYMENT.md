# Vercel Deployment for User and Admin Web Apps

This repository has two separate Vite apps you should deploy as two separate Vercel projects:

- User web app: `frontend`
- Admin web app: `admin/chakhna-admin`

## Final domain plan

- User web: https://cbk-gamma.vercel.app (live)
- Admin web: https://cbk-admin.vercel.app
- Backend API (AWS Lambda): https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com

## 1) Deploy the user web app

1. In Vercel, create a new project from this repository.
2. Set **Root Directory** to `frontend`.
3. Build settings are already defined in `frontend/vercel.json`.
4. Add these exact environment variables in Vercel Project Settings:

   - `VITE_API_BASE_URL=https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com`
   - `VITE_ADMIN_DASHBOARD_URL=https://cbk-admin.vercel.app`

5. Deploy and note the generated user app URL.

## 2) Deploy the admin web app

1. Create another Vercel project from the same repository.
2. Set **Root Directory** to `admin/chakhna-admin`.
3. Build settings are already defined in `admin/chakhna-admin/vercel.json`.
4. Add these exact environment variables in Vercel Project Settings:

   - `VITE_API_BASE_URL=https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com`
   - `VITE_BRAND_LOGO_URL=https://cbk-gamma.vercel.app/logo.jpeg`

5. Deploy and note the generated admin app URL.

## 3) Backend CORS (AWS Lambda)

The AWS Lambda API (`serverless.yml`) already allows every `*.vercel.app` origin because `ALLOW_VERCEL_PREVIEWS=true`, plus all `localhost` origins from `backend/src/config/cors.js`. No CORS change is required for the Vercel apps.

If you ever deploy from another origin, set `ALLOWED_ORIGINS` when running `serverless deploy`:

`http://localhost:5173,http://localhost:5174,http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006,https://cbk-gamma.vercel.app,https://cbk-admin.vercel.app`

Note: use `http://localhost:5174` as the origin in local development; `/pos` is a route path, not a separate CORS origin.

## 4) One-shot go-live checklist

1. User web project `cbk-gamma` (or `cbk-user`) with root directory `frontend` is deployed.
2. Set user env vars exactly as above and deploy.
3. Create Vercel project `cbk-admin` with root directory `admin/chakhna-admin`.
4. Set admin env vars exactly as above and deploy.
5. Backend is deployed on AWS Lambda. Redeploy after any backend change with `cd backend && npx serverless deploy --stage prod`.
6. Validate user app:
   - Loads menu from `https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com/api/menu`
   - Places order successfully
7. Validate admin app:
   - Shows live orders
   - Status updates work (`Preparing` -> `Ready` -> `Delivered`)
8. Validate cross-links:
   - User page "Owner and Admin Login" opens `https://cbk-admin.vercel.app`
   - Admin login logo loads from `https://cbk-gamma.vercel.app/logo.jpeg`

## 5) If domain name unavailable on Vercel

If `cbk-user`, `cbk-gamma`, or `cbk-admin` is unavailable, use any available project names and only replace:

- `VITE_ADMIN_DASHBOARD_URL`
- `VITE_BRAND_LOGO_URL`
- `ALLOWED_ORIGINS` on the Lambda with your final two Vercel URLs
