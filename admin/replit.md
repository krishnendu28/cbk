# Tabio POS - Platform Core

## Overview

Tabio is a restaurant POS & management platform core with real-time dashboard, POS billing, kitchen display, menu management, inventory, CRM, reports, role-based access control, and Zomato/Swiggy aggregator integrations.

**Tagline**: "Tabio – Intelligent POS for Restaurants: Seamless Orders, Smart Inventory, Unlimited Growth"

## Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React + Vite + TypeScript + Tailwind + shadcn/ui (artifacts/tabio)
- **Backend**: Express 5 API server (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (lib/db)
- **API Contract**: OpenAPI 3.1 + Orval codegen (lib/api-spec)
- **Charting**: Recharts
- **Animations**: Framer Motion

## Demo Credentials

- Owner: `owner@tabio.com` / `demo1234`
- Manager: `manager@tabio.com` / `demo1234`
- Cashier: `cashier@tabio.com` / `demo1234`
- Kitchen: `kitchen@tabio.com` / `demo1234`

## Structure

```
artifacts/
├── api-server/         # Express 5 API server
│   └── src/
│       ├── routes/     # All route handlers
│       │   ├── auth.ts         # Auth (login/logout/me)
│       │   ├── outlets.ts      # Outlets + Dashboard + Settings
│       │   ├── staff.ts        # Staff management
│       │   ├── tables.ts       # Table management
│       │   ├── menu.ts         # Menu categories + items
│       │   ├── orders.ts       # Orders + bill generation + KOT
│       │   ├── kots.ts         # Kitchen display KOTs
│       │   ├── inventory.ts    # Inventory management
│       │   ├── customers.ts    # CRM + loyalty points
│       │   ├── reports.ts      # Sales/items/payments/forecast reports
│       │   └── aggregators.ts  # Zomato/Swiggy mock integration
│       └── lib/
│           └── seed.ts         # Demo data seeding
├── tabio/              # React + Vite frontend
│   └── src/
│       ├── pages/      # All page components
│       ├── components/ # Shared components
│       └── lib/        # Context, utilities
lib/
├── api-spec/           # OpenAPI spec + Orval config
├── api-client-react/   # Generated React Query hooks
├── api-zod/            # Generated Zod schemas
└── db/                 # Drizzle schema + DB connection
    └── src/schema/
        ├── outlets.ts
        ├── users.ts
        ├── tables.ts
        ├── menu.ts
        ├── orders.ts
        ├── inventory.ts
        └── customers.ts
```

## Features

1. **Multi-outlet foundation** - Outlet-scoped data with 5 roles (Owner/Manager/Cashier/Kitchen/Waiter)
2. **Real-time Dashboard** - Live sales, charts, active orders, low-stock alerts
3. **Menu Management** - Categories, items, variants, add-ons, availability toggle
4. **POS & Billing** - 3-click flow, table management, split bills, discounts, PDF bills
5. **KOT System** - Kitchen display, station routing, status updates
6. **Order Management** - Dine-in, takeaway, delivery, aggregator orders
7. **Inventory** - Stock tracking, low-stock alerts, adjustments
8. **Reports & Analytics** - Sales, items, payments, AI demand forecast (7-day)
9. **CRM + Loyalty** - Customer profiles, loyalty points system
10. **Settings** - GST/tax config, aggregator keys, loyalty settings
11. **Zomato/Swiggy** - Mocked aggregator integrations with live order simulation and accept → internal order/KOT mapping
12. **Voice POS** - Web Speech API voice ordering
13. **Carbon Tracker** - Sustainability widget

## API Routes

All routes under `/api/`:
- `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- `GET/POST /outlets`, `GET/PUT /outlets/:outletId`
- `GET /outlets/:outletId/dashboard`
- `GET/PUT /outlets/:outletId/settings`
- `GET/POST/PUT/DELETE /outlets/:outletId/staff/:staffId`
- `GET/POST/PUT/DELETE /outlets/:outletId/tables/:tableId`
- `GET/POST/PUT/DELETE /outlets/:outletId/categories/:catId`
- `GET/POST/GET/PUT/DELETE /outlets/:outletId/menu-items/:itemId`
- `GET/POST /outlets/:outletId/orders`, `GET/PUT /outlets/:outletId/orders/:orderId`
- `POST /outlets/:outletId/orders/:orderId/bill`
- `POST /outlets/:outletId/orders/:orderId/kot`
- `GET /outlets/:outletId/kots`, `PUT /outlets/:outletId/kots/:kotId`
- `GET/POST/PUT/DELETE /outlets/:outletId/inventory/:itemId`
- `POST /outlets/:outletId/inventory/:itemId/adjust`
- `GET/POST/GET/PUT /outlets/:outletId/customers/:custId`
- `POST /outlets/:outletId/customers/:custId/loyalty`
- `GET /outlets/:outletId/reports/sales|items|payments|forecast`
- `GET/POST /outlets/:outletId/aggregators/zomato/orders`
- `POST /outlets/:outletId/aggregators/zomato/orders/:id/accept|reject`
- `GET/POST /outlets/:outletId/aggregators/swiggy/orders`
- `POST /outlets/:outletId/aggregators/swiggy/orders/:id/accept|reject`
- `POST /outlets/:outletId/aggregators/menu-sync`

## Environment Variables

```env
DATABASE_URL=          # PostgreSQL connection string
PORT=3001              # API server port for local dev
ZOMATO_API_KEY=        # Zomato partner API key (for live integration)
SWIGGY_API_KEY=        # Swiggy partner API key (for live integration)
```
