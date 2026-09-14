# D'Amazon Cafe POS — MVP

A premium, fast, role-based Point of Sale and cafe management system, built as the
first working milestone toward the full spec. This MVP is a complete, working
system — not a mockup — covering the core loop a cafe runs on every day: sign in,
take orders, run the kitchen queue, take payment, manage tables, and close the day
with a real reconciled report.

*Taste the Wild. Savor the Moment.* 🦜

## What's in this MVP

- **Auth & roles** — JWT login, three roles (Admin / Manager / Cashier) with
  server-enforced permissions. Discounts, voids, and refunds require Manager/Admin.
- **POS screen** — category tabs, live search (name/SKU/barcode), product grid,
  configurable modifiers (e.g. Coffee: Large/Extra Shot/Oat Milk; Burger: Extra
  Cheese/No Onion), smart cart, dine-in table selection, takeaway/delivery/pickup.
- **Checkout** — Cash / Card / QR / E-Wallet / Bank Transfer / Other, cash quick-
  amount buttons, automatic change calculation, printable receipt.
- **Order lifecycle** — DAC-###### numbering, kitchen status flow
  (New → Confirmed → Preparing → Ready → Completed), void & refund with required
  reason (audit-logged), per-order discounts.
- **Tables** — visual floor plan with live status (Available/Occupied/Reserved/
  Cleaning), tap-through to the active order.
- **Products & Categories** — full CRUD, stock tracking with low-stock threshold,
  tax rate, cost price (for gross profit), modifier groups.
- **Dashboard** — today's sales/orders/items/AOV/gross profit/net profit, sales by
  hour, payment breakdown, category performance, top products, low-stock alerts,
  recent orders.
- **End-of-Day Closing** — the full reconciled report: sales summary, item-by-item
  sales grouped by category, payment breakdown, cash reconciliation (expected vs
  counted, required variance reason), per-cashier shift report, top products, open-
  order warnings before close, and a locked/frozen snapshot once closed (can't be
  silently re-closed or edited). New orders are blocked once a business date has
  been closed, so nothing lands in a locked day by accident.
- **Expenses** — logged by category, feed into net profit on the dashboard.
- **Audit log** — every discount, void, refund, payment, and day-close is recorded
  with who/when/what.
- **Settings** — cafe info, currency (defaults to RM/MYR), tax rate, service
  charge, receipt footer.
- **Dark/light mode**, responsive layout (desktop, tablet, POS touchscreen sizes).

## Deliberately deferred to the next iteration

To ship a solid, tested core instead of a shallow pass at all 40 spec sections,
these were left out of this MVP (the architecture — database schema, API
structure — already has room for them):

- Kitchen Display System as its own dedicated big-screen view (today, kitchen
  staff use the same Orders screen to advance status — functionally equivalent,
  visually not yet KDS-styled).
- Recipe/ingredient-level inventory deduction (stock tracking exists per product;
  per-ingredient recipes do not yet).
- Loyalty points redemption & tiers (points accrue on completed orders; no
  redemption flow yet).
- Coupon codes, BOGO/combo/happy-hour promo rules (manual discount exists; rule-
  based promos do not).
- Wastage tracking as its own report.
- PDF/Excel/CSV export of reports (closing/dashboard print via the browser's
  print dialog today).
- Smart recommendations ("customers who order X also order Y").
- Offline mode / sync.
- Multi-branch/terminal support.

## Tech stack

- **Backend:** Node.js + Express, plain SQL via `pg` (node-postgres) — no ORM
  binary engine to install, so it runs anywhere Postgres runs. JWT auth, bcrypt
  password hashing. All money math is done in integer cents to avoid rounding
  errors.
- **Frontend:** React + Vite + Tailwind CSS, React Router, Recharts for charts,
  lucide-react for icons.
- **Database:** PostgreSQL.

## Project structure

