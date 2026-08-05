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
    ]);
  } catch (e) { /* tabelele există deja */ }

  // adaugă coloana products.client_id dacă lipsește (ALTER aruncă dacă există deja)
  try {
    await env.DB.prepare('ALTER TABLE products ADD COLUMN client_id INTEGER').run();
  } catch (e) { /* coloana există deja */ }

  ready = true;
}
