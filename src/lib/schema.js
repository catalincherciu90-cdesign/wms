// Migrare automată la runtime (idempotentă) — creează tabelele noi și coloana
// products.client_id pe o bază existentă, fără intervenție manuală.
let ready = false;

export async function ensureSchema(env) {
  if (ready) return;
  try {
    await env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS client_users (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS barcode_cache (code TEXT PRIMARY KEY, name TEXT, brand TEXT, category TEXT, source TEXT, created_at TEXT DEFAULT (datetime('now')))"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS pallets (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, client_id INTEGER, location_id INTEGER, status TEXT NOT NULL DEFAULT 'stored', notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS pallet_items (id INTEGER PRIMARY KEY AUTOINCREMENT, pallet_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL DEFAULT 0)"),
    ]);
  } catch (e) { /* tabelele există deja */ }

  // coloane noi (ALTER aruncă dacă există deja)
  try { await env.DB.prepare('ALTER TABLE products ADD COLUMN client_id INTEGER').run(); } catch (e) {}
  try { await env.DB.prepare('ALTER TABLE locations ADD COLUMN capacity INTEGER NOT NULL DEFAULT 0').run(); } catch (e) {}

  // comenzi din portal client: proprietar + destinatar final + sursă
  const orderCols = [
    'client_id INTEGER',
    "source TEXT",
    'recipient_name TEXT',
    'recipient_phone TEXT',
    'recipient_address TEXT',
    'recipient_city TEXT',
    'recipient_county TEXT',
    'recipient_postal TEXT',
  ];
  for (const col of orderCols) {
    try { await env.DB.prepare('ALTER TABLE orders ADD COLUMN ' + col).run(); } catch (e) {}
  }

  // date de firmă pentru clienți (CUI, Nr. Reg. Com., adresă)
  const clientCols = ['cui TEXT', 'reg_com TEXT', 'address TEXT'];
  for (const col of clientCols) {
    try { await env.DB.prepare('ALTER TABLE clients ADD COLUMN ' + col).run(); } catch (e) {}
  }

  ready = true;
}
