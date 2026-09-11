// Migrare automată la runtime (idempotentă) — creează tabelele noi și coloana
// products.client_id pe o bază existentă, fără intervenție manuală.
let ready = false;

export async function ensureSchema(env) {
  if (ready) return;
  // Creăm fiecare tabel separat — dacă unul eșuează, restul tot se creează
  // (un batch e atomic: o singură eroare ar anula crearea tuturor, inclusiv client_users).
  const tables = [
    "CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS client_users (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS barcode_cache (code TEXT PRIMARY KEY, name TEXT, brand TEXT, category TEXT, source TEXT, created_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS pallets (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, client_id INTEGER, location_id INTEGER, status TEXT NOT NULL DEFAULT 'stored', notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS pallet_items (id INTEGER PRIMARY KEY AUTOINCREMENT, pallet_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS aviz_files (id INTEGER PRIMARY KEY AUTOINCREMENT, pallet_id INTEGER NOT NULL, name TEXT, mime TEXT, data TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS print_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL DEFAULT 'pallet', ref_id INTEGER, code TEXT, title TEXT, status TEXT NOT NULL DEFAULT 'pending', created_by INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')), printed_at TEXT)",
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)",
    "CREATE TABLE IF NOT EXISTS backup_log (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')), kind TEXT, status TEXT, bytes INTEGER DEFAULT 0, statements INTEGER DEFAULT 0, note TEXT)",
    "CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL DEFAULT 0, unit TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS order_services (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, service_id INTEGER, name TEXT NOT NULL, price REAL NOT NULL DEFAULT 0, quantity REAL NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS offers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, client_id INTEGER, recipient_name TEXT, recipient_contact TEXT, status TEXT NOT NULL DEFAULT 'draft', vat_rate REAL NOT NULL DEFAULT 0, note TEXT, valid_until TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS offer_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, offer_id INTEGER NOT NULL, name TEXT NOT NULL, price REAL NOT NULL DEFAULT 0, quantity REAL NOT NULL DEFAULT 1)",
  ];
  for (const sql of tables) {
    try { await env.DB.prepare(sql).run(); } catch (e) { /* există deja */ }
  }

  // coloane noi (ALTER aruncă dacă există deja)
  try { await env.DB.prepare('ALTER TABLE users ADD COLUMN login_token TEXT').run(); } catch (e) {} // conectare rapidă prin QR
  try { await env.DB.prepare('ALTER TABLE pallets ADD COLUMN colete INTEGER').run(); } catch (e) {} // nr. colete pe palet
  try { await env.DB.prepare('ALTER TABLE pallets ADD COLUMN lot TEXT').run(); } catch (e) {} // număr de lot
  try { await env.DB.prepare("ALTER TABLE pallets ADD COLUMN kind TEXT NOT NULL DEFAULT 'palet'").run(); } catch (e) {} // palet | colet
  try { await env.DB.prepare('ALTER TABLE pallets ADD COLUMN aviz TEXT').run(); } catch (e) {} // nr. aviz
  try { await env.DB.prepare('ALTER TABLE pallets ADD COLUMN received_at TEXT').run(); } catch (e) {} // data recepției (de pe aviz)
  try { await env.DB.prepare('ALTER TABLE pallet_items ADD COLUMN boxes INTEGER').run(); } catch (e) {} // nr. cutii
  try { await env.DB.prepare('ALTER TABLE pallet_items ADD COLUMN per_box INTEGER').run(); } catch (e) {} // buc/cutie
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
    // blocare comandă „în procesare" — cine o procesează acum (lock cu heartbeat)
    'locked_by INTEGER',
    'locked_name TEXT',
    'locked_at TEXT',
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
