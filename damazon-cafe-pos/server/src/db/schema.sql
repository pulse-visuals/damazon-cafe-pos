-- D'Amazon Cafe POS — database schema (PostgreSQL)
-- Plain SQL (no ORM binary engine required) so it runs anywhere Postgres runs,
-- including Railway's Postgres plugin.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  username      text NOT NULL UNIQUE,
  email         text UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('ADMIN','MANAGER','CASHIER')) DEFAULT 'CASHIER',
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  icon       text,
  sort_order int NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  category_id       uuid NOT NULL REFERENCES categories(id),
  sku               text UNIQUE,
  barcode           text UNIQUE,
  price             numeric(10,2) NOT NULL,
  cost_price        numeric(10,2),
  tax_rate          numeric(5,2) NOT NULL DEFAULT 0,
  description       text,
  image_url         text,
  prep_time_minutes int,
  track_stock       boolean NOT NULL DEFAULT false,
  stock_qty         numeric(10,2),
  min_stock         numeric(10,2),
  available         boolean NOT NULL DEFAULT true,
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS modifier_groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  min_select int NOT NULL DEFAULT 0,
  max_select int NOT NULL DEFAULT 1,
  required   boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS modifier_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name        text NOT NULL,
  price_delta numeric(10,2) NOT NULL DEFAULT 0,
  sort_order  int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_modifier_options_group ON modifier_options(group_id);

CREATE TABLE IF NOT EXISTS product_modifier_groups (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_id   uuid NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, group_id)
);

CREATE TABLE IF NOT EXISTS tables (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label    text NOT NULL UNIQUE,
  capacity int NOT NULL DEFAULT 2,
  status   text NOT NULL CHECK (status IN ('AVAILABLE','OCCUPIED','RESERVED','CLEANING')) DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS customers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  phone          text UNIQUE,
  email          text,
  loyalty_points int NOT NULL DEFAULT 0,
  total_visits   int NOT NULL DEFAULT 0,
  total_spent    numeric(10,2) NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          text NOT NULL UNIQUE,
  type                  text NOT NULL CHECK (type IN ('DINE_IN','TAKEAWAY','DELIVERY','PICKUP')),
  status                text NOT NULL CHECK (status IN ('NEW','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED','REFUNDED')) DEFAULT 'NEW',
  table_id              uuid REFERENCES tables(id),
  guest_count           int,
  customer_id           uuid REFERENCES customers(id),
  cashier_id            uuid NOT NULL REFERENCES users(id),
  notes                 text,
  subtotal              numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount       numeric(10,2) NOT NULL DEFAULT 0,
  discount_reason       text,
  tax_amount            numeric(10,2) NOT NULL DEFAULT 0,
  service_charge_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount          numeric(10,2) NOT NULL DEFAULT 0,
  void_reason           text,
  voided_by_id          uuid REFERENCES users(id),
  business_date         text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_business_date ON orders(business_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_cashier ON orders(cashier_id);

CREATE TABLE IF NOT EXISTS order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES products(id),
  name_snapshot text NOT NULL,
  unit_price    numeric(10,2) NOT NULL,
  qty           int NOT NULL,
  notes         text,
  line_total    numeric(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id      uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_option_id uuid REFERENCES modifier_options(id),
  name_snapshot      text NOT NULL,
  price_delta        numeric(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_oim_order_item ON order_item_modifiers(order_item_id);

CREATE TABLE IF NOT EXISTS payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method         text NOT NULL CHECK (method IN ('CASH','CARD','QR','EWALLET','BANK_TRANSFER','OTHER')),
  amount         numeric(10,2) NOT NULL,
  cash_received  numeric(10,2),
  change_given   numeric(10,2),
  received_by_id uuid NOT NULL REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

CREATE TABLE IF NOT EXISTS shifts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id            uuid NOT NULL REFERENCES users(id),
  opened_at             timestamptz NOT NULL DEFAULT now(),
  closed_at             timestamptz,
  opening_cash          numeric(10,2) NOT NULL DEFAULT 0,
  closing_cash_expected numeric(10,2),
  closing_cash_actual   numeric(10,2),
  cash_variance         numeric(10,2),
  variance_reason       text,
  status                text NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS daily_closings (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_date          text NOT NULL UNIQUE,
  closed_by_id           uuid NOT NULL REFERENCES users(id),
  closed_at              timestamptz NOT NULL DEFAULT now(),
  gross_sales            numeric(10,2) NOT NULL,
  discounts              numeric(10,2) NOT NULL,
  refunds                numeric(10,2) NOT NULL,
  tax_total              numeric(10,2) NOT NULL,
  service_charge_total   numeric(10,2) NOT NULL,
  net_sales              numeric(10,2) NOT NULL,
  cash_expected          numeric(10,2) NOT NULL,
  cash_actual            numeric(10,2) NOT NULL,
  cash_variance          numeric(10,2) NOT NULL,
  variance_reason        text,
  total_orders           int NOT NULL,
  total_items_sold       int NOT NULL,
  payment_breakdown_json jsonb NOT NULL,
  category_summary_json  jsonb NOT NULL,
  item_sales_json        jsonb NOT NULL,
  cashier_summary_json   jsonb NOT NULL,
  top_products_json      jsonb NOT NULL,
  locked                 boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id),
  action      text NOT NULL,
  entity_type text,
  entity_id   text,
  details     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS expenses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_date  text NOT NULL,
  category       text NOT NULL,
  description    text,
  amount         numeric(10,2) NOT NULL,
  payment_method text,
  entered_by_id  uuid NOT NULL REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(business_date);

CREATE TABLE IF NOT EXISTS settings (
  id                  int PRIMARY KEY DEFAULT 1,
  cafe_name           text NOT NULL DEFAULT 'D''Amazon Cafe',
  tagline             text NOT NULL DEFAULT 'Taste the Wild. Savor the Moment.',
  logo_url            text,
  address             text,
  phone               text,
  email               text,
  currency            text NOT NULL DEFAULT 'MYR',
  currency_symbol     text NOT NULL DEFAULT 'RM',
  tax_rate            numeric(5,2) NOT NULL DEFAULT 0,
  service_charge_rate numeric(5,2) NOT NULL DEFAULT 0,
  receipt_footer      text NOT NULL DEFAULT 'Thank you for visiting D''Amazon Cafe!',
  next_order_seq      int NOT NULL DEFAULT 1,
  CONSTRAINT settings_singleton CHECK (id = 1)
);
