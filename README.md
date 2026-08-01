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

# Einrichtung (einmalig, ca. 30 Minuten)

Ausgangslage: Die Domain `raeumdichgluecklich.ch` liegt bei Hostpoint, ein
Webhosting-Paket gibt es dort **nicht**. Die Seite wird darum gratis bei Netlify
gehostet; bei Hostpoint bleiben nur Domain und DNS-Verwaltung. E-Mail ist davon
nicht betroffen, die MX-Records bleiben unverändert.

## 1. Auf GitHub laden

```bash
cd vanessa-cms
gh auth login
gh repo create raeumdichgluecklich --private --source=. --push
```

(Oder Repo von Hand auf github.com anlegen und pushen.)

## 2. Repo-Namen im CMS eintragen

In `public/admin/config.yml` ganz oben:

```yaml
repo: DEIN-GITHUB-NAME/raeumdichgluecklich
branch: main
```

Domain (`site_url`, `display_url`, und `site` in `astro.config.mjs`) ist bereits
auf `https://raeumdichgluecklich.ch` gesetzt. Danach committen und pushen.

## 3. Bei Netlify deployen

netlify.com → **Add new site → Import an existing project** → GitHub → Repo
wählen. Build-Command und Publish-Verzeichnis stehen in `netlify.toml`, Netlify
liest das selbst aus. Nach dem Deploy läuft die Seite unter einer
`*.netlify.app`-Adresse.

Ab jetzt gilt: **jeder Push nach `main` deployt automatisch.**

## 4. Domain verbinden

In Netlify unter **Domain management → Add a domain**
`raeumdichgluecklich.ch` eintragen. Netlify zeigt danach die nötigen Werte an –
diese haben Vorrang vor der Tabelle unten, falls sie abweichen.

Dann im Hostpoint Control Panel unter *Domains → raeumdichgluecklich.ch →
DNS-Zone bearbeiten*:

| Aktion | Record |
| --- | --- |
| ändern | `raeumdichgluecklich.ch` **A** → `75.2.60.5` |
| löschen | `raeumdichgluecklich.ch` **AAAA** (Netlify liefert für die Apex-Domain kein IPv6) |
| hinzufügen | `www` **CNAME** → `DEIN-SITE-NAME.netlify.app` |

Die Wildcard-Records `*.raeumdichgluecklich.ch` (A und AAAA) zeigen weiterhin
auf Hostpoint. Wer sie nicht braucht, kann sie löschen; wichtig ist nur, dass
sie den `www`-CNAME nicht überschreiben.

**MX-, SPF- und die autoconfig-Records nicht anfassen** – daran hängt die
E-Mail.

Änderungen sind bei Hostpoint erst nach Klick auf **JETZT AUSFÜHREN** aktiv.
HTTPS stellt Netlify danach automatisch aus (Let's Encrypt).

## 5. Login für das CMS freischalten

In Netlify: **Site configuration → Access & security → OAuth → Install provider
→ GitHub**. Dafür einmal auf github.com unter *Settings → Developer settings →
OAuth Apps* eine App anlegen, Callback-URL `https://api.netlify.com/auth/done`,
Client ID und Secret bei Netlify eintragen.

Danach: `raeumdichgluecklich.ch/admin/` öffnen → «Mit GitHub anmelden» → fertig.

> Wer sich den Schritt sparen will: Sveltia bietet auch
> **«Sign In with GitHub Using PAT»** – Anmeldung mit einem Fine-grained Token
> (*Contents: Read and write*, nur dieses Repo). Funktioniert sofort, ist für
> die Kundin aber unbequemer.

## 6. Kundin einladen

Sie braucht einen kostenlosen GitHub-Account. Diesen im Repo unter
**Settings → Collaborators → Add people** als *Write* hinzufügen. Mehr nicht –
sie sieht GitHub danach nie wieder, nur noch `/admin/`.

---

## Ablauf im Betrieb

1. Kundin ändert etwas unter `deine-domain.ch/admin/` und klickt *Save*
2. Sveltia CMS committet die Änderung nach GitHub
3. Netlify baut die Seite und stellt sie live
4. Nach ein bis zwei Minuten ist es live

Der Fortschritt ist jederzeit im Netlify-Dashboard unter *Deploys* sichtbar.

---

## Noch offen (Platzhalter im Text)

Diese Stellen stehen so schon in der Originalseite und sollten vor dem
Live-Gang ersetzt werden – alle direkt im CMS bearbeitbar:

- `[Nachname]` und `[Wohnort]` in der Fusszeile (CMS → *Allgemein*)
- `[Wohnort]` in der Preis-Zeile (CMS → *Angebot*) und im Kontakt-Hinweis
- `[Ort]` bei den Kundenstimmen
- Echte WhatsApp-Nummer und E-Mail-Adresse (CMS → *Kontakt*)
- Die drei Platzhalter-Kundenstimmen
