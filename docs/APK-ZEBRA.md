# APK Android pentru Zebra — ghid

Aplicația WMS este un PWA complet, cu **toate funcțiile** (recepție, expediere, transfer,
comenzi, paleți, locații, produse, rapoarte, scanare). Din el generezi un APK instalabil
pe dispozitivele Zebra Android. APK-ul deschide exact aplicația live — deci orice actualizare
pe server apare automat și în APK, fără reinstalare.

URL aplicație: `https://wms.catalincherciu90.workers.dev`

## 1. Generează APK-ul cu PWABuilder (fără cod, ~5 min)

1. Intră pe **https://www.pwabuilder.com**
2. Lipește URL-ul aplicației și apasă **Start**
3. Apasă **Package for stores → Android**
4. Lasă „**Signed APK**" (sau descarcă și `.aab` dacă vrei Play Store). Notează / salvează
   fișierul **signing key** (`.keystore`) și parola — îți trebuie la actualizări viitoare.
5. Descarcă pachetul → conține `app-release-signed.apk`
6. Copiază `.apk` pe dispozitivul Zebra și instalează-l (permite „surse necunoscute").

### (Opțional) Ascunde bara de adrese
PWABuilder îți dă un `assetlinks.json` cu un **fingerprint SHA-256** și numele pachetului.
Ca aplicația să ruleze fără bara de browser (mod „app curat"):
- În Cloudflare → Worker `wms` → **Settings → Variables**, adaugă:
  - `TWA_PACKAGE` = numele pachetului (ex: `ro.wsd.wms`)
  - `TWA_FINGERPRINT` = fingerprint-ul SHA-256 (îl copiezi din PWABuilder; poți pune mai multe separate prin virgulă)
- Site-ul servește automat `/.well-known/assetlinks.json` cu aceste valori.

## 2. Configurează scanner-ul laser pe Zebra (DataWedge)

Aplicația acceptă **două moduri de scanare**:
- **Camera** (butonul 📷) — merge pe orice telefon.
- **Laserul Zebra** (recomandat pe terminal) — prin DataWedge, în mod „Keystroke".

Setare DataWedge (pe Zebra):
1. Deschide **DataWedge** → profilul folosit (sau `Profile0 (default)`).
2. **Barcode input** → activat.
3. **Keystroke output** → activat.
4. La **Basic data formatting**:
   - „Send ENTER key" / „Send TAB or ENTER" = **Enter** (obligatoriu — așa se declanșează căutarea).
5. Gata. Când scanezi:
   - dacă ești într-un câmp (Recepție/Expediere/„+ Produs") → codul intră direct acolo + Enter → se caută;
   - dacă nu ești în niciun câmp → aplicația prinde scanarea global și deschide direct produsul/locația.

## 3. Cum se folosește

- **Recepție / Expediere / Transfer**: intri în ecran, scanezi (laser sau 📷), alegi locația/cantitatea → confirmi.
- **Etichete raft (QR)**: la „Locații" ai buton **▦ QR** — le tipărești și le lipești pe raft;
  scanând eticheta, terminalul deschide direct stocul din raftul respectiv.
- **Produse**: la „+ Produs" scanezi EAN-ul direct în câmp.

## Note
- APK-ul necesită conexiune la internet (deschide aplicația live). Datele sunt mereu la zi.
- Pentru actualizări majore de icon/nume, regenerezi APK-ul cu **același keystore**.
- Verifică versiunea live oricând la `…/health` (`"version"`).
