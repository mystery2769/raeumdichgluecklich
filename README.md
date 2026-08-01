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
src/content/*.json      ← ALLE Texte und Bildpfade (das bearbeitet die Kundin)
src/pages/*.astro       ← Struktur der 5 Seiten
src/layouts/Base.astro  ← Navigation, Fusszeile, <head>
src/components/         ← CTA-Balken, Bücherregal-Animation
src/styles/site.css     ← das komplette Design (1:1 aus der Originalseite)
public/uploads/         ← Bilder (die Kundin lädt neue hier hoch, über das CMS)
public/admin/           ← das CMS selbst
```

Design ändern → `src/styles/site.css`.
Text ändern → `src/content/*.json` oder eben im CMS.

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

## 2. Auf Netlify deployen

1. netlify.com → **Add new site → Import an existing project** → GitHub → das Repo wählen
2. Build command: `npm run build`, Publish directory: `dist` (erkennt Netlify meist selbst)
3. Deploy

Netlify empfehle ich hier gegenüber Cloudflare Pages, weil der CMS-Login damit
ohne Zusatzdienst funktioniert (siehe Schritt 4).

## 3. Repo-Namen im CMS eintragen

In `public/admin/config.yml` ganz oben:

```yaml
repo: DEIN-GITHUB-NAME/raeum-dich-gluecklich
branch: main
```

Ausserdem `site_url` und `display_url` auf die echte Domain setzen, ebenso
`site` in `astro.config.mjs`. Danach committen und pushen.

## 4. Login für das CMS freischalten

In Netlify: **Site configuration → Access & security → OAuth → Install provider
→ GitHub**. Dafür einmal auf github.com unter *Settings → Developer settings →
OAuth Apps* eine App anlegen, Callback-URL `https://api.netlify.com/auth/done`,
und Client ID + Secret bei Netlify eintragen.

Danach: `deine-domain.ch/admin` öffnen → «Mit GitHub anmelden» → fertig.

> Auf Cloudflare Pages geht es genauso, dort braucht es statt Schritt 4 den
> kostenlosen Worker `sveltia-cms-auth`.

## 5. Kundin einladen

Sie braucht einen kostenlosen GitHub-Account. Diesen im Repo unter
**Settings → Collaborators → Add people** als *Write* hinzufügen. Mehr nicht –
sie sieht GitHub danach nie wieder, nur noch `/admin`.

## 6. Domain verbinden

Netlify → **Domain management → Add a domain**, dann beim Domain-Anbieter die
Nameserver bzw. den CNAME eintragen. HTTPS macht Netlify automatisch.

---

## Noch offen (Platzhalter im Text)

Diese Stellen stehen so schon in der Originalseite und sollten vor dem
Live-Gang ersetzt werden – alle direkt im CMS bearbeitbar:

- `[Nachname]` und `[Wohnort]` in der Fusszeile (CMS → *Allgemein*)
- `[Wohnort]` in der Preis-Zeile (CMS → *Angebot*) und im Kontakt-Hinweis
- `[Ort]` bei den Kundenstimmen
- Echte WhatsApp-Nummer und E-Mail-Adresse (CMS → *Kontakt*)
- Die drei Platzhalter-Kundenstimmen
