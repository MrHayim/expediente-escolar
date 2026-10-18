// Conexión con Google Drive.
// Usa el permiso "drive.file": la app solo puede ver y modificar el archivo
// que ella misma crea en el Drive del usuario, nunca el resto de sus archivos.
'use strict';

const Drive = (() => {
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const FILE_NAME = 'Expediente Escolar (datos).json';
  const API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

  let token = null;
  let tokenExp = 0;
  let client = null;
  let gisPromise = null;
  let pendingResolve = null;
  let pendingReject = null;

  function clientId() {
    const fromCfg = (window.EXPEDIENTE_CONFIG || {}).googleClientId || '';
    let fromLocal = '';
    try { fromLocal = localStorage.getItem('expediente:clientId') || ''; } catch (e) { /* sin almacenamiento */ }
    return (fromCfg || fromLocal).trim();
  }

  function configured() { return !!clientId(); }

  function loadGis() {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { gisPromise = null; reject(new Error('No se pudo cargar el inicio de sesión de Google. Revisa tu conexión.')); };
      document.head.appendChild(s);
    });
    return gisPromise;
  }

  async function ensureClient() {
    await loadGis();
    if (client) return client;
    client = google.accounts.oauth2.initTokenClient({
      client_id: clientId(),
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) {
          pendingReject && pendingReject(new Error(resp.error_description || resp.error));
        } else {
          token = resp.access_token;
          tokenExp = Date.now() + (Number(resp.expires_in || 3600) - 60) * 1000;
          pendingResolve && pendingResolve(token);
        }
        pendingResolve = pendingReject = null;
      },
      error_callback: (err) => {
        pendingReject && pendingReject(new Error(err && err.type === 'popup_closed' ? 'Cerraste la ventana de Google antes de terminar.' : 'No se pudo abrir la ventana de Google. Permite ventanas emergentes para esta página.'));
        pendingResolve = pendingReject = null;
      }
    });
    return client;
  }

  // Debe llamarse desde un toque o clic del usuario (Google abre una ventana).
  async function connect(hintEmail) {
    if (!configured()) throw new Error('Falta el ID de cliente de Google.');
    const c = await ensureClient();
    return new Promise((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      const opts = { prompt: '' };
      if (hintEmail) opts.login_hint = hintEmail;
      c.requestAccessToken(opts);
    });
  }

  function hasToken() { return !!token && Date.now() < tokenExp; }

  function disconnect() {
    if (token && window.google && google.accounts && google.accounts.oauth2) {
      try { google.accounts.oauth2.revoke(token, () => {}); } catch (e) { /* nada */ }
    }
    token = null; tokenExp = 0;
  }

  async function call(url, opts = {}) {
    if (!hasToken()) { const e = new Error('Sesión de Google vencida.'); e.code = 'auth'; throw e; }
    const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + token } });
    if (res.status === 401) { token = null; const e = new Error('Sesión de Google vencida.'); e.code = 'auth'; throw e; }
    if (!res.ok) { const e = new Error('Google Drive respondió con un error (' + res.status + ').'); e.code = 'http'; throw e; }
    return res;
  }

  async function whoAmI() {
    const r = await call(API + '/about?fields=user(displayName,emailAddress)');
    const j = await r.json();
    return { email: j.user.emailAddress, name: j.user.displayName };
  }

  async function findFile() {
    const q = encodeURIComponent("name = '" + FILE_NAME + "' and trashed = false");
    const r = await call(API + '/files?spaces=drive&orderBy=modifiedTime%20desc&fields=files(id,modifiedTime)&q=' + q);
    const j = await r.json();
    return (j.files && j.files[0]) || null;
  }

  async function meta(id) {
    const r = await call(API + '/files/' + id + '?fields=id,modifiedTime,trashed');
    return r.json();
  }

  async function download(id) {
    const r = await call(API + '/files/' + id + '?alt=media');
    return r.json();
  }

  async function create(obj) {
    const boundary = 'expediente' + Math.random().toString(36).slice(2);
    const body =
      '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify({ name: FILE_NAME, mimeType: 'application/json', description: 'Datos de Expediente Escolar. No lo borres: aquí se guardan horarios, tareas y calificaciones.' }) +
      '\r\n--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(obj) + '\r\n--' + boundary + '--';
    const r = await call(UPLOAD + '/files?uploadType=multipart&fields=id,modifiedTime', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body
    });
    return r.json();
  }

  async function update(id, obj) {
    const r = await call(UPLOAD + '/files/' + id + '?uploadType=media&fields=id,modifiedTime', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(obj)
    });
    return r.json();
  }

  return { configured, connect, disconnect, hasToken, whoAmI, findFile, meta, download, create, update, FILE_NAME };
})();
