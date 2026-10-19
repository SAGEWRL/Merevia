# Bjlive Travels & Bookings Project Plan

**Status**: Integrated  
**Created**: 2026-10-19  
**Mode**: NEW

## Project Overview

Scope was explicitly expanded on 2026-10-19 to an accommodation enquiry/booking platform while continuing the existing website. Keep the existing HTML5/CSS3/vanilla JavaScript frontend and Node runtime. Add a same-origin Node API, SQLite persistence, schema migrations, protected admin workspace, published property search/details, booking requests, and a gated M-Pesa integration path. Do not create a separate app or seed demo properties.

Supported locations are Mombasa, Diani, Malindi, and Kisumu. The business supplied phone numbers 0735 109 066 and 0714 237 082, the accommodation categories and rates below, and the hotel photo stored at `images/hotel.jpg`. Do not invent properties, amenities, availability, reviews, awards, or a specific address. The supplied photo visibly contains medical-centre signage; retain it as provided but confirm that it is appropriate before publicly identifying it as a hotel.

## Implementation Scope

- Accommodation-first homepage with date/location/type/guest search, exact starting-price/range cards, verified published listings, locations, booking process, contact, and responsive mobile navigation.
- Public listing and property-details routes show approved fields and photos only. Unconfirmed property-specific rates are redacted from public API responses; public pages use the package range.
- Admin `/admin` is protected server-side by a configured password and HttpOnly session. Admin can manage listings/photos/amenities/blackout dates/package rates, review booking requests, enter the guest-agreed total, and view provider payment records.
- Booking requests validate location, type, property, dates, guests, phone/email, calculate check-out minus check-in, persist as `pending`, and use idempotency. A private HttpOnly request cookie grants status access. Requests are not reservations.
- Confirming a request requires an admin-entered exact total within the original estimate range. Date conflicts check manual blackout blocks and confirmed bookings; availability still requires business confirmation.
- M-Pesa server adapter supports OAuth, STK initiation, provider status queries, idempotency, and a token-protected callback that requires provider reconciliation. Actual sandbox/live calls remain unverified until credentials and external approval are supplied.
- User-selected JPEG/PNG/WebP property uploads are type-signature checked, limited to 4.5 MB, and stored under `storage/property-images/`. No personal photo directory is exposed.
- Reduced-motion behavior, semantic controls, accessible focus, responsive layouts, noindex admin page, `robots.txt`, generated sitemap, and branded 404.

## Business Accuracy

Confirmed for publication:

| Detail | Confirmed value |
| --- | --- |
| Business name | Bjlive Travels & Bookings |
| Location | Mombasa Airport Road, Kenya |
| Supported accommodation locations | Mombasa, Diani, Malindi, Kisumu |
| Phone/WhatsApp | 0735 109 066; 0714 237 082 |

Owner-supplied accommodation rates (per day): single room KSh 2,000 starting, range KSh 2,000–4,000; double room KSh 2,500, range KSh 2,500–5,000; BnB studio KSh 3,000, range KSh 3,000–5,000; one-bedroom KSh 4,000, range KSh 4,000–5,000; two-bedroom KSh 8,000, range KSh 8,000–10,000. Final property price depends on property/location/date and must be agreed before payment.

Do not invent property names, exact address/map pin, amenities, date availability, ratings, reviews, discounts, or email/hours/social accounts. New property inventory stays empty/unpublished until entered and verified by the administrator.

## Technology and Local Validation

| Concern | Choice |
| --- | --- |
| Frontend | Existing HTML5/CSS3 and vanilla JavaScript |
| Backend/API | Node.js built-in HTTP server, same-origin JSON API |
| Database | SQLite via Node `node:sqlite`, versioned SQL migrations in `migrations/` |
| Dependencies | No npm runtime dependencies |
| Local commands | `npm run migrate`, `npm run dev`, `npm test` |
| Environment | `.env.example`; secrets are local/server-side only |

No Azure service is configured. The current SQLite/in-memory-session architecture targets one Node instance with durable disk; production horizontal scale requires managed PostgreSQL and shared sessions.

## Project Structure

```text
.
├── .azure/
│   └── project-plan.md
├── images/hotel.jpg
├── migrations/                   # Schema only; no inventory rows
├── pages/                        # Public, admin, booking, and property pages
├── scripts/                      # Node API, SQLite migrations, browser clients
├── storage/property-images/       # Explicit property uploads; ignored by Git
├── styles/
├── tests/                         # API, booking, migration, and mocked Daraja tests
├── .env.example
├── index.html
├── package.json
└── README.md
```

## Acceptance Checks

- The homepage renders as a complete, responsive travel website and includes the requested sections.
- Package price starts/ranges match owner figures and unconfirmed exact property prices are not exposed publicly.
- No property or booking demo rows are inserted; public search has a useful empty state.
- Booking estimates, pending submission, duplicate protection, private customer status, and admin exact-total confirmation work.
- Admin controls require server auth; property upload/delete and availability blocks are protected.
- Payment status changes only through mocked-tested provider reconciliation; no real Daraja request is claimed until credentials/approval are configured.
- `npm test`, local route smoke checks, and mobile/tablet/desktop browser checks pass.

## Later Phases, Not Included

Not implemented: email/SMS notifications, bank payments, real Daraja sandbox/live verification, live property inventory/availability integrations, production PostgreSQL migration, public hosting/domain, operational backups/monitoring, and independent security review.

## Next Step

Continue validating the integrated app against the acceptance checks. Before public production use, configure private environment secrets, verify the photographed building’s business relevance, enter approved property records, choose durable hosting, and complete Safaricom sandbox and live approvals.
