# Login-Vermittler für das CMS

Damit sich die Kundin mit Benutzername und Passwort am CMS anmelden kann,
ganz ohne GitHub-Konto.

## Warum es das braucht

Die Website liegt statisch auf GitHub Pages. Statische Dateien können kein
Passwort prüfen — alles, was im Browser läuft, ist einsehbar. Dieser Worker
läuft auf einem Server, prüft dort die Anmeldung und gibt dem CMS erst danach
den GitHub-Zugang weiter. Der Token liegt ausschliesslich im Worker, nie im
Quelltext der Website.

## Einrichtung (einmalig)

### 1. GitHub-Token erzeugen

Auf github.com → **Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token**

- *Repository access* → **Only select repositories** → `raeumdichgluecklich`
- *Permissions → Repository permissions* → **Contents: Read and write**
- Ablauf möglichst lang wählen, sonst muss der Token erneuert werden

Mehr Rechte braucht es nicht. Wer den Token hätte, könnte nur die Inhalte
dieses einen Repositories ändern.

### 2. Bei Cloudflare anmelden

```bash
cd auth-worker && npx wrangler login
```

### 3. Zugangsdaten hinterlegen

```bash
npx wrangler secret put CMS_USERNAME
npx wrangler secret put CMS_PASSWORD
npx wrangler secret put GITHUB_TOKEN
```

Jeder Befehl fragt den Wert interaktiv ab. Die Werte landen verschlüsselt bei
Cloudflare und stehen nirgends im Repository — wichtig, denn das Repo ist
öffentlich.

### 4. Veröffentlichen

```bash
npx wrangler deploy
```

Am Ende wird eine Adresse ausgegeben, etwa
`https://raeumdichgluecklich-auth.DEIN-NAME.workers.dev`.
Diese Adresse gehört in `public/admin/config.yml`:

```yaml
backend:
  name: github
  repo: mystery2769/raeumdichgluecklich
  branch: main
  base_url: https://raeumdichgluecklich-auth.DEIN-NAME.workers.dev
  auth_endpoint: auth
```

Danach committen und pushen. Ab dann führt `raeumdichgluecklich.ch/admin` zum
Login-Formular.

## Passwort wechseln

```bash
npx wrangler secret put CMS_PASSWORD
```

Wirkt sofort, kein neuer Deploy nötig.

## Wenn der Zugang gesperrt werden soll

Token auf github.com widerrufen (*Settings → Developer settings → Personal
access tokens*). Damit ist jede bestehende Sitzung wertlos, auch wenn jemand
das Passwort kennt.
