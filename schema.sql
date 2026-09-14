-- WMS — schema D1 (SQLite)
-- Rulează cu: npm run db:init  (sau db:init:local pentru dev)

PRAGMA foreign_keys = ON;

-- ── Utilizatori & roluri ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','operator','viewer')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Produse / SKU ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sku          TEXT NOT NULL UNIQUE,
  barcode      TEXT UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT,
  unit         TEXT NOT NULL DEFAULT 'buc',
  reorder_point INTEGER NOT NULL DEFAULT 0,
  client_id    INTEGER,              -- proprietarul mărfii (NULL = intern / al companiei)
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_client ON products(client_id);

-- ── Clienți de depozitare (3PL) + conturile lor de portal ───────────────
CREATE TABLE IF NOT EXISTS clients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_client_users_client ON client_users(client_id);

-- ── Locații de depozit ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL UNIQUE,   -- ex: A-01-03 (zonă-raft-nivel)
  name       TEXT,
  zone       TEXT,
  capacity   INTEGER NOT NULL DEFAULT 0,  -- nr. de spații/capacitate (0 = nedefinit)
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Stoc: cantitate per produs + locație ────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  quantity    INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (product_id, location_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_product  ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location_id);

-- ── Mișcări de stoc (audit trail) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  type        TEXT NOT NULL CHECK (type IN ('inbound','outbound','adjust','transfer')),
  quantity    INTEGER NOT NULL,       -- pozitiv = intrare, negativ = ieșire
  reference   TEXT,                    -- ex: nr. document / comandă
  note        TEXT,
  user_id     INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements(created_at);

-- ── Parteneri: furnizori & clienți ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL CHECK (type IN ('supplier','customer')),
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  address    TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(type);

-- ── Comenzi (inbound de la furnizori / outbound către clienți) ──────────
CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('inbound','outbound')),
  partner_id  INTEGER REFERENCES partners(id),
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','completed','cancelled')),
  note        TEXT,
  user_id     INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_type   ON orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_lines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL,
  qty_done    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_lines_order ON order_lines(order_id);

-- ── Memorie proprie: cache identificări coduri de bare ──────────────────
-- (se creează și automat la runtime dacă lipsește)
CREATE TABLE IF NOT EXISTS barcode_cache (
  code       TEXT PRIMARY KEY,
  name       TEXT,
  brand      TEXT,
  category   TEXT,
  source     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Paleți: fiecare palet ocupă un spațiu într-o locație, aparține unui
--    client și conține produse (pallet_items). ────────────────────────────
CREATE TABLE IF NOT EXISTS pallets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,        -- eticheta paletului (LPN)
  client_id   INTEGER REFERENCES clients(id),
  location_id INTEGER REFERENCES locations(id),
  status      TEXT NOT NULL DEFAULT 'stored' CHECK (status IN ('draft','stored','shipped')),
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pallets_location ON pallets(location_id);
CREATE INDEX IF NOT EXISTS idx_pallets_client ON pallets(client_id);

CREATE TABLE IF NOT EXISTS pallet_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  pallet_id  INTEGER NOT NULL REFERENCES pallets(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pallet_items_pallet ON pallet_items(pallet_id);
