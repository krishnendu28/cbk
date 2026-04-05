# Tabio Multi-User & Multi-Restaurant Execution Plan

## Current Status (Completed)
- [x] Role-based route protection (frontend + backend)
- [x] Outlet-scoped API access checks
- [x] Secure outlet visibility by role (`owner` can view all active outlets; others limited to assigned outlet)
- [x] Frontend outlet switcher in app header
- [x] Active outlet persistence in local storage (`tabio_outlet_id`)

## Phase 2 — Multi-Outlet User Membership Model
- [ ] Introduce `outlet_memberships` data model (many outlets per user)
- [ ] Migrate staff APIs from `users.outletId` to membership records
- [ ] Add per-outlet role assignment for same user (e.g., manager in outlet A, cashier in outlet B)
- [ ] Add owner admin page for assigning/removing memberships
- [ ] Add backend middleware resolution of role by current outlet context

## Phase 3 — User-Side App + QR Ordering
- [ ] Public menu endpoint (outlet/table scoped)
- [ ] QR session/table token flow
- [ ] Customer order placement flow (dine-in and takeaway)
- [ ] Kitchen + POS live sync of customer-originated orders
- [ ] Customer order tracking page

## Phase 4 — Integrations & Commerce
- [ ] WhatsApp order ingestion (mock webhook + parser + order creation)
- [ ] Telegram bot ordering flow (mock polling/webhook)
- [ ] Coupon engine (fixed/percentage, rule-based constraints, usage caps)
- [ ] Payment integration abstraction + Razorpay mock/live adapter
- [ ] Webhook processing with signature verification + idempotency

## Phase 5 — Workforce + Payroll/Attendance
- [ ] Attendance check-in/out model and APIs
- [ ] Shift scheduling basics
- [ ] Attendance dashboard + late/absent summaries
- [ ] Payroll export-ready report

## Phase 6 — Franchise/Super Admin Layer
- [ ] Organization/franchise entity with outlet grouping
- [ ] Super admin dashboards (cross-outlet KPIs)
- [ ] Permission templates and inheritance
- [ ] Cross-outlet analytics and alerts

## Delivery Strategy
- Build and verify one phase at a time with typecheck + smoke tests.
- Keep all APIs outlet-scoped by default and role-guarded.
- Prefer mock adapters first, then switch to live integrations behind env flags.
