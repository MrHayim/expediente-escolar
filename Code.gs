/**
 * Expediente Escolar · servidor en Google Sheets (Apps Script).
 * Guarda los perfiles en esta hoja y los protege con PIN.
 * @OnlyCurrentDoc
 */

const MAX_CELDA = 45000;      // caracteres por celda (el límite de Sheets es 50 000)
const INTENTOS = 5;            // PIN equivocados antes de bloquear
const BLOQUEO_MIN = 15;        // minutos de bloqueo

/* ================= Instalación (ejecutar una vez desde el editor) ================= */
function instalar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let p = ss.getSheetByName('Perfiles');
  if (!p) {
    p = ss.getSheets()[0];
    p.setName('Perfiles');
    p.getRange(1, 1, 1, 5).setValues([['ID', 'Nombre', 'Carrera', 'Creado', 'Última actualización']]).setFontWeight('bold');
    p.setFrozenRows(1);
  }
  let d = ss.getSheetByName('Datos');
  if (!d) {
    d = ss.insertSheet('Datos');
    d.getRange(1, 1, 1, 3).setValues([['ID', 'Actualizado', 'Datos (JSON)']]).setFontWeight('bold');
    d.setFrozenRows(1);
    d.hideSheet();
  }
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('CODIGO')) props.setProperty('CODIGO', String(Math.floor(100000 + Math.random() * 900000)));
  Logger.log('Listo. Código de instalación: ' + props.getProperty('CODIGO'));
}

function doGet() {
  return ContentService.createTextOutput('Servidor de Expediente Escolar funcionando. Abre la app desde tu dirección de GitHub Pages.');
}

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, error: 'peticion' }); }
  try {
    switch (req.action) {
      case 'estado': return json_({ ok: true, perfiles: lista_() });
      case 'crearPerfil': return json_(crearPerfil_(req));
      case 'entrar': return json_(entrar_(req));
      case 'cargar': { const s = sesion_(req.token); if (!s) return json_({ ok: false, error: 'sesion' }); return json_({ ok: true, data: leer_(s.p) }); }
      case 'guardar': { const s = sesion_(req.token); if (!s) return json_({ ok: false, error: 'sesion' }); return json_(guardar_(s.p, req.data)); }
      case 'cambiarPin': { const s = sesion_(req.token); if (!s) return json_({ ok: false, error: 'sesion' }); return json_(cambiarPin_(s.p, req)); }
      case 'borrarPerfil': { const s = sesion_(req.token); if (!s) return json_({ ok: false, error: 'sesion' }); return json_(borrarPerfil_(s.p, req)); }
      case 'salir': quitarToken_(req.token); return json_({ ok: true });
      default: return json_({ ok: false, error: 'accion' });
    }
  } catch (err) {
    return json_({ ok: false, error: 'servidor', detalle: String(err && err.message || err) });
  }
}

/* ================= Utilidades ================= */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function props_() { return PropertiesService.getScriptProperties(); }
function hash_(pin, sal) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sal + ':' + pin, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(b);
}
function pinValido_(pin) { return /^\d{4,6}$/.test(String(pin || '')); }
function ids_() { return JSON.parse(props_().getProperty('IDS') || '[]'); }
function meta_(id) { const v = props_().getProperty('P_' + id); return v ? JSON.parse(v) : null; }
function setMeta_(m) { props_().setProperty('P_' + m.id, JSON.stringify(m)); }
function lista_() {
  return ids_().map(meta_).filter(Boolean).map(function (m) { return { id: m.id, nombre: m.nombre, color: m.color }; });
}
function hoja_(n) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n); }
function fila_(sheet, id) {
  const n = sheet.getLastRow();
  if (n < 2) return 0;
  const vals = sheet.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]) === id) return i + 2;
  return 0;
}

/* ================= Sesiones ================= */
function nuevoToken_(perfil, dispositivo) {
  const t = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  let lista = JSON.parse(props_().getProperty('TOKENS') || '[]');
  lista.push({ t: t, p: perfil, d: String(dispositivo || '').slice(0, 40), f: new Date().toISOString() });
  if (lista.length > 80) lista = lista.slice(-80);
  props_().setProperty('TOKENS', JSON.stringify(lista));
  return t;
}
function sesion_(token) {
  if (!token) return null;
  const lista = JSON.parse(props_().getProperty('TOKENS') || '[]');
  const s = lista.find(function (x) { return x.t === token; });
  return s && meta_(s.p) ? s : null;
}
function quitarToken_(token) {
  const lista = JSON.parse(props_().getProperty('TOKENS') || '[]').filter(function (x) { return x.t !== token; });
  props_().setProperty('TOKENS', JSON.stringify(lista));
}
function quitarTokensDe_(perfil, salvo) {
  const lista = JSON.parse(props_().getProperty('TOKENS') || '[]').filter(function (x) { return x.p !== perfil || x.t === salvo; });
  props_().setProperty('TOKENS', JSON.stringify(lista));
}

