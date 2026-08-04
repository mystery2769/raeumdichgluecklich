/**
 * Login-Vermittler für das CMS.
 *
 * Die Website liegt statisch auf GitHub Pages und kann selbst keine Passwörter
 * prüfen. Dieser Worker übernimmt das: Er zeigt ein Login-Formular, prüft
 * Benutzername und Passwort gegen die hinterlegten Secrets und gibt dem CMS
 * danach den GitHub-Token weiter. Die Kundin braucht dadurch kein GitHub-Konto.
 *
 * Benötigte Secrets (via `wrangler secret put NAME`):
 *   CMS_USERNAME   – Benutzername, den die Kundin eingibt
 *   CMS_PASSWORD   – Passwort, das die Kundin eingibt
 *   GITHUB_TOKEN   – Fine-grained PAT, nur Contents:write auf dem einen Repo
 *
 * Variablen (in wrangler.toml):
 *   ALLOWED_ORIGIN – Origin der Website, an den der Token gehen darf
 */

const PROVIDER = 'github';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/auth') {
      return new Response('Not found', { status: 404 });
    }

    if (request.method === 'GET') {
      return html(loginPage());
    }

    if (request.method === 'POST') {
      const form = await request.formData();
      const user = String(form.get('username') ?? '');
      const pass = String(form.get('password') ?? '');

      const ok =
        safeEqual(user, env.CMS_USERNAME ?? '') &&
        safeEqual(pass, env.CMS_PASSWORD ?? '');

      if (!ok) {
        // Bremst Rateversuche spürbar aus, ohne echte Nutzer zu stören.
        await new Promise((r) => setTimeout(r, 1500));
        return html(loginPage('Benutzername oder Passwort stimmt nicht.'), 401);
      }

      return html(successPage(env.GITHUB_TOKEN, env.ALLOWED_ORIGIN));
    }

    return new Response('Method not allowed', { status: 405 });
  },
};

/** Vergleich in konstanter Zeit – verrät nichts über die Länge der Übereinstimmung. */
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  // Unterschiedliche Längen: trotzdem durchlaufen, damit die Dauer gleich bleibt.
  let diff = ba.length ^ bb.length;
  const len = Math.max(ba.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
    },
  });
}

function loginPage(error = '') {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Anmelden – Räum dich glücklich</title>
<style>
  :root { --paper:#FBF7F2; --ink:#35243A; --muted:#6E5C6F; --berry:#A02C6A; --berry-deep:#7C2153; --line:#E7DCD2; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:var(--paper); color:var(--ink); font-family:'Mulish','Segoe UI',sans-serif; padding:24px; }
  form { width:100%; max-width:360px; background:#FFFDFA; border:1px solid var(--line);
         border-radius:14px; padding:32px 28px; display:flex; flex-direction:column; gap:16px; }
  h1 { margin:0; font-family:Georgia,serif; font-weight:500; font-size:25px; line-height:1.2; }
  p.sub { margin:0; font-size:14.5px; color:var(--muted); line-height:1.6; }
  label { font-size:13px; font-weight:800; letter-spacing:.04em; }
  input { width:100%; padding:11px 13px; font-size:16px; border:1px solid var(--line);
          border-radius:8px; background:#fff; color:var(--ink); }
  input:focus { outline:2px solid var(--berry); outline-offset:1px; border-color:var(--berry); }
  button { margin-top:4px; padding:13px; font-size:15px; font-weight:800; color:#fff;
           background:var(--berry); border:0; border-radius:8px; cursor:pointer; }
  button:hover { background:var(--berry-deep); }
  .err { padding:11px 13px; border-radius:8px; background:#F7E4EC; color:var(--berry-deep);
         font-size:14px; line-height:1.5; }
  .field { display:flex; flex-direction:column; gap:6px; }
</style>
</head>
<body>
<form method="post">
  <h1>Inhalte bearbeiten</h1>
  <p class="sub">Melde dich an, um die Texte und Bilder der Website zu ändern.</p>
  ${error ? `<p class="err">${escapeHtml(error)}</p>` : ''}
  <div class="field">
    <label for="u">Benutzername</label>
    <input id="u" name="username" autocomplete="username" autocapitalize="off" autocorrect="off" required autofocus>
  </div>
  <div class="field">
    <label for="p">Passwort</label>
    <input id="p" name="password" type="password" autocomplete="current-password" required>
  </div>
  <button type="submit">Anmelden</button>
</form>
</body>
</html>`;
}

function successPage(token, allowedOrigin) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><title>Angemeldet</title></head>
<body>
<p style="font-family:sans-serif">Angemeldet. Dieses Fenster schliesst sich gleich.</p>
<script>
  var token = ${JSON.stringify(token ?? '')};
  var provider = ${JSON.stringify(PROVIDER)};
  var allowed = ${JSON.stringify(allowedOrigin ?? '')};

  // Ablauf nach dem Muster von Decap/Sveltia CMS: Das Popup meldet sich beim
  // Opener, der Opener bestaetigt, erst danach geht der Token raus.
  window.addEventListener('message', function (e) {
    if (e.data !== 'authorizing:' + provider) return;
    if (allowed && e.origin !== allowed) return;
    window.opener.postMessage(
      'authorization:' + provider + ':success:' + JSON.stringify({ token: token, provider: provider }),
      e.origin
    );
  });

  window.opener.postMessage('authorizing:' + provider, '*');
</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
