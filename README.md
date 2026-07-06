# WMS — Warehouse Management System

Sistem de gestiune a depozitului, construit pe **Cloudflare Workers + D1 (SQLite)**.
Interfață web inclusă (SPA vanilla, fără dependențe externe) servită direct de Worker.

## Funcționalități (Etapa 1)

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

Roadmap (etape următoare): scanare coduri de bare/QR, comenzi clienți/furnizori
cu picking, rapoarte avansate, dashboard cu mai multe grafice.

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

## Deploy pe Cloudflare (o singură configurare)

Aplicația se deployează **automat** la fiecare push pe `main`, prin GitHub Actions
(`.github/workflows/deploy.yml`). Pași unici de configurare în contul tău Cloudflare:

1. **Instalează dependențele** (local): `npm install`
2. **Creează baza D1**:
   ```bash
   npx wrangler d1 create wms-db
   ```
   Copiază `database_id`-ul afișat în `wrangler.toml` (înlocuiește `PLACEHOLDER_DATABASE_ID`).
3. **Setează secret-ul JWT**:
   ```bash
   npx wrangler secret put JWT_SECRET
   ```
4. **Adaugă token-ul API în GitHub**: repo → Settings → Secrets and variables → Actions →
   secret nou `CLOUDFLARE_API_TOKEN` (permisiuni: *Workers Scripts: Edit* + *D1: Edit*).
5. **Inițializează schema + datele demo**:
   ```bash
   npm run db:init     # creează tabelele (remote)
   npm run db:seed     # cont admin + date demo
   ```
6. **Push pe `main`** → deploy automat. Worker-ul rulează la
   `https://wms.<subdomeniul-tău>.workers.dev`.

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