/* ================= Perfiles ================= */
function crearPerfil_(req) {
  const autorizado = sesion_(req.token) || (req.codigo && String(req.codigo).trim() === props_().getProperty('CODIGO'));
  if (!autorizado) return { ok: false, error: 'codigo' };
  if (!pinValido_(req.pin)) return { ok: false, error: 'pinFormato' };
  const nombre = String(req.nombre || '').trim().slice(0, 40);
  if (!nombre) return { ok: false, error: 'nombre' };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ids = ids_();
    if (ids.length >= 30) return { ok: false, error: 'limite' };
    const id = 'p' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    const sal = Utilities.getUuid();
    setMeta_({ id: id, nombre: nombre, color: String(req.color || '#5B4BB7').slice(0, 9), sal: sal, hash: hash_(req.pin, sal), intentos: 0, bloqueo: 0 });
    ids.push(id); props_().setProperty('IDS', JSON.stringify(ids));
    hoja_('Perfiles').appendRow([id, nombre, String(req.carrera || '').slice(0, 60), new Date(), new Date()]);
    return { ok: true, id: id, token: nuevoToken_(id, req.dispositivo) };
  } finally { lock.releaseLock(); }
}

function entrar_(req) {
  const m = meta_(req.id);
  if (!m) return { ok: false, error: 'perfil' };
  const ahora = Date.now();
  if (m.bloqueo && m.bloqueo > ahora) return { ok: false, error: 'bloqueado', minutos: Math.ceil((m.bloqueo - ahora) / 60000) };
  if (hash_(String(req.pin || ''), m.sal) !== m.hash) {
    m.intentos = (m.intentos || 0) + 1;
    if (m.intentos >= INTENTOS) { m.bloqueo = ahora + BLOQUEO_MIN * 60000; m.intentos = 0; setMeta_(m); return { ok: false, error: 'bloqueado', minutos: BLOQUEO_MIN }; }
    setMeta_(m);
    return { ok: false, error: 'pin', quedan: INTENTOS - m.intentos };
  }
  m.intentos = 0; m.bloqueo = 0; setMeta_(m);
  return { ok: true, token: nuevoToken_(m.id, req.dispositivo) };
}

function cambiarPin_(id, req) {
  const m = meta_(id);
  if (hash_(String(req.actual || ''), m.sal) !== m.hash) return { ok: false, error: 'pin' };
  if (!pinValido_(req.nuevo)) return { ok: false, error: 'pinFormato' };
  m.sal = Utilities.getUuid(); m.hash = hash_(req.nuevo, m.sal); setMeta_(m);
  quitarTokensDe_(id, req.token);
  return { ok: true };
}

function borrarPerfil_(id, req) {
  const m = meta_(id);
  if (hash_(String(req.pin || ''), m.sal) !== m.hash) return { ok: false, error: 'pin' };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    props_().setProperty('IDS', JSON.stringify(ids_().filter(function (x) { return x !== id; })));
    props_().deleteProperty('P_' + id);
    quitarTokensDe_(id, null);
    ['Perfiles', 'Datos'].forEach(function (n) { const s = hoja_(n); const f = fila_(s, id); if (f) s.deleteRow(f); });
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ================= Datos ================= */
function leer_(id) {
  const s = hoja_('Datos'); const f = fila_(s, id);
  if (!f) return null;
  const row = s.getRange(f, 3, 1, Math.max(1, s.getLastColumn() - 2)).getValues()[0];
  const txt = row.join('');
  return txt ? JSON.parse(txt) : null;
}

function guardar_(id, data) {
  if (!data || typeof data !== 'object') return { ok: false, error: 'datos' };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const s = hoja_('Datos');
    let f = fila_(s, id);
    if (f) {
      const prev = Number(s.getRange(f, 2).getValue()) || 0;
      if ((Number(data.updatedAt) || 0) < prev) return { ok: true, conflicto: true, data: leer_(id) };
    }
    data.id = id;
    const txt = JSON.stringify(data);
    const partes = [];
    for (let i = 0; i < txt.length; i += MAX_CELDA) partes.push(txt.slice(i, i + MAX_CELDA));
    if (!f) { s.appendRow([id]); f = s.getLastRow(); }
    const ancho = Math.max(s.getLastColumn(), partes.length + 2);
    const fila = [id, Number(data.updatedAt) || Date.now()].concat(partes);
    while (fila.length < ancho) fila.push('');
    s.getRange(f, 1, 1, ancho).setValues([fila]);

    const m = meta_(id);
    if (m && (m.nombre !== data.nombre || m.color !== data.color)) {
      m.nombre = String(data.nombre || m.nombre).slice(0, 40); m.color = String(data.color || m.color).slice(0, 9); setMeta_(m);
    }
    const p = hoja_('Perfiles'); const fp = fila_(p, id);
    if (fp) p.getRange(fp, 2, 1, 4).setValues([[data.nombre || '', data.carrera || '', p.getRange(fp, 4).getValue(), new Date()]]);
    return { ok: true, updatedAt: data.updatedAt };
  } finally { lock.releaseLock(); }
}
