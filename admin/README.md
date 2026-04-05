# ![Tabio](./product-neoflow.svg)

# Tabio — Intelligent POS for Restaurants

Technical documentation for the `Asset-Manager` monorepo powering Tabio POS.

## 1) What this repository contains

- Monorepo with `pnpm` workspaces.
- Production-oriented restaurant operations platform core:
  - POS and billing
  - Kitchen KOT workflows
  - Menu and inventory management
  - CRM and reporting
  - Outlet-scoped access control and role-based restrictions
  - Mock Zomato/Swiggy aggregator flows
- API contract and typed client generation pipeline (OpenAPI → Orval → React Query hooks / Zod types).

## 2) High-level architecture

- **Frontend**: React + Vite + TypeScript (`artifacts/tabio`)
- **Backend**: Express 5 API (`artifacts/api-server`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Contract layer**:
  - OpenAPI source: `lib/api-spec/openapi.yaml`
  - Generated React API hooks: `lib/api-client-react`
  - Generated Zod schemas: `lib/api-zod`

## 3) Workspace layout

```text
artifacts/
  api-server/          # API service (Express)
  tabio/               # Frontend app (Vite/React)
  mockup-sandbox/      # UI experimentation sandbox
lib/
  db/                  # Drizzle schema + DB client
  api-spec/            # OpenAPI + Orval config
  api-client-react/    # Generated client hooks
  api-zod/             # Generated zod validators/types
scripts/               # Utility scripts
```

## 4) Runtime prerequisites

- Node.js 20+
- `pnpm` 9+
- PostgreSQL 14+
- Windows, macOS, or Linux shell with environment variable support

## 5) Environment configuration

1. Copy `.env.example` → `.env`
2. Set values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tabio
PORT=3001
ZOMATO_API_KEY=
SWIGGY_API_KEY=
```

Notes:
- `DATABASE_URL` is mandatory for API and DB packages.
- Frontend talks to API via Vite proxy (`/api` → backend).

## 6) Install dependencies

From repository root:

```bash
pnpm install
```

The root `preinstall` script enforces `pnpm` usage.

## 7) Database bootstrap

From root:

```bash
pnpm --filter @workspace/db push
```

Optional force push (destructive depending on DB state):

```bash
pnpm --filter @workspace/db push-force
```

## 8) Run services in development

### API server

```bash
pnpm --filter @workspace/api-server dev
```

- Default port: `3001`
- Health endpoint: `GET /api/healthz`

### Frontend

```bash
pnpm --filter @workspace/tabio dev
```

- Served by Vite
- Uses configured API proxy for `/api`

## 9) Build and typecheck

### Root quality gates

```bash
pnpm run typecheck
pnpm run build
```

### Package-level checks

```bash
pnpm --filter @workspace/tabio typecheck
pnpm --filter @workspace/api-server typecheck
```

## 10) API contract and code generation

Generate typed clients/schemas from OpenAPI:

```bash
pnpm --filter @workspace/api-spec codegen
```

This updates generated artifacts used by frontend and backend-adjacent validation libraries.

## 11) Authentication and authorization model

- Session-backed auth using token + cookie/bearer handling.
- Roles in system:
  - `owner`
  - `manager`
  - `cashier`
  - `kitchen`
  - `waiter`
- Route-level authorization is enforced in API route mounting and middleware.
- Outlet access is guarded by `outletId` checks to restrict cross-outlet access.

## 12) Core functional modules

- **Auth**: login/me/logout
- **Outlets**: outlet metadata, dashboard, settings
- **Staff**: staff CRUD and status
- **Tables**: table lifecycle and state
- **Menu**: categories and items (includes add/edit/delete and availability)
- **Orders**: order creation/updates, billing/KOT hooks
- **KOTs**: kitchen ticket lifecycle
- **Inventory**: stock and adjustments
- **Customers**: CRM and loyalty
- **Reports**: sales/items/payments/forecast
- **Aggregators**: mocked Zomato/Swiggy order ingestion and status actions

## 13) API route map (summary)

All routes are under `/api`.

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET/POST /outlets`
- `GET/PUT /outlets/:outletId`
- `GET /outlets/:outletId/dashboard`
- `GET/PUT /outlets/:outletId/settings`
- `GET/POST/PUT/DELETE /outlets/:outletId/staff`
- `GET/POST/PUT/DELETE /outlets/:outletId/tables`
- `GET/POST/PUT/DELETE /outlets/:outletId/categories`
- `GET/POST/PUT/DELETE /outlets/:outletId/menu-items`
- `GET/POST/PUT /outlets/:outletId/orders`
- `GET/PUT /outlets/:outletId/kots`
- `GET/POST/PUT/DELETE /outlets/:outletId/inventory`
- `POST /outlets/:outletId/inventory/:itemId/adjust`
- `GET/POST/PUT /outlets/:outletId/customers`
- `POST /outlets/:outletId/customers/:custId/loyalty`
- `GET /outlets/:outletId/reports/{sales|items|payments|forecast}`
- Aggregator endpoints under `/outlets/:outletId/aggregators/*`

## 14) Frontend notes

- React Query is used for API data lifecycle.
- Auth and outlet selection are maintained in app contexts.
- Navigation and route access are filtered by role permissions.
- Header supports outlet switching (persisted active outlet).

## 15) Demo users

- `owner@tabio.com / demo1234`
- `manager@tabio.com / demo1234`
- `cashier@tabio.com / demo1234`
- `kitchen@tabio.com / demo1234`

## 16) Troubleshooting

- `DATABASE_URL must be set`:
  - Ensure `.env` exists at root and contains a valid PostgreSQL connection string.
- Vite proxy `ECONNREFUSED`:
  - API server is not running on `PORT` (`3001` by default).
- Auth 401 after login:
  - Verify token persistence in local storage and API session validity.
- Typecheck failures in generated code:
  - Re-run `pnpm --filter @workspace/api-spec codegen` and re-typecheck.

## 17) Roadmap reference

For multi-user + multi-restaurant execution phases and planned modules, see:

- `MULTI_TENANT_EXECUTION_PLAN.md`

## 18) License

Repository currently declares `MIT` in root package metadata.
