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

    // Kleiner Statuspunkt zum Nachschauen, ob der hinterlegte Token gilt.
    // Gibt weder Token noch Passwort preis, nur gueltig ja/nein.
    if (url.pathname === '/status') {
      const token = (env.GITHUB_TOKEN ?? '').trim();
      const repo = env.REPO ?? '';
      const check = await checkToken(token, repo);
      const graphql = await checkGraphql(token, repo);
      const user = await checkUser(token);
      return Response.json(
        {
          restApi: check.ok ? 'ok – Token gueltig und darf schreiben' : check.message,
          graphqlApi: graphql,
          benutzerAbfrage: user,
          mitarbeiterAbfrage: await checkCollaborator(token, repo),
          schreibrecht: await checkCommitPermission(token, repo, env.BRANCH ?? 'main'),
          benutzernameHinterlegt: Boolean(env.CMS_USERNAME),
          passwortHinterlegt: Boolean(env.CMS_PASSWORD),
        },
        { headers: { 'cache-control': 'no-store' } },
      );
    }

    if (url.pathname !== '/auth') {
      return new Response('Not found', { status: 404 });
    }

    if (request.method === 'GET') {
      return html(loginPage());
    }

    if (request.method === 'POST') {
      const form = await request.formData();
      // Getrimmt, weil beim Hinterlegen der Secrets leicht ein Leerzeichen oder
      // Zeilenende mitkopiert wird – das waere sonst nicht auffindbar.
      const user = String(form.get('username') ?? '').trim();
      const pass = String(form.get('password') ?? '').trim();

      const ok =
        safeEqual(user, (env.CMS_USERNAME ?? '').trim()) &&
        safeEqual(pass, (env.CMS_PASSWORD ?? '').trim());

      if (!ok) {
        // Bremst Rateversuche spürbar aus, ohne echte Nutzer zu stören.
        await new Promise((r) => setTimeout(r, 1500));
        return html(loginPage('Benutzername oder Passwort stimmt nicht.'), 401);
      }

      // Zeilenende oder Leerzeichen beim Hinterlegen sind eine haeufige Falle.
      const token = (env.GITHUB_TOKEN ?? '').trim();

      // Token vorab pruefen, damit im CMS nicht nur "Bad credentials" steht.
      const check = await checkToken(token, env.REPO ?? '');
      if (!check.ok) {
        return html(loginPage(check.message), 500);
      }

      return html(successPage(token, env.ALLOWED_ORIGIN));
    }

    return new Response('Method not allowed', { status: 405 });
  },
};

/**
 * Sveltia CMS holt die Inhalte über die GraphQL-Schnittstelle. Fein granulierte
 * Token verhalten sich dort anders als bei der REST-Schnittstelle – deshalb
 * hier getrennt geprüft.
 */
async function checkGraphql(token, repo) {
  const [owner, name] = repo.split('/');
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'raeumdichgluecklich-auth',
      },
      body: JSON.stringify({
        query: 'query($o:String!,$n:String!){ repository(owner:$o,name:$n){ id nameWithOwner } }',
        variables: { o: owner, n: name },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.errors?.length) {
      return `FEHLER (${res.status}): ${data.errors.map((e) => e.message).join(' | ')}`;
    }
    if (data?.data?.repository?.nameWithOwner) {
      return `ok – ${data.data.repository.nameWithOwner}`;
    }
    return `FEHLER (${res.status}): Repository nicht sichtbar`;
  } catch (e) {
    return `FEHLER: ${e.message}`;
  }
}

/**
 * Sveltia schreibt über die GraphQL-Mutation createCommitOnBranch. Genau die
 * verweigern fein granulierte Token teilweise. Hier wird sie mit einer absichtlich
 * falschen Ausgangsversion aufgerufen: Fehlt das Recht, meldet GitHub
 * "Resource not accessible" – ist es da, meldet es stattdessen, dass die
 * Ausgangsversion nicht passt. Geschrieben wird in keinem Fall.
 */
