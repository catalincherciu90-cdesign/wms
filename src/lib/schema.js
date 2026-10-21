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
    // cutii cu cod de bare propriu (generat de noi) pentru cutiile fără cod
    "CREATE TABLE IF NOT EXISTS boxes (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, pallet_id INTEGER, product_id INTEGER, quantity INTEGER NOT NULL DEFAULT 0, lot TEXT, created_by INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    // produse NOI anunțate de client la aprovizionare — nu sunt încă produse reale;
    // se transformă în produse (cu EAN) la recepție, în depozit.
    "CREATE TABLE IF NOT EXISTS order_new_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, name TEXT NOT NULL, barcode TEXT, quantity INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    // gestiuni / depozite: fiecare grupează locații; stocul gestiunii = suma inventarului din locațiile ei
    "CREATE TABLE IF NOT EXISTS warehouses (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT NOT NULL, notes TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)",
    "CREATE TABLE IF NOT EXISTS backup_log (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')), kind TEXT, status TEXT, bytes INTEGER DEFAULT 0, statements INTEGER DEFAULT 0, note TEXT)",
    "CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL DEFAULT 0, unit TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS order_services (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, service_id INTEGER, name TEXT NOT NULL, price REAL NOT NULL DEFAULT 0, quantity REAL NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS offers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, client_id INTEGER, recipient_name TEXT, recipient_contact TEXT, status TEXT NOT NULL DEFAULT 'draft', vat_rate REAL NOT NULL DEFAULT 0, note TEXT, valid_until TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS offer_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, offer_id INTEGER NOT NULL, name TEXT NOT NULL, price REAL NOT NULL DEFAULT 0, quantity REAL NOT NULL DEFAULT 1)",
    // CMR (scrisoare de transport): câmpurile formularului în JSON (`data`) + câteva coloane indexate
    "CREATE TABLE IF NOT EXISTS cmrs (id INTEGER PRIMARY KEY AUTOINCREMENT, series TEXT NOT NULL DEFAULT 'WSD', number INTEGER NOT NULL, order_id INTEGER, consignee_name TEXT, data TEXT, created_by INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
    // Configurații de ambalare per produs (loturi cu nr./cantitate diferită de cutii).
    "CREATE TABLE IF NOT EXISTS pack_configs (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, name TEXT, pcs_per_inner INTEGER NOT NULL, inner_per_master INTEGER, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
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
  try { await env.DB.prepare('ALTER TABLE print_jobs ADD COLUMN lot TEXT').run(); } catch (e) {} // lot pe eticheta trimisă la print
  try { await env.DB.prepare('ALTER TABLE pallet_items ADD COLUMN boxes INTEGER').run(); } catch (e) {} // nr. cutii
  try { await env.DB.prepare('ALTER TABLE pallet_items ADD COLUMN per_box INTEGER').run(); } catch (e) {} // buc/cutie
  try { await env.DB.prepare('ALTER TABLE products ADD COLUMN client_id INTEGER').run(); } catch (e) {}
  // Ambalare pe niveluri: câte bucăți are o cutie mică și câte cutii mici are o cutie mare.
  try { await env.DB.prepare('ALTER TABLE products ADD COLUMN pcs_per_inner INTEGER').run(); } catch (e) {} // buc / cutie mică
  try { await env.DB.prepare('ALTER TABLE products ADD COLUMN inner_per_master INTEGER').run(); } catch (e) {} // cutii mici / cutie mare
  // Lot + data efectivă (ex: data de pe aviz) pe fiecare mișcare de stoc — trasabilitate.
  try { await env.DB.prepare('ALTER TABLE stock_movements ADD COLUMN lot TEXT').run(); } catch (e) {}
  try { await env.DB.prepare('ALTER TABLE stock_movements ADD COLUMN eff_date TEXT').run(); } catch (e) {}
  // Cod de bare separat pentru bax (cartonul) + câte bucăți are un bax.
  try { await env.DB.prepare('ALTER TABLE products ADD COLUMN bax_barcode TEXT').run(); } catch (e) {}
  try { await env.DB.prepare('ALTER TABLE products ADD COLUMN bax_qty INTEGER').run(); } catch (e) {}
  // Niveluri de ambalare declarate (bifate): are bax (cutie mare) / are cutie (cutie mică).
  // Sistemul generează cod de bare propriu DOAR pentru bax; cutia poartă codul produsului.
  try { await env.DB.prepare('ALTER TABLE products ADD COLUMN has_bax INTEGER NOT NULL DEFAULT 0').run(); } catch (e) {}
  try { await env.DB.prepare('ALTER TABLE products ADD COLUMN has_inner INTEGER NOT NULL DEFAULT 0').run(); } catch (e) {}
  // Comandă în unități (paleți/baxuri/cutii): unitatea aleasă + câte, pentru afișare.
  try { await env.DB.prepare('ALTER TABLE order_lines ADD COLUMN uom TEXT').run(); } catch (e) {}
  try { await env.DB.prepare('ALTER TABLE order_lines ADD COLUMN uom_qty INTEGER').run(); } catch (e) {}
  // Cutii fizice pe niveluri: cutie mare (master) / cutie mică (inner), ierarhie + plasare pe locație.
  try { await env.DB.prepare("ALTER TABLE boxes ADD COLUMN kind TEXT NOT NULL DEFAULT 'inner'").run(); } catch (e) {}
  try { await env.DB.prepare('ALTER TABLE boxes ADD COLUMN parent_id INTEGER').run(); } catch (e) {}
  try { await env.DB.prepare('ALTER TABLE boxes ADD COLUMN location_id INTEGER').run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE boxes ADD COLUMN status TEXT NOT NULL DEFAULT 'stored'").run(); } catch (e) {}
  try { await env.DB.prepare('ALTER TABLE locations ADD COLUMN capacity INTEGER NOT NULL DEFAULT 0').run(); } catch (e) {}
  try { await env.DB.prepare('ALTER TABLE locations ADD COLUMN warehouse_id INTEGER').run(); } catch (e) {} // gestiunea/depozitul de care aparține locația
  // gestiune implicită „Depozit principal" — o singură dată; asignăm locațiile fără gestiune
  try {
    const w = await env.DB.prepare('SELECT COUNT(*) AS n FROM warehouses').first();
    if (w && Number(w.n) === 0) {
      await env.DB.prepare("INSERT INTO warehouses (code, name, active) VALUES ('G1', 'Depozit principal', 1)").run();
      const def = await env.DB.prepare('SELECT id FROM warehouses ORDER BY id LIMIT 1').first();
      if (def) await env.DB.prepare('UPDATE locations SET warehouse_id = ? WHERE warehouse_id IS NULL').bind(def.id).run();
    }
  } catch (e) {}

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
    // stoc tampon: locația unde marfa e pregătită (rezervată) până pleacă din depozit
    'prepared_location_id INTEGER',
    // aprovizionare (comenzi de intrare din portal): data estimată de sosire + originea
    'expected_date TEXT',
    'origin TEXT',
    'sender_contact TEXT', // contact expeditor (nume/telefon)
    'awb TEXT',            // nr. aviz / AWB
    'processed_by INTEGER',     // cine a procesat (pregătit/recepționat) comanda
    'processed_by_name TEXT',   // numele procesatorului (pentru afișare)
    'processed_at TEXT',        // când a fost procesată
  ];
  for (const col of orderCols) {
    try { await env.DB.prepare('ALTER TABLE orders ADD COLUMN ' + col).run(); } catch (e) {}
  }

  // date de firmă pentru clienți (CUI, Nr. Reg. Com., adresă)
  const clientCols = ['cui TEXT', 'reg_com TEXT', 'address TEXT'];
  for (const col of clientCols) {
    try { await env.DB.prepare('ALTER TABLE clients ADD COLUMN ' + col).run(); } catch (e) {}
  }

  // ── Migrare critică: tabela `orders` a fost creată cu CHECK(status IN
  // ('draft','confirmed','completed','cancelled')) — FĂRĂ 'prepared'. Fluxul
  // „stoc tampon" (Pregătită) are nevoie de status='prepared', iar SQLite nu
  // permite modificarea unui CHECK prin ALTER → reconstruim tabela fără CHECK rigid.
  // order_lines are ON DELETE CASCADE spre orders, deci îl salvăm și-l restaurăm
  // ca să nu se piardă liniile dacă ștergerea tabelei vechi declanșează cascada.
  try {
    // Recuperare: dacă o migrare anterioară a căzut între DROP și RENAME,
    // `orders` lipsește dar `orders_rebuild` există → redenumim înapoi.
    try {
      const o = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'").first();
      const reb = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders_rebuild'").first();
      if (!o && reb) await env.DB.prepare('ALTER TABLE orders_rebuild RENAME TO orders').run();
    } catch (e) {}

    const row = await env.DB.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'").first();
    const ddl = (row && row.sql) || '';
    // extrage DOAR lista din CHECK-ul pe status (ca să nu dăm fals-pozitiv pe
    // coloana `prepared_location_id`, care conține cuvântul „prepared").
    const chk = ddl.match(/CHECK\s*\(\s*status\s+IN\s*\(([^)]*)\)/i);
    if (chk && !/'prepared'/i.test(chk[1])) {
      const info = await env.DB.prepare('PRAGMA table_info(orders)').all();
      const cols = info.results || [];
      const names = cols.map((c) => '"' + c.name + '"').join(', ');
      const defs = cols.map((c) => {
        if (c.pk && /INT/i.test(c.type || '')) return '"' + c.name + '" INTEGER PRIMARY KEY';
        let d = '"' + c.name + '" ' + (c.type || 'TEXT');
        if (c.notnull) d += ' NOT NULL';
        if (c.dflt_value != null) d += ' DEFAULT (' + c.dflt_value + ')';
        return d;
      }).join(', ');

      await env.DB.prepare('PRAGMA foreign_keys=OFF').run();
      await env.DB.prepare('DROP TABLE IF EXISTS order_lines_bak').run();
      await env.DB.prepare('DROP TABLE IF EXISTS orders_rebuild').run();
      // backup linii (în caz că ștergerea tabelei vechi declanșează cascada)
      await env.DB.prepare('CREATE TABLE order_lines_bak AS SELECT * FROM order_lines').run();
      // tabelă nouă, aceleași coloane, fără CHECK pe status
      await env.DB.prepare('CREATE TABLE orders_rebuild (' + defs + ')').run();
      await env.DB.prepare('INSERT INTO orders_rebuild (' + names + ') SELECT ' + names + ' FROM orders').run();
      await env.DB.prepare('DROP TABLE orders').run();
      await env.DB.prepare('ALTER TABLE orders_rebuild RENAME TO orders').run();
      // restaurează liniile eventual șterse de cascadă
      await env.DB.prepare('INSERT INTO order_lines (' +
        '"id","order_id","product_id","quantity","qty_done") ' +
        'SELECT "id","order_id","product_id","quantity","qty_done" FROM order_lines_bak ' +
        'WHERE "id" NOT IN (SELECT "id" FROM order_lines)').run();
      await env.DB.prepare('DROP TABLE IF EXISTS order_lines_bak').run();
      // indexuri
      await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_code ON orders(code)').run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type)').run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)').run();
      await env.DB.prepare('PRAGMA foreign_keys=ON').run();
    }
  } catch (e) { /* dacă migrarea eșuează, nu blocăm pornirea */ }

  ready = true;
}