```
damazon-pos/
  server/               Express API
    src/
      db/
        schema.sql      Full DB schema (plain SQL)
        migrate.js       Applies schema.sql (idempotent)
        seed.js           Sample D'Amazon Cafe catalog + demo users
        pool.js
      routes/            One file per resource (auth, products, orders, closing, ...)
      lib/                Shared helpers (money math, order numbering, order totals,
                           closing report builder, business-date/timezone, audit log)
      middleware/auth.js  JWT verification + role guard
      index.js            App entrypoint
  client/               React app
    src/
      pages/             One file per screen
      components/        Reusable UI (CartPanel, CheckoutModal, ModifierModal, ...)
      context/            Auth, Settings, Theme, Toast
      lib/                API client, cart math
```

## Local setup

Prerequisites: Node 18+, PostgreSQL 14+ running locally (or a connection string
to any Postgres instance).

### 1. Backend

```bash
cd server
cp .env.example .env
# edit .env: set DATABASE_URL to your Postgres connection string,
# and JWT_SECRET to a long random string
npm install
npm run migrate     # creates all tables
npm run seed        # loads the D'Amazon Cafe sample menu + demo staff accounts
npm run dev          # starts the API on http://localhost:4000
```

### 2. Frontend

```bash
cd client
cp .env.example .env   # VITE_API_URL defaults to http://localhost:4000/api
npm install
npm run dev             # starts the app on http://localhost:5173
```

### Demo accounts (created by the seed script)

| Role     | Username  | Password    |
|----------|-----------|-------------|
| Admin    | admin     | admin123    |
| Manager  | manager   | manager123  |
| Cashier  | cashier1  | cashier123  |
| Cashier  | cashier2  | cashier123  |

**Change these before going live** — the Staff screen (Admin) lets you create
real accounts and disable the demo ones.

## Deploying to Railway

You already host the D'Amazon Cafe website and ordering system on Railway, so
this fits the same workflow:

1. **Add a PostgreSQL plugin** to your Railway project — it injects `DATABASE_URL`
   automatically into services in the same project.
2. **Deploy `server/` as a service.** Set env vars `JWT_SECRET` (long random
   string) and `CORS_ORIGIN` (your client's deployed URL). Railway sets `PORT`
   automatically — the server already reads it. Run `npm run migrate && npm run
   seed` once (Railway's shell, or a one-off deploy command) to initialize the
   database, then `npm start`.
3. **Deploy `client/` as a static site** (or a second Node service running
   `npm run build` then serving `client/dist`). Set `VITE_API_URL` to your
   deployed server's `/api` URL at build time.
4. Point a subdomain at the client (e.g. `pos.damazoncafe.com`) and keep the
   existing site/ordering system on its current domain — they can run side by
   side as separate services in the same Railway project.

## Notes on correctness (why these choices)

- **Money as integer cents:** every calculation (subtotal, tax, discount, change)
  is done in cents internally, then formatted to 2 decimals for storage/display —
  this avoids the classic floating-point rounding bugs in POS systems.
- **Server-authoritative pricing:** the client cart is for speed/UX only; every
  price, tax, and modifier cost is re-fetched and recalculated server-side when an
  order is created or edited, so a tampered client request can't undercharge.
- **Closed-day protection:** once a business date is closed, the closing report is
  frozen (stored as a JSON snapshot, immune to later product-price edits) and new
  orders for that date are rejected — matching the spec's requirement that closed
  days can't be silently modified.
- **Every sensitive action is audited:** discounts, voids, refunds, payments, and
  day-closes all write to the audit log with the acting user.

## What was tested

The full order lifecycle was exercised end-to-end in a real browser (Playwright)
against a real Postgres database before delivery: login for all three roles,
adding a modified product to cart, dine-in table assignment, cash checkout with
change calculation, order status advancement, manager discount approval, void/
refund controls, the dashboard's live charts, and generating + locking an actual
end-of-day closing report. Zero console errors across all screens, light and dark
mode.
