# WMS — Warehouse Management System

Sistem de gestiune a depozitului, construit pe **Cloudflare Workers + D1 (SQLite)**.
Interfață web inclusă (SPA vanilla, fără dependențe externe) servită direct de Worker.

## Funcționalități

### Etapa 1 — fundație
- 🔐 **Autentificare** cu JWT și roluri: `admin` / `operator` / `viewer`
- 📦 **Produse / SKU** — cod de bare, categorie, prag de reaprovizionare (reorder point)
- 🏬 **Locații** de depozit (zonă / raft / nivel)
- 📊 **Stoc** pe produs și pe locație, cu alertă „sub prag"
- ⬇️ **Recepție** (inbound) și ⬆️ **Expediere** (outbound)
- 🔁 **Transfer** între locații și **ajustări** de inventar
- 🧾 **Istoric mișcări** (audit trail complet)
- 📈 **Dashboard** cu KPI + grafic activitate (7 zile)
- 📤 **Export CSV** (produse, stoc)
- 👤 **Administrare utilizatori** (doar admin)

### Etapa 2 — comenzi, coduri de bare, rapoarte
- 🤝 **Parteneri** — furnizori & clienți (CRUD, filtrare)
- 📋 **Comenzi** inbound/outbound cu linii de comandă și status workflow
  (ciornă → confirmată → finalizată / anulată)
- ✅ **Fulfillment** — finalizarea unei comenzi generează automat mișcările de stoc
  (receiving pentru intrări, picking pentru ieșiri, cu verificare de stoc)
- ⌗ **Coduri de bare** — generator Code128 printabil + câmp de **scanare** la recepție/expediere
- 📊 **Rapoarte** — stoc pe categorie, produse sub prag (+ CSV), mișcări pe perioadă, top produse
- 📈 **Dashboard extins** — comenzi deschise, grafic pe categorie, comenzi recente, listă sub-prag

### Etapa 3 — coduri QR & scanare cu camera
- ▦ **Coduri QR** generate pe server (SVG, printabile) pentru **locații** și **produse**
- 🔗 **Deep-links** — QR-ul de locație (`#loc=A-01-01`) deschide direct stocul din raft;
  QR-ul de produs (`#sku=...`) deschide fișa produsului. Orice telefon devine terminal de depozit.
- 📷 **Scanare cu camera** direct în aplicație, **universal pe orice telefon/browser**
  (Android, iPhone, desktop) — decodor ZXing împachetat în app (fără CDN), încărcat lazy;
  scanează coduri de bare (Code128/EAN) + QR; buton global și la recepție/expediere
- 📍 **Vedere pe locație** (stocul din raft) și 🔎 **vedere pe produs** (stoc pe locații + mișcări)
- 🌐 **Identificare produs online** — la adăugarea unui produs, codul de bare (EAN/UPC) e căutat
  automat în baze publice (UPCitemdb + Open Food Facts) și completează numele + categoria

Roadmap (etape următoare): roluri granulare pe locație, integrare curieri,
notificări automate la stoc minim, aplicație mobilă dedicată.

## Arhitectură

```
src/
  index.js          Router + entry Worker
  ui.js             Interfața web (SPA) servită la /
  lib/
    http.js         Helpers JSON / CSV / CORS
    auth.js         JWT (HS256) + parole PBKDF2 (Web Crypto)
  routes/
    auth.js  products.js  locations.js  inventory.js  dashboard.js  users.js
schema.sql          Structura bazei D1
seed.sql            Date demo + cont admin
```

## Deploy pe Cloudflare (Workers Builds)

Repo-ul e conectat la Cloudflare prin **Workers Builds** (integrarea Git nativă),
care rulează comanda de deploy la fiecare push. Pași unici de configurare:

1. **Creează baza D1** (local, unde ești logat în Cloudflare):
   ```bash
   npx wrangler d1 create wms-db
   ```
   Copiază `database_id`-ul afișat în `wrangler.toml` (înlocuiește `PLACEHOLDER_DATABASE_ID`).
2. **Setează secret-ul JWT** (în contul Cloudflare):
   ```bash
   npx wrangler secret put JWT_SECRET
   ```
3. **Comanda de deploy în Workers Builds**: în dashboard-ul Cloudflare →
   Workers & Pages → proiectul `wms` → Settings → Build → *Deploy command*, setează:
   ```
   npm run deploy
   ```
   (rulează `predeploy` = migrarea schemei pe D1, apoi `wrangler deploy` — schema e
   idempotentă, deci se poate rula la fiecare deploy fără efecte secundare).
4. **Populează datele demo** o singură dată (local):
   ```bash
   npm run db:seed
   ```
5. **Push** → build-ul Workers Builds rulează automat. Worker-ul apare la
   `https://wms.<subdomeniul-tău>.workers.dev`.

> Alternativ, dacă preferi să nu schimbi comanda de deploy (rămâne `npx wrangler deploy`),
> rulează manual o singură dată `npm run db:init && npm run db:seed`, apoi push-ul doar
> deployează codul.

> Există și un workflow GitHub Actions (`.github/workflows/deploy.yml`) ca alternativă,
> dacă preferi deploy prin Actions în loc de Workers Builds — necesită secret-ul
> `CLOUDFLARE_API_TOKEN` în repo.

### Dezvoltare locală

```bash
npm install
npm run db:init:local
npm run db:seed:local
npm run dev            # http://localhost:8787
```

## Autentificare implicită (seed)

```
admin@wms.local / admin123
```
> ⚠️ Schimbă parola imediat după primul login (secțiunea Utilizatori).
