const express = require('express');
const axios = require('axios');
const qs = require('qs');
require('dotenv').config();

const app = express();

// Renseigne ces variables dans .env
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback';
console.log('CLIENT_ID from env =', CLIENT_ID);
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('⚠️ GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET manquants. Configure ton fichier .env.');
}

let lastTokens = null;

// 1) Page d’accueil avec le bouton "Connect with Google"
app.get('/', (req, res) => {
  if (!CLIENT_ID) {
    return res.send(`
      <h1>Erreur de configuration</h1>
      <p><strong>CLIENT_ID manquant ou vide.</strong></p>
      <p>Vérifie ton fichier <code>.env</code> dans <code>google-oauth-sandbox</code> :</p>
      <pre>GOOGLE_CLIENT_ID=TON_CLIENT_ID.apps.googleusercontent.com</pre>
    `);
  }

  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    qs.stringify({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      access_type: 'offline',
      prompt: 'consent'
    });

  console.log('Auth URL generated =', authUrl);

  res.send(`
    <h1>Google OAuth Sandbox</h1>
    <p><a href="${authUrl}">Connect with Google (sandbox)</a></p>
    <p>Auth URL:</p>
    <pre>${authUrl}</pre>
    <h2>Last tokens</h2>
    <pre>${JSON.stringify(lastTokens, null, 2)}</pre>
  `);
});