async function checkCommitPermission(token, repo, branch) {
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'raeumdichgluecklich-auth',
      },
      body: JSON.stringify({
        query: `mutation($input:CreateCommitOnBranchInput!){ createCommitOnBranch(input:$input){ commit { oid } } }`,
        variables: {
          input: {
            branch: { repositoryNameWithOwner: repo, branchName: branch },
            message: { headline: 'permission probe' },
            // Bewusst ungueltig, damit nichts geschrieben wird.
            expectedHeadOid: '0000000000000000000000000000000000000000',
            fileChanges: {},
          },
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    const messages = (data?.errors ?? []).map((e) => e.message).join(' | ');

    if (/not accessible by personal access token|Resource not accessible/i.test(messages)) {
      return 'FEHLT – dieser Token darf ueber GraphQL nicht committen. Klassischen Token verwenden.';
    }
    if (/expectedHeadOid|head oid|does not match|not a valid/i.test(messages)) {
      return 'ok – Schreiben ueber GraphQL erlaubt';
    }
    return `unklar (${res.status}): ${messages || JSON.stringify(data).slice(0, 200)}`;
  } catch (e) {
    return `FEHLER: ${e.message}`;
  }
}

/**
 * Sveltia prüft, ob der angemeldete Benutzer Mitarbeiter des Repositories ist.
 * Genau daran scheitert es bei fein granulierten Token: Diese Abfrage verlangt
 * die Berechtigung "Administration", die es beim Erzeugen selten mitbekommt.
 */
async function checkCollaborator(token, repo) {
  try {
    const me = await fetch('https://api.github.com/user', {
      headers: { authorization: `Bearer ${token}`, 'user-agent': 'raeumdichgluecklich-auth' },
    }).then((r) => r.json());

    const res = await fetch(`https://api.github.com/repos/${repo}/collaborators/${me.login}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'raeumdichgluecklich-auth',
      },
    });

    if (res.status === 204) return `ok – ${me.login} ist Mitarbeiter`;
    const body = await res.json().catch(() => ({}));
    return `FEHLER (${res.status}): ${body?.message ?? 'keine Antwort'}`;
  } catch (e) {
    return `FEHLER: ${e.message}`;
  }
}

/** Sveltia fragt zusätzlich das Benutzerprofil ab. */
async function checkUser(token) {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'raeumdichgluecklich-auth',
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return `FEHLER (${res.status}): ${data?.message ?? 'unbekannt'}`;
    return `ok – angemeldet als ${data.login}`;
  } catch (e) {
    return `FEHLER: ${e.message}`;
  }
}

/**
 * Prüft den hinterlegten GitHub-Token, bevor er weitergereicht wird.
 * Liefert eine verständliche Meldung statt GitHubs "Bad credentials".
 */
async function checkToken(token, repo) {
  if (!token) {
    return { ok: false, message: 'Es ist kein GitHub-Token hinterlegt. Bitte GITHUB_TOKEN setzen.' };
  }

  let res;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'raeumdichgluecklich-auth',
      },
    });
  } catch {
    return { ok: false, message: 'GitHub ist gerade nicht erreichbar. Bitte später nochmals versuchen.' };
  }

  if (res.status === 401) {
    return {
      ok: false,
      message: 'Der hinterlegte GitHub-Token wird abgelehnt. Er ist ungültig, abgelaufen oder widerrufen.',
    };
  }

  if (res.status === 404) {
    return {
      ok: false,
      message: `Der Token hat keinen Zugriff auf "${repo}". Beim Erzeugen muss dieses Repository ausgewählt sein.`,
    };
  }

  if (!res.ok) {
    return { ok: false, message: `GitHub antwortet mit Fehler ${res.status}.` };
  }

  const data = await res.json().catch(() => ({}));
  if (!data?.permissions?.push) {
    return {
      ok: false,
      message: 'Der Token darf nur lesen. Er braucht unter "Repository permissions" das Recht "Contents: Read and write".',
    };
  }

  return { ok: true };
}

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
  var allowed = ${JSON.stringify(
    String(allowedOrigin ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  )};

  // Ablauf nach dem Muster von Decap/Sveltia CMS: Das Popup meldet sich beim
  // Opener, der Opener bestaetigt, erst danach geht der Token raus.
  window.addEventListener('message', function (e) {
    if (e.data !== 'authorizing:' + provider) return;
    // Nur an ausdruecklich erlaubte Herkuenfte – und nie unverschluesselt.
    if (allowed.indexOf(e.origin) === -1) return;
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
