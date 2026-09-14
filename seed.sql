-- Date demo pentru WMS. Rulează DUPĂ schema.sql:  npm run db:seed
-- Cont admin implicit:  admin@wms.local / admin123  (schimbă parola după primul login!)

INSERT OR IGNORE INTO users (email, name, password_hash, role) VALUES
  ('admin@wms.local', 'Administrator', 'pbkdf2$100000$kKVLmgEn7zZjK6bDFZVxDw$jgiZx0fBsb3gRgX-0Rlf7OODt-zaI0iFdy79jPgZ4kI', 'admin');

INSERT OR IGNORE INTO products (sku, barcode, name, category, unit, reorder_point) VALUES
  ('SKU-1001', '5941000000011', 'Cutie carton 40x30x20', 'Ambalaje', 'buc', 50),
  ('SKU-1002', '5941000000028', 'Bandă adezivă 48mm', 'Consumabile', 'rola', 30),
  ('SKU-1003', '5941000000035', 'Folie stretch 500mm', 'Consumabile', 'rola', 20),
  ('SKU-2001', '5941000000042', 'Palet lemn EUR', 'Logistică', 'buc', 15),
  ('SKU-3001', '5941000000059', 'Mănuși protecție (set)', 'Protecție', 'set', 40);

INSERT OR IGNORE INTO locations (code, name, zone) VALUES
  ('A-01-01', 'Raft A1 nivel 1', 'A'),
  ('A-01-02', 'Raft A1 nivel 2', 'A'),
  ('B-02-01', 'Raft B2 nivel 1', 'B'),
  ('REC-01', 'Zonă recepție', 'Recepție'),
  ('EXP-01', 'Zonă expediere', 'Expediere');

INSERT OR IGNORE INTO partners (type, name, email, phone) VALUES
  ('supplier', 'Furnizor Ambalaje SRL', 'contact@ambalaje.ro', '0721000000'),
  ('customer', 'Client Retail SA', 'comenzi@retail.ro', '0731000000');

-- Stoc inițial + mișcări corespunzătoare
INSERT OR IGNORE INTO inventory (product_id, location_id, quantity) VALUES
  (1, 1, 120), (2, 1, 45), (3, 2, 60), (4, 3, 25), (5, 2, 18);

-- Mișcările se inserează o singură dată (idempotent prin marca STOC-INIT)
INSERT INTO stock_movements (product_id, location_id, type, quantity, reference, user_id)
SELECT * FROM (VALUES
  (1, 1, 'inbound', 120, 'STOC-INIT', 1),
  (2, 1, 'inbound', 45,  'STOC-INIT', 1),
  (3, 2, 'inbound', 60,  'STOC-INIT', 1),
  (4, 3, 'inbound', 25,  'STOC-INIT', 1),
  (5, 2, 'inbound', 18,  'STOC-INIT', 1)
) WHERE NOT EXISTS (SELECT 1 FROM stock_movements WHERE reference = 'STOC-INIT');
