# Integration Plan

## Frontend

- Project folder: workspace root
- Dev command: `npm run dev` (serves frontend and same-origin Node API at `http://localhost:4173`)
- Test command: `npm test`
- Frontend: existing HTML/CSS/vanilla JavaScript; API modules are `scripts/home.js`, `scripts/booking.js`, and `scripts/property.js`
- Mock files: none; public properties and prices load from live API routes/config
- Booking data: persisted in SQLite after customer submits a reviewed request; requests remain pending until admin confirms property, exact total, and availability
- Customer status: private HttpOnly booking-access cookie; token hash stored in SQLite

## Backend and Routes

- Backend: Node built-in HTTP API in `scripts/serve.js` + `scripts/api.js`
- Run command: `npm run dev`; `npm start` for production process manager
- Health: `GET /api/health`
- Public API: `GET /api/locations`, `GET /api/packages`, `GET /api/properties` (location/type/guests/date/price/sort filters), `GET /api/properties/:id-or-slug`, `POST /api/bookings`, `GET /api/bookings/:reference` (private cookie), `GET /api/payments/mpesa/config`
- Admin API: `/api/admin/session`, `/api/admin/login`, `/api/admin/logout`, property CRUD, property photos, date blocks, package price edits, booking list/status/exact-total updates, payment history
- Payment API: `POST /api/payments/mpesa` (confirmed-total STK start), `POST /api/payments/mpesa/callback?token=...` (provider query reconciliation)
- Document routes: `/`, `/booking`, `/contact`, `/admin`, `/properties/:slug`; unknown documents return branded 404
- SEO routes: `/robots.txt`, generated `/sitemap.xml`
- Static file access is restricted to public pages/scripts/styles/images and server-uploaded property images

## Database

- Database: SQLite using Node `node:sqlite`; one-process deployment with durable private disk
- Migration directory: `migrations/`; numbered SQL `up`/`.down` files
- Apply: `npm run migrate`; rollback latest: `npm run migrate:rollback`
- Default database: `data/bjlive.sqlite`; override with `DATABASE_PATH`
- Tables: `package_prices`, `properties`, `availability_blocks`, `booking_requests`, `payment_attempts`, `admin_audit_log`, migration metadata
- Inventory: no seed/sample property or booking records; package defaults are owner-supplied application config and admin edits are persisted
- Required local env: `ADMIN_PASSWORD` (14+ chars), `BOOKING_ACCESS_SECRET` (32+ random chars), optional `DATABASE_PATH`, `PORT`, `PUBLIC_SITE_URL`
- Payment env: `MPESA_ENV`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`, `MPESA_CALLBACK_TOKEN` (32+ random chars)
- Back up the database and `storage/property-images/` together; do not deploy SQLite to ephemeral storage or multiple instances

## Services

- Azure services: none configured
- External service: Safaricom Daraja adapter exists; only mocked tests have run. Real sandbox/live calls require credentials, public callback URL, business onboarding, and provider approval.

## Integration Constraints

- Do not create sample properties, bookings, payments, or testimonials.
- Booking requests are enquiries, not reservations. Never claim availability or payment success without verified business/provider confirmation.
- Public API omits unconfirmed property-specific prices; use supplied package ranges and label estimates.
- Payment status changes only after token-authenticated callback plus provider status query and matching receipt/amount/phone.
- Keep email, exact address/map pin, amenities, property descriptions, and availability absent until the business verifies them.

## Verification Snapshot

- `npm run migrate`: applied successfully to local SQLite.
- `npm test`: 18 tests passed, including schema rollbacks, API/admin/booking, and mocked Daraja lifecycle; no live credentials were used.
- Browser: tested live package loading, search empty state, admin property publish/detail route, booking estimate/submission/status, mobile layout, and configured-off payment state.
- Current property inventory: empty outside isolated in-memory browser verification; no demo records in the persistent local database.
