# Bjlive Travels and Bookings

Accommodation enquiries for Mombasa, Diani, Malindi, and Kisumu. The public site uses the existing HTML/CSS/vanilla JavaScript frontend and a small same-origin Node API. The local database is SQLite; no npm runtime dependencies are required.

## Run locally

1. Use Node.js 24 or newer.
2. Copy `.env.example` to `.env`.
3. Set `ADMIN_PASSWORD` to a unique password with at least 14 characters and `BOOKING_ACCESS_SECRET` to at least 32 random characters. Do not commit `.env` or send secrets in chat.
4. Run `npm run migrate` to apply the schema.
5. Run `npm run dev` and open `http://localhost:4173`.
6. Run `npm test` for API, booking, pricing, authentication, and form checks.

The SQLite database is created at `data/bjlive.sqlite` by default. Set `DATABASE_PATH` to change it. Set `PUBLIC_SITE_URL` to the production origin when deploying. Back up the database and `storage/property-images/` together. `npm run migrate:rollback` reverses the latest schema migration; back up persistent data before rolling back.

## Administrator

Open `/admin`, sign in with `ADMIN_PASSWORD`, and use the workspace to edit package price ranges, add or update property details, upload approved photos, manage blocked dates, and review booking requests. New properties are unpublished by default. Publish a listing only after its name, location, type, capacity, photos, description, amenities, and price have been confirmed. Booking requests can only be marked confirmed when the administrator enters an exact guest-agreed total within the original estimate range. Package rates can be edited in the same screen.

The initial database contains schema only and no property or booking records. No example inventory is inserted. Public listings appear after an administrator adds and publishes them.

Uploads are explicitly selected in the admin form, limited to JPEG/PNG/WebP and 4.5 MB per image, signature-checked, and stored under `storage/property-images/`. Only uploaded property images are served from `/uploads/properties/`. Keep that directory in protected backups; do not copy a whole phone photo library into it.

## Prices and booking requests

The built-in package card shows the business-provided starts and ranges per day:

| Accommodation type | Start | Supplied range |
| --- | ---: | ---: |
| Single room | KSh 2,000 | KSh 2,000–4,000 |
| Double room | KSh 2,500 | KSh 2,500–5,000 |
| BnB studio | KSh 3,000 | KSh 3,000–5,000 |
| One-bedroom accommodation | KSh 4,000 | KSh 4,000–5,000 |
| Two-bedroom accommodation | KSh 8,000 | KSh 8,000–10,000 |

A booking request calculates days as the check-out date minus check-in date, stores a pending request, returns a reference, and prevents duplicate submissions with an idempotency key. It is not a reservation. The admin must confirm exact property, price, and availability directly with the guest. Customer status access uses a 7-day HttpOnly cookie; only a hash of the per-request token is stored. `BOOKING_ACCESS_SECRET` must remain stable between restarts so existing customer request links keep working.

## M-Pesa

The Daraja adapter is implemented and verified with mocked provider responses only; no live or sandbox credentials were available, so no real payment was attempted. It supports OAuth, STK Push, provider status query, idempotency, and a secret-token callback route. A payment can start only for a privately accessed, administrator-confirmed booking with an exact total in its estimate range. A booking/payment status changes to succeeded only after the callback is authenticated and the provider query, receipt, amount, and customer phone match the stored attempt.

For sandbox testing, first obtain Daraja sandbox credentials and confirm the shortcode/passkey and transaction type with Safaricom. Configure `MPESA_ENV=sandbox`, `MPESA_TRANSACTION_TYPE` (`CustomerPayBillOnline` or `CustomerBuyGoodsOnline`), `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_TOKEN` (at least 32 random characters), and `MPESA_CALLBACK_URL` as the public URL ending in `/api/payments/mpesa/callback`. The server appends the callback token to that URL. Provide a reachable HTTPS callback host for production; the local callback cannot be reached by Safaricom. Test STK success, cancellation, timeout, duplicate callbacks, receipt reuse, wrong amount/phone, and network failure in sandbox before enabling live credentials.

For live M-Pesa, the business must complete Safaricom merchant onboarding/approval, obtain production keys and shortcode/passkey, register the exact public HTTPS callback URL, set `MPESA_ENV=production`, and protect/rotate secrets using the hosting platform’s secret manager. Do not advertise online payment until a real provider approval and end-to-end production-like test has passed. Bank payments are not implemented.

## Production deployment notes

This app currently targets a single Node process with a local SQLite file and in-memory admin sessions. Use a host with durable private disk, HTTPS termination, process supervision, and a backup/restore plan; do not deploy the SQLite file to ephemeral storage or multiple app instances. A horizontally scaled deployment should move data/session storage to managed PostgreSQL and shared session storage before launch. Set `NODE_ENV=production` so cookies use `Secure`; configure strong private `ADMIN_PASSWORD` and `BOOKING_ACCESS_SECRET` values; set `PUBLIC_SITE_URL`; and run migrations during release, not on each request. Admin login sessions reset when the process restarts.

Property inventory and exact prices remain business-managed data. Add only approved property photos and verified descriptions/amenities. The featured image at `images/hotel.jpg` is the supplied business image; confirm its visible signage is appropriate for the featured accommodation before publication.
