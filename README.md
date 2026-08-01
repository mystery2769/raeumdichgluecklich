# Räum dich glücklich – Website mit CMS

Astro-Website + Sveltia CMS. Die Kundin bearbeitet alle Texte und Bilder unter
`deine-domain.ch/admin`, speichert – und die Seite baut sich automatisch neu.

## Lokal arbeiten

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # Ergebnis landet in dist/
```

## Aufbau

```
src/data/*.json      ← ALLE Texte und Bildpfade (das bearbeitet die Kundin)
src/pages/*.astro       ← Struktur der 5 Seiten
src/layouts/Base.astro  ← Navigation, Fusszeile, <head>
src/components/         ← CTA-Balken, Bücherregal-Animation
src/styles/site.css     ← das komplette Design (1:1 aus der Originalseite)
public/uploads/         ← Bilder (die Kundin lädt neue hier hoch, über das CMS)
public/admin/           ← das CMS selbst
```

Design ändern → `src/styles/site.css`.
Text ändern → `src/data/*.json` oder eben im CMS.

Bei `ordnungPoints` und `zielText` (Seite Angebot) funktioniert `**fett**`.

Das CMS selbst ist in `public/admin/index.html` auf Sveltia CMS 0.111.0
festgenagelt. Zum Aktualisieren dort die Versionsnummer erhöhen.

---

# Einrichtung (einmalig, ca. 20 Minuten)

## 1. Auf GitHub laden

```bash
cd vanessa-cms
git init && git add -A && git commit -m "Website"
gh repo create raeum-dich-gluecklich --private --source=. --push
```

(Oder Repo von Hand auf github.com anlegen und pushen.)

## 2. Hostpoint-Zugangsdaten als GitHub-Secrets hinterlegen

Hostpoint kann kein `npm run build`. Darum baut GitHub Actions die Seite und
lädt nur das fertige `dist/` per FTPS hoch – siehe
`.github/workflows/deploy.yml`.

FTP-Zugangsdaten stehen im Hostpoint Control Panel unter **Hosting → FTP**.
Im GitHub-Repo unter **Settings → Secrets and variables → Actions → New
repository secret** vier Secrets anlegen:

| Secret | Wert |
| --- | --- |
| `FTP_SERVER` | z. B. `ftp.deine-domain.ch` |
| `FTP_USERNAME` | FTP-Benutzername von Hostpoint |
| `FTP_PASSWORD` | FTP-Passwort |
| `FTP_SERVER_DIR` | Zielordner **mit Schrägstrich am Ende**, z. B. `/www/` |

Den richtigen Zielordner im Control Panel oder per FTP-Programm prüfen: Es ist
der Ordner, in dem die Website ausgeliefert wird (bei Hostpoint je nach Setup
`www`, `public_html` oder ein Ordner mit dem Domainnamen).

Ab jetzt gilt: **jeder Push nach `main` deployt automatisch.** Ein Deploy lässt
sich auch von Hand starten unter *Actions → Build und Deploy zu Hostpoint → Run
workflow*.

## 3. Repo-Namen und Domain eintragen

In `public/admin/config.yml` ganz oben:

```yaml
repo: DEIN-GITHUB-NAME/raeum-dich-gluecklich
branch: main
```

Ausserdem dort `site_url` und `display_url` auf die echte Domain setzen, ebenso
`site` in `astro.config.mjs`. Danach committen und pushen.

## 4. Login für das CMS

Auf Hostpoint gibt es keinen OAuth-Dienst. Sveltia CMS bietet dafür
**«Sign In with GitHub Using PAT»** – Anmeldung mit einem persönlichen Token
statt über OAuth.

Token erzeugen auf github.com unter **Settings → Developer settings → Personal
access tokens → Fine-grained tokens**:

- *Repository access*: nur das eine Repo
- *Permissions → Repository permissions*: **Contents: Read and write**
- Ablaufdatum grosszügig setzen, sonst muss es die Kundin erneuern

Dann `deine-domain.ch/admin/` öffnen → *Sign In with GitHub Using PAT* → Token
einfügen. Der Browser merkt sich das, es ist eine einmalige Sache.

> Wer den bequemeren OAuth-Login will: der kostenlose Cloudflare-Worker
> `sveltia-cms-auth` übernimmt das, dann erscheint ein normaler
> «Mit GitHub anmelden»-Button. Die Seite selbst bleibt trotzdem auf Hostpoint.

## 5. Kundin einladen

Sie braucht einen kostenlosen GitHub-Account. Diesen im Repo unter
**Settings → Collaborators → Add people** als *Write* hinzufügen, und sie
erzeugt sich ihr eigenes Token wie in Schritt 4. Mehr nicht – sie sieht GitHub
danach nie wieder, nur noch `/admin/`.

## 6. Domain und HTTPS

Läuft komplett bei Hostpoint: Domain im Control Panel auf das Hosting zeigen
lassen und das kostenlose Let's-Encrypt-Zertifikat aktivieren. HTTPS ist
Pflicht, sonst funktioniert der CMS-Login nicht.

---

## Ablauf im Betrieb

1. Kundin ändert etwas unter `deine-domain.ch/admin/` und klickt *Save*
2. Sveltia CMS committet die Änderung nach GitHub
3. GitHub Actions baut die Seite und lädt sie per FTPS zu Hostpoint
4. Nach ein bis zwei Minuten ist es live

Der Fortschritt ist jederzeit im Tab *Actions* auf GitHub sichtbar.

---

## Noch offen (Platzhalter im Text)

Diese Stellen stehen so schon in der Originalseite und sollten vor dem
Live-Gang ersetzt werden – alle direkt im CMS bearbeitbar:

- `[Nachname]` und `[Wohnort]` in der Fusszeile (CMS → *Allgemein*)
- `[Wohnort]` in der Preis-Zeile (CMS → *Angebot*) und im Kontakt-Hinweis
- `[Ort]` bei den Kundenstimmen
- Echte WhatsApp-Nummer und E-Mail-Adresse (CMS → *Kontakt*)
- Die drei Platzhalter-Kundenstimmen