// 2) Callback OAuth (Google renvoie "code")
app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Missing "code" query parameter');
  }

  try {
    const tokenResp = await axios.post(
      'https://oauth2.googleapis.com/token',
      qs.stringify({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    lastTokens = tokenResp.data; // { access_token, refresh_token, ... }

    res.send(`
      <h1>Tokens récupérés</h1>
      <pre>${JSON.stringify(tokenResp.data, null, 2)}</pre>
      <p>
        <a href="/firebase-projects">Lister les projets Firebase</a>
      </p>
      <p>
        <a href="/gcp-projects-ui">Configurer Firebase sur un projet GCP (UI)</a>
      </p>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .send(`<h1>Erreur lors de l'échange du code</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

// 3) Lister les projets Firebase accessibles avec l'access_token
app.get('/firebase-projects', async (req, res) => {
  if (!lastTokens?.access_token) {
    return res.status(400).send('Pas de access_token en mémoire. Reviens à la racine et refais le login.');
  }

  try {
    const resp = await axios.get('https://firebase.googleapis.com/v1beta1/projects', {
      headers: {
        Authorization: `Bearer ${lastTokens.access_token}`
      }
    });

    res.send(`
      <h1>Firebase projects</h1>
      <pre>${JSON.stringify(resp.data, null, 2)}</pre>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .send(`<h1>Erreur Firebase Management API</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

// 3bis) Lister les projets GCP visibles par l'utilisateur (Cloud Resource Manager)
//       GET /gcp-projects
app.get('/gcp-projects', async (req, res) => {
  if (!lastTokens?.access_token) {
    return res.status(400).send('Pas de access_token en mémoire. Reviens à la racine et refais le login.');
  }

  try {
    const resp = await axios.get('https://cloudresourcemanager.googleapis.com/v1/projects', {
      headers: {
        Authorization: `Bearer ${lastTokens.access_token}`
      }
    });

    res.send(`
      <h1>GCP projects (Cloud Resource Manager)</h1>
      <pre>${JSON.stringify(resp.data, null, 2)}</pre>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .send(`<h1>Erreur Cloud Resource Manager API</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

// 3ter) UI simple pour lister les projets GCP et attacher Firebase / créer une app Android
//       GET /gcp-projects-ui
app.get('/gcp-projects-ui', async (req, res) => {
  if (!lastTokens?.access_token) {
    return res.status(400).send('Pas de access_token en mémoire. Reviens à la racine et refais le login.');
  }

  try {
    const resp = await axios.get('https://cloudresourcemanager.googleapis.com/v1/projects', {
      headers: {
        Authorization: `Bearer ${lastTokens.access_token}`
      }
    });

    const projects = resp.data.projects || [];

    const rows = projects
      .map(
        (p) => `
        <tr>
          <td>${p.projectId}</td>
          <td>${p.name}</td>
          <td>${p.lifecycleState}</td>
          <td>
            <button onclick="attachFirebase('${p.projectId}')">Attach Firebase</button>
          </td>
        </tr>
      `
      )
      .join('');

    res.send(`
      <html>
        <head>
          <title>GCP Projects - Attach Firebase</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background: #f5f5f5; text-align: left; }
            button { padding: 6px 12px; cursor: pointer; }
            pre { background: #f9f9f9; padding: 12px; border-radius: 4px; max-height: 240px; overflow: auto; }
          </style>
        </head>
        <body>
          <h1>GCP Projects (Cloud Resource Manager)</h1>
          <p>Compte connecté via OAuth : les projets listés sont ceux visibles par ce compte.</p>
          <table>
            <thead>
              <tr>
                <th>projectId</th>
                <th>name</th>
                <th>state</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="4">Aucun projet GCP visible avec ce compte.</td></tr>'}
            </tbody>
          </table>

          <h2>Résultat</h2>
          <pre id="result">Clique sur "Attach Firebase" ou "Créer projet Firebase Android" pour un projet.</pre>

          <script>
            async function attachFirebase(projectId) {
              const resultEl = document.getElementById('result');
              resultEl.textContent = 'Attaching Firebase to ' + projectId + '...';
              try {
                const resp = await fetch('/add-firebase?projectId=' + encodeURIComponent(projectId));
                const text = await resp.text();
                resultEl.textContent = text;
              } catch (e) {
                resultEl.textContent = 'Erreur: ' + e;
              }
            }

            async function createAndroidApp(projectId) {
              const resultEl = document.getElementById('result');
              resultEl.textContent = 'Création d\\'une app Android Firebase sur ' + projectId + '...';
              try {
                const resp = await fetch('/create-android-app?projectId=' + encodeURIComponent(projectId));
                const text = await resp.text();
                resultEl.textContent = text;
              } catch (e) {
                resultEl.textContent = 'Erreur: ' + e;
              }
            }
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .send(`<h1>Erreur Cloud Resource Manager API (UI)</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

// 4) Endpoint pour tester l'attache Firebase à un projet GCP précis
//    Exemple: GET /add-firebase?projectId=mon-projet-gcp
app.get('/add-firebase', async (req, res) => {
  const projectId = req.query.projectId;
  if (!projectId) {
    return res.status(400).send('Query param "projectId" manquant');
  }
  if (!lastTokens?.access_token) {
    return res.status(400).send('Pas de access_token en mémoire. Reviens à la racine et refais le login.');
  }

  try {
    const url = `https://firebase.googleapis.com/v1beta1/projects/${encodeURIComponent(projectId)}:addFirebase`;
    const resp = await axios.post(
      url,
      {},
      {
        headers: {
          Authorization: `Bearer ${lastTokens.access_token}`
        }
      }
    );

    res.send(`
      <h1>Firebase attaché au projet ${projectId}</h1>
      <pre>${JSON.stringify(resp.data, null, 2)}</pre>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .send(`<h1>Erreur addFirebase</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

// 5) Endpoint pour lister les apps Android d'un projet Firebase
//    Exemple: GET /android-apps?projectId=mon-projet-gcp
app.get('/android-apps', async (req, res) => {
  const projectId = req.query.projectId;
  if (!projectId) {
    return res.status(400).send('Query param "projectId" manquant');
  }
  if (!lastTokens?.access_token) {
    return res.status(400).send('Pas de access_token en mémoire. Reviens à la racine et refais le login.');
  }

  try {
    const url = `https://firebase.googleapis.com/v1beta1/projects/${encodeURIComponent(projectId)}/androidApps`;
    const resp = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${lastTokens.access_token}`
      }
    });

    res.send(`
      <h1>Android apps pour ${projectId}</h1>
      <pre>${JSON.stringify(resp.data, null, 2)}</pre>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .send(`<h1>Erreur androidApps</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

// 5bis) Créer une Android app Firebase avec des valeurs par défaut + renvoyer sa config
//       GET /create-android-app?projectId=mon-projet-gcp
app.get('/create-android-app', async (req, res) => {
  const projectId = req.query.projectId;
  if (!projectId) {
    return res.status(400).send('Query param "projectId" manquant');
  }
  if (!lastTokens?.access_token) {
    return res.status(400).send('Pas de access_token en mémoire. Reviens à la racine et refais le login.');
  }

  try {
    const baseUrl = `https://firebase.googleapis.com/v1beta1/projects/${encodeURIComponent(projectId)}`;

    // 1) Créer l'app Android avec des valeurs par défaut
    const createResp = await axios.post(
      `${baseUrl}/androidApps`,
      {
        displayName: 'My Android App',
        packageName: 'com.example.myapp'
      },
      {
        headers: {
          Authorization: `Bearer ${lastTokens.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const androidApp = createResp.data; // contient appId

    // 2) Récupérer la config de cette app
    const configResp = await axios.get(`${baseUrl}/androidApps/${encodeURIComponent(androidApp.appId)}/config`, {
      headers: {
        Authorization: `Bearer ${lastTokens.access_token}`
      }
    });

    res.send(`
      <h1>Android app créée pour ${projectId}</h1>
      <h2>Android app</h2>
      <pre>${JSON.stringify(androidApp, null, 2)}</pre>
      <h2>Config (google-services.json ready)</h2>
      <pre>${JSON.stringify(configResp.data, null, 2)}</pre>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .send(`<h1>Erreur create-android-app</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

// 6) Endpoint pour lister les apps iOS d'un projet Firebase
//    Exemple: GET /ios-apps?projectId=mon-projet-gcp
app.get('/ios-apps', async (req, res) => {
  const projectId = req.query.projectId;
  if (!projectId) {
    return res.status(400).send('Query param "projectId" manquant');
  }
  if (!lastTokens?.access_token) {
    return res.status(400).send('Pas de access_token en mémoire. Reviens à la racine et refais le login.');
  }

  try {
    const url = `https://firebase.googleapis.com/v1beta1/projects/${encodeURIComponent(projectId)}/iosApps`;
    const resp = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${lastTokens.access_token}`
      }
    });

    res.send(`
      <h1>iOS apps pour ${projectId}</h1>
      <pre>${JSON.stringify(resp.data, null, 2)}</pre>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .send(`<h1>Erreur iosApps</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

// 7) Endpoint pour rafraîchir l'access_token avec le refresh_token
//    GET /refresh-token
app.get('/refresh-token', async (req, res) => {
  if (!lastTokens?.refresh_token) {
    return res.status(400).send('Pas de refresh_token en mémoire. Refais un consent complet (prompt=consent).');
  }

  try {
    const tokenResp = await axios.post(
      'https://oauth2.googleapis.com/token',
      qs.stringify({
        refresh_token: lastTokens.refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // On garde l'ancien refresh_token si Google ne le renvoie pas
    lastTokens = {
      ...lastTokens,
      ...tokenResp.data,
      refresh_token: lastTokens.refresh_token
    };

    res.send(`
      <h1>Nouveau access_token</h1>
      <pre>${JSON.stringify(lastTokens, null, 2)}</pre>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .send(`<h1>Erreur refresh_token</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Google OAuth sandbox listening on http://localhost:${PORT}`);
});


