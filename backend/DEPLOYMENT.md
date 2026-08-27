# Backend deployment (AWS Lambda)

The production backend is deployed with the Serverless Framework to AWS Lambda (API Gateway HTTP API). It is NOT deployed on Render. See `serverless.yml` at the backend root.

## 1) Deploy

```bash
cd backend
npm ci
npx serverless deploy --stage prod
```

The endpoint is printed at the end of the deploy. Current production endpoint:

`https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com`

Verify after deploy:

```bash
curl https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com/api/health
```

Expected response: `{"ok":true,...,"database":"mongo"}` (must say `mongo`, not `memory`).

## 2) Environment variables (serverless.yml / deploy env)

Pass them when deploying (they are read from your shell environment into `serverless.yml`):

- MONGO_URI: MongoDB connection string, e.g. `mongodb+srv://<username>:<password>@<cluster-url>/chakhna?retryWrites=true&w=majority`
- ALLOWED_ORIGINS: comma-separated frontend origins. Not required because `ALLOW_VERCEL_PREVIEWS=true` and `ALLOW_PRIVATE_NETWORK_ORIGINS`/`localhost` are handled in `src/config/cors.js`.
- ADMIN_API_KEYS: role-based admin access, e.g. `owner:secret-owner-key,manager:secret-manager-key`
- ENFORCE_ADMIN_AUTH: `false` by default; set `true` to strictly require admin keys on protected routes
- EXPO_ACCESS_TOKEN: enables authenticated requests to Expo Push API

## 3) Lambda cold start + keepalive

- Memory 512MB, timeout 29s (`serverless.yml`).
- A keepalive can be scheduled anywhere (e.g. a cron hit to `/api/health`) to reduce cold starts.

## 4) CORS

- Any `*.vercel.app` and `*.onrender.com` preview origins are allowed by default.
- All `localhost:<port>` origins are allowed by default.
- For a custom domain, add it to `ALLOWED_ORIGINS` and redeploy.

## 5) Admin-protected route usage

- For protected endpoints, send `Authorization: Bearer <admin_key>` or `x-admin-key: <admin_key>`.
- Role restrictions:
  - owner/manager: menu create/update, order status update
  - owner only: menu delete, order delete

## 6) MongoDB

- Lambda env var key must be exactly `MONGO_URI`.
- Use a URI with an explicit database name.
- Atlas user must have `readWrite` on the target DB.
- Atlas network access must allow AWS (0.0.0.0/0 for initial testing).
- Verify `/api/health` reports `database: "mongo"`.