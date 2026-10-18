// Expediente Escolar: horario, tareas, calificaciones, faltas, repasos y estudio.
// Guarda primero en el navegador y sincroniza con una hoja de Google Sheets (Apps Script); cada perfil entra con PIN.
'use strict';

/* =========================================================
   Utilidades
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const dow = (s) => { const g = parseYmd(s).getDay(); return g === 0 ? 7 : g; };
const mondayOf = (s) => addDays(s, 1 - dow(s));
const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const minToT = (m) => { m = Math.max(0, Math.min(1439, Math.round(m))); return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const round1 = (n) => Math.round(n * 10) / 10;

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_C = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const fmtDate = (s) => { const d = parseYmd(s); return `${DIAS_C[dow(s) - 1].toLowerCase()} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`; };
const fmtLong = (s) => { const d = parseYmd(s); return `${DIAS[dow(s) - 1]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };

// Colores de materia nombrados por tinciones de laboratorio.
const TINCIONES = [
  { n: 'Hematoxilina', c: '#5B4BB7' }, { n: 'Eosina', c: '#D9487A' }, { n: 'Azul de metileno', c: '#2F6FD0' },
  { n: 'Verde de Janus', c: '#2E9E6B' }, { n: 'Sudán III', c: '#E0662B' }, { n: 'Giemsa', c: '#8E44AD' },
  { n: 'Safranina', c: '#C0392B' }, { n: 'Lugol', c: '#B8860B' }, { n: 'Azul de toluidina', c: '#3A8E9E' }, { n: 'Plata', c: '#6B7280' }
];
const TIPOS_TAREA = ['Tarea', 'Examen', 'Proyecto', 'Práctica', 'Exposición', 'Lectura', 'Estudio'];
const TIPOS_CLASE = ['Teoría', 'Práctica', 'Laboratorio', 'Clínica', 'Seminario'];
const INTERVALOS = [1, 3, 7, 14, 30, 60, 120];
const PRESETS = [{ f: 25, b: 5 }, { f: 50, b: 10 }, { f: 90, b: 20 }];

const I = {
  hoy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l1 2h3v16H5V5h3z"/><path d="M9 12h6M9 16h4"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  tareas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l2 2 3-3M4 13l2 2 3-3M4 20l2 2 3-3M13 7h8M13 14h8M13 21h8"/></svg>',
  materias: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/><path d="M7.5 15h9"/></svg>',
  estudio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  gcal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  l: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};
const LOGO = '<svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#4A3A8C"/><circle cx="26" cy="27" r="13" fill="#D9487A"/><circle cx="40" cy="38" r="11" fill="#B6A9EE" opacity=".9"/><circle cx="26" cy="27" r="4.5" fill="#4A3A8C"/><circle cx="40" cy="38" r="3.5" fill="#4A3A8C"/></svg>';

/* =========================================================
   Almacenamiento: copia local + servidor en Google Sheets
   ========================================================= */
const LS = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } }
};
const API = String((window.EXPEDIENTE_CONFIG || {}).apiUrl || '').trim();
const DEV = Object.assign({ active: null, sessions: {}, notif: { on: false, claseMin: 10 }, notified: {} }, LS.get('expediente:device') || {});
const saveDev = () => LS.set('expediente:device', DEV);
const DEMO = 'demo';
const dispositivo = () => { const u = navigator.userAgent; return /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : 'Navegador'; };

async function api(body, timeout = 25000) {
  if (!API) throw new Error('sin-servidor');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(API, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctl.signal, redirect: 'follow' });
    return await r.json();
  } finally { clearTimeout(t); }
}

const Store = {
  status: 'ok', last: 0, timer: null, saving: false, again: false,
  key: (id) => 'expediente:p:' + id,
  dirtyKey: (id) => 'expediente:dirty:' + id,
  local(id) { const d = LS.get(this.key(id)); return d ? normalize(d) : null; },
  isDirty(id) { return !!LS.get(this.dirtyKey(id)); },
  async refreshList() {
    if (!API) return;
    try {
      const r = await api({ action: 'estado' }, 20000);
      if (r.ok) { S.perfiles = r.perfiles; LS.set('expediente:perfiles', r.perfiles); S.offline = false; }
    } catch (e) { S.offline = true; }
  },
  // Abre un perfil que ya tiene sesión en este dispositivo.
  async activate(id) {
    DEV.active = id; saveDev();
    const meta = S.perfiles.find((p) => p.id === id) || {};
    S.data = this.local(id) || (id === DEMO ? null : newProfile({ id, nombre: meta.nombre, color: meta.color }));
    S.fMat = 'todas';
    render();
    if (id !== DEMO) await this.pull();
  },
  async pull() {
    const id = S.data && S.data.id, tok = DEV.sessions[id];
    if (!id || id === DEMO || !tok || !API) return;
    this.status = 'busy'; renderSync();
    try {
      const r = await api({ action: 'cargar', token: tok });
      if (!r.ok) { if (r.error === 'sesion') return this.expired(id); throw new Error(r.error); }
      if (S.data.id !== id) return;
      const dirty = this.isDirty(id);
      if (r.data && (!dirty || (r.data.updatedAt || 0) > (S.data.updatedAt || 0))) {
        S.data = normalize(r.data); LS.set(this.key(id), S.data); LS.del(this.dirtyKey(id));
        if (!S.sheet) render();
      }
      if (dirty || !r.data) await this.push(); else this.ok();
    } catch (e) { this.status = 'pending'; renderSync(); }
  },
  save() {
    const id = S.data.id;
    S.data.updatedAt = Date.now();
    LS.set(this.key(id), S.data);
    if (id === DEMO) return;
    LS.set(this.dirtyKey(id), true);
    this.status = 'busy'; renderSync();
    clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 1200);
  },
  async push() {
    const id = S.data && S.data.id, tok = DEV.sessions[id];
    if (!id || id === DEMO || !tok || !API) return;
    if (this.saving) { this.again = true; return; }
    this.saving = true; this.status = 'busy'; renderSync();
    try {
      const r = await api({ action: 'guardar', token: tok, data: S.data });
      if (!r.ok) { if (r.error === 'sesion') return this.expired(id); throw new Error(r.error); }
      if (r.conflicto && r.data && S.data.id === id) {
        S.data = normalize(r.data); LS.set(this.key(id), S.data);
        if (!S.sheet) render();
        toast('Se cargaron cambios más recientes hechos en otro dispositivo.');
      }
      LS.del(this.dirtyKey(id));
      this.ok();
    } catch (e) {
      this.status = 'pending'; renderSync();
    } finally {
      this.saving = false;
      if (this.again) { this.again = false; this.push(); }
    }
  },
  ok() { this.status = 'ok'; this.last = Date.now(); renderSync(); },
  expired(id) {
    delete DEV.sessions[id]; saveDev();
    this.status = 'pending'; renderSync();
    toast('Tu sesión en este dispositivo terminó. Escribe tu PIN para seguir guardando.');
    openPin(id);
  },
  refresh() { if (S.data && S.data.id !== DEMO && !this.saving && document.visibilityState === 'visible') this.pull(); }
};

/* =========================================================
   Estado
   ========================================================= */
const S = {
  perfiles: LS.get('expediente:perfiles') || [],
  data: null,
  offline: false,
  tab: 'hoy',
  cal: { mode: 'semana', ref: today(), sel: today() },
  fMat: 'todas',
  tVista: 'pendientes',
  sheet: null
};
const P = () => S.data;
const hasSession = (id) => !!DEV.sessions[id];

function normalize(p) {
  for (const k of ['materias', 'clases', 'tareas', 'faltas', 'temas']) if (!Array.isArray(p[k])) p[k] = [];
  if (!p.estudio || typeof p.estudio !== 'object') p.estudio = {};
  if (p.minAprob == null) p.minAprob = 70;
  if (p.asistMin == null) p.asistMin = 80;
  for (const m of p.materias) if (!Array.isArray(m.criterios)) m.criterios = [];
  return p;
}
function mutate(fn, opts = {}) {
  fn(S.data);
  Store.save();
  render();
  if (S.sheet && opts.sheet !== false) refreshSheet();
}

function semestreGuess() {
  const d = new Date(), y = d.getFullYear();
  return d.getMonth() >= 6 ? { inicio: `${y}-08-10`, fin: `${y}-12-11` } : { inicio: `${y}-01-12`, fin: `${y}-05-29` };
}
function newProfile(o) {
  const now = Date.now();
  return normalize({
    id: o.id || 'p' + uid(), createdAt: now, updatedAt: 0,
    nombre: o.nombre || 'Mi perfil', carrera: o.carrera || '', semestre: o.semestre || '',
    inicio: o.inicio || '', fin: o.fin || '', color: o.color || TINCIONES[0].c,
    minAprob: 70, asistMin: 80
  });
}

/* =========================================================
   Cálculos
   ========================================================= */
const mat = (id) => P().materias.find((m) => m.id === id);
const matName = (id) => (mat(id) || {}).nombre || 'General';
const matColor = (id) => (mat(id) || {}).color || '#6B7280';
const byDue = (a, b) => (a.fecha + (a.hora || '23:59')).localeCompare(b.fecha + (b.hora || '23:59'));
const enSemestre = (p, d) => (!p.inicio || d >= p.inicio) && (!p.fin || d <= p.fin);
const clasesDelDia = (p, d) => enSemestre(p, d) ? p.clases.filter((c) => c.dia === dow(d) && mat(c.materiaId)).sort((a, b) => toMin(a.inicio) - toMin(b.inicio)) : [];
const semanas = (p) => (p.inicio && p.fin && p.fin > p.inicio) ? Math.max(1, Math.round((diffDays(p.inicio, p.fin) + 1) / 7)) : 16;
const sesiones = (p, m) => (num(m.sesiones) || p.clases.filter((c) => c.materiaId === m.id).length * semanas(p));
const maxFaltas = (p, m) => Math.floor(sesiones(p, m) * (1 - (p.asistMin || 80) / 100));
const faltasDe = (p, m) => p.faltas.filter((f) => f.materiaId === m.id).length;

function grade(m, minAprob) {
  const cr = m.criterios || [];
  const pesoTotal = cr.reduce((s, c) => s + (num(c.peso) || 0), 0);
  const ev = cr.filter((c) => num(c.cal) != null);
  const pesoEval = ev.reduce((s, c) => s + (num(c.peso) || 0), 0);
  const puntos = ev.reduce((s, c) => s + num(c.cal) * (num(c.peso) || 0) / 100, 0);
  const actual = pesoEval > 0 ? puntos / pesoEval * 100 : null;
  const rest = Math.max(0, 100 - pesoEval);
  const need = (t) => rest > 0 ? (t - puntos) / rest * 100 : null;
  return { pesoTotal, pesoEval, puntos, actual, rest, need, needMin: need(minAprob) };
}

function dueLabel(t) {
  const d = diffDays(today(), t.fecha);
  const h = t.hora ? ' ' + t.hora : '';
  if (t.hecha) return { txt: fmtDate(t.fecha), cls: '' };
  if (d < 0) return { txt: d === -1 ? 'Venció ayer' : `Venció hace ${-d} días`, cls: 'over' };
  if (d === 0) return { txt: 'Hoy' + h, cls: 'soon' };
  if (d === 1) return { txt: 'Mañana' + h, cls: 'soon' };
  if (d <= 6) return { txt: DIAS[dow(t.fecha) - 1] + h, cls: '' };
  return { txt: fmtDate(t.fecha) + h, cls: '' };
}

function alertas(p) {
  const t = today(), out = [];
  const pend = p.tareas.filter((x) => !x.hecha).sort(byDue);
  for (const x of pend.filter((x) => x.fecha < t)) out.push({ lvl: 'bad', k: 'Atrasada', txt: `${x.titulo} · ${matName(x.materiaId)}`, act: 'editTask', id: x.id });
  for (const x of pend.filter((x) => x.fecha === t)) out.push({ lvl: 'warn', k: 'Hoy', txt: `${x.titulo} · ${matName(x.materiaId)}${x.hora ? ' · ' + x.hora : ''}`, act: 'editTask', id: x.id });
  for (const x of pend.filter((x) => x.fecha === addDays(t, 1))) out.push({ lvl: '', k: 'Mañana', txt: `${x.titulo} · ${matName(x.materiaId)}`, act: 'editTask', id: x.id });
  for (const x of pend.filter((x) => x.tipo === 'Examen' && x.fecha > addDays(t, 1) && x.fecha <= addDays(t, 10))) {
    const d = diffDays(t, x.fecha);
    out.push({ lvl: d <= 3 ? 'warn' : '', k: `Examen en ${d} días`, txt: `${x.titulo} · ${matName(x.materiaId)}`, act: 'editTask', id: x.id });
  }
  for (const m of p.materias) {
    const mx = maxFaltas(p, m), f = faltasDe(p, m);
    if (mx > 0 || f > 0) {
      if (f > mx) out.push({ lvl: 'bad', k: 'Faltas', txt: `En ${m.nombre} pasaste el límite (${f} de ${mx}). Revisa tu derecho a ordinario.`, act: 'openMat', id: m.id });
      else if (f === mx && f > 0) out.push({ lvl: 'bad', k: 'Faltas', txt: `En ${m.nombre} ya no puedes faltar (${f} de ${mx}).`, act: 'openMat', id: m.id });
      else if (mx - f === 1) out.push({ lvl: 'warn', k: 'Faltas', txt: `En ${m.nombre} solo te queda 1 falta.`, act: 'openMat', id: m.id });
    }
    const g = grade(m, p.minAprob);
    if (g.pesoEval > 0 && g.rest > 0 && g.needMin != null) {
      if (g.needMin > 100) out.push({ lvl: 'bad', k: 'Calificación', txt: `En ${m.nombre} ya no alcanza el ${p.minAprob} aunque saques 100. Habla con tu profesor.`, act: 'openMat', id: m.id });
      else if (g.needMin > 85) out.push({ lvl: 'warn', k: 'Calificación', txt: `En ${m.nombre} necesitas promediar ${Math.ceil(g.needMin)} en lo que falta para aprobar.`, act: 'openMat', id: m.id });
    } else if (g.pesoEval >= 100 && g.puntos < p.minAprob) {
      out.push({ lvl: 'bad', k: 'Calificación', txt: `${m.nombre} quedó en ${round1(g.puntos)}.`, act: 'openMat', id: m.id });
    }
  }
  const rep = p.temas.filter((x) => x.proximo <= t).length;
  if (rep) out.push({ lvl: '', k: 'Repaso', txt: `${rep} ${rep === 1 ? 'tema' : 'temas'} para repasar hoy.`, act: 'tab', id: 'estudio' });
  return out;
}

/* =========================================================
   Google Calendar (botón "Agregar a mi calendario")
   ========================================================= */
function gcalLink({ title, date, start, end, details, location, rrule }) {
  const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'America/Mexico_City';
  const f = (d, t) => d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00';
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: f(date, start) + '/' + f(date, end), ctz: tz });
  if (details) q.set('details', details);
  if (location) q.set('location', location);
  if (rrule) q.set('recur', 'RRULE:' + rrule);
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
function gcalTarea(t) {
  const h = toMin(t.hora || '23:59');
  const m = matName(t.materiaId);
  const details = [t.notas, 'Agregado desde Expediente Escolar.'].filter(Boolean).join('\n\n');
  if (t.tipo === 'Examen') return gcalLink({ title: `Examen: ${t.titulo} (${m})`, date: t.fecha, start: minToT(h), end: minToT(h + 120), details });
  return gcalLink({ title: `Entrega: ${t.titulo} (${m})`, date: t.fecha, start: minToT(h - 60), end: minToT(h), details });
}
function gcalClase(p, c) {
  const m = mat(c.materiaId) || {};
  let d = p.inicio && p.inicio > today() ? p.inicio : today();
  while (dow(d) !== c.dia) d = addDays(d, 1);
  const rrule = `FREQ=WEEKLY;BYDAY=${BYDAY[c.dia - 1]};` + (p.fin ? `UNTIL=${addDays(p.fin, 1).replace(/-/g, '')}T055959Z` : 'COUNT=16');
  return gcalLink({
    title: `${m.nombre}${c.tipo && c.tipo !== 'Teoría' ? ' · ' + c.tipo : ''}`, date: d, start: c.inicio, end: c.fin, rrule,
    location: c.salon || m.salon || '', details: [m.profe ? 'Profesor(a): ' + m.profe : '', 'Agregado desde Expediente Escolar.'].filter(Boolean).join('\n')
  });
}

/* =========================================================
   Piezas de interfaz
   ========================================================= */
const chip = (mid) => `<span class="chip" style="--c:${esc(matColor(mid))}">${esc(matName(mid))}</span>`;
function taskRow(t) {
  const dl = dueLabel(t);
  return `<div class="task${t.hecha ? ' done' : ''}">
    <button class="check" data-act="toggle" data-id="${t.id}" aria-label="${t.hecha ? 'Marcar como pendiente' : 'Marcar como hecha'}">${I.check}</button>
    <div class="tmain" data-act="editTask" data-id="${t.id}" role="button" tabindex="0">
      <div class="ttl">${t.importante ? '<span class="star" aria-label="Importante">●</span> ' : ''}${esc(t.titulo)}</div>
      <div class="meta">${chip(t.materiaId)}<span>${esc(t.tipo)}</span><span class="due ${dl.cls}">${esc(dl.txt)}</span></div>
    </div>
    <a class="gcal" href="${esc(gcalTarea(t))}" target="_blank" rel="noopener" title="Agregar a Google Calendar" aria-label="Agregar ${esc(t.titulo)} a Google Calendar">${I.gcal}</a>
  </div>`;
}
const emptyNote = (txt) => `<p class="empty">${txt}</p>`;

function syncPill() {
  if (!S.data) return '';
  if (S.data.id === DEMO) return '<span class="sync"><i></i>Ejemplo</span>';
  if (!hasSession(S.data.id)) return '<button id="sync" class="sync off" data-act="sync"><i></i>Entrar con PIN</button>';
  const map = { ok: ['ok', 'Guardado'], busy: ['busy', 'Guardando…'], pending: ['off', 'Sin conexión'] };
  const [cls, txt] = map[Store.status] || map.pending;
  return `<button id="sync" class="sync ${cls}" data-act="sync" title="Se guarda en tu hoja de Google"><i></i>${txt}</button>`;
}
function renderSync() { const el = $('#sync'); if (el) el.outerHTML = syncPill(); }
const inicial = (n) => esc((n || '?').trim().charAt(0).toUpperCase());

/* =========================================================
   Vistas
   ========================================================= */
function render() {
  const app = $('#app');
  if (!S.data) { app.innerHTML = viewPicker(); return; }
  const p = normalize(P());
  const due = p.tareas.filter((x) => !x.hecha && x.fecha <= today()).length;
  const rep = p.temas.filter((x) => x.proximo <= today()).length;
  const tabs = [
    ['hoy', 'Hoy', I.hoy, due], ['calendario', 'Calendario', I.cal, 0], ['tareas', 'Tareas', I.tareas, 0],
    ['materias', 'Materias', I.materias, 0], ['estudio', 'Estudio', I.estudio, rep]
  ];
  const views = { hoy: viewHoy, calendario: viewCalendario, tareas: viewTareas, materias: viewMaterias, estudio: viewEstudio };
  app.innerHTML = `<div class="shell">
    <header class="top">
      <div class="brand">${LOGO}<div><b>Expediente Escolar</b><small>${esc([p.carrera, p.semestre].filter(Boolean).join(' · ') || 'Tu semestre en orden')}</small></div></div>
      ${syncPill()}
      <button class="profile-chip" data-act="perfil" aria-label="Perfiles y ajustes"><span class="av" style="--c:${esc(p.color)}">${inicial(p.nombre)}</span><span>${esc(p.nombre)}</span></button>
    </header>
    <nav class="nav" aria-label="Secciones">${tabs.map(([k, n, ic, b]) => `<button data-act="tab" data-id="${k}" ${S.tab === k ? 'aria-current="page"' : ''}><span class="badge">${ic}${b ? `<b>${b}</b>` : ''}</span><span>${n}</span></button>`).join('')}</nav>
    <main>${(views[S.tab] || viewHoy)(p)}</main>
  </div>`;
  if (S.tab === 'estudio') Timer.paint();
}

function viewPicker() {
  const ps = S.perfiles;
  const demo = Store.local(DEMO);
  const aviso = !API
    ? '<div class="notice warn">Falta conectar la hoja de Google (la dirección que termina en /exec) en el archivo config.js. Mientras tanto puedes explorar el perfil de ejemplo.</div>'
    : S.offline && !ps.length ? '<div class="notice warn">No hay conexión con la hoja de Google. Revisa tu internet y vuelve a abrir la app.</div>' : '';
  return `<div class="shell"><div class="welcome">
    <div class="hero">
      <div class="stain-strip">${TINCIONES.slice(0, 6).map((t) => `<i style="--c:${t.c}"></i>`).join('')}</div>
      <span class="eyebrow">Expediente Escolar</span>
      <h1>${ps.length ? '¿Quién va a usar la app?' : 'Tu semestre, en un solo lugar'}</h1>
      <p>${ps.length ? 'Toca tu nombre y escribe tu PIN. Solo te lo pide la primera vez en cada dispositivo.' : 'Horario, tareas por materia, calificaciones, faltas y repasos. Crea tu perfil con un PIN para empezar.'}</p>
    </div>
    ${aviso}
    ${ps.length ? `<div class="plist">${ps.map((p) => `<button class="pbtn" data-act="pick" data-id="${esc(p.id)}"><span class="av" style="--c:${esc(p.color)}">${inicial(p.nombre)}</span><span class="pn">${esc(p.nombre)}</span><span class="muted small">${hasSession(p.id) ? 'Abrir' : 'Con PIN'}</span></button>`).join('')}</div>` : ''}
    <div class="row">${API ? `<button class="btn primary" data-act="newPerfil">${I.plus} ${ps.length ? 'Nuevo perfil' : 'Crear mi perfil'}</button>` : ''}<button class="btn ghost" data-act="ejemplo">${demo ? 'Abrir' : 'Explorar'} el perfil de ejemplo</button></div>
  </div></div>`;
}

function profileFields(p, isNew) {
  return `<label class="f">Nombre<input id="pf-nombre" name="nombre" required maxlength="40" value="${esc(p.nombre || '')}" placeholder="Ej. Daniel"></label>
    <div class="two">
      <label class="f">Carrera<input id="pf-carrera" name="carrera" maxlength="60" value="${esc(p.carrera || '')}" placeholder="Ej. Médico Cirujano"></label>
      <label class="f">Semestre<input id="pf-semestre" name="semestre" maxlength="30" value="${esc(p.semestre || '')}" placeholder="Ej. 3er semestre"></label>
    </div>
    <div class="two">
      <label class="f">Inicio de clases<input id="pf-inicio" name="inicio" type="date" value="${esc(p.inicio || '')}"></label>
      <label class="f">Fin de clases<input id="pf-fin" name="fin" type="date" value="${esc(p.fin || '')}"></label>
    </div>
    ${isNew ? '' : `<div class="two">
      <label class="f">Calificación mínima para aprobar<input id="pf-min" name="minAprob" type="number" min="1" max="100" value="${esc(p.minAprob)}"></label>
      <label class="f">Asistencia mínima (%)<input id="pf-asist" name="asistMin" type="number" min="0" max="100" value="${esc(p.asistMin)}"></label>
    </div>`}
    <div class="f" style="display:grid;gap:6px"><span class="small muted" style="font-weight:700">Color</span>${swatches('pcolor', p.color)}</div>`;
}
function swatches(name, cur) {
  return `<div class="swatches" role="radiogroup">${TINCIONES.map((t, i) => `<label><input type="radio" name="${name}" value="${t.c}" ${(cur || TINCIONES[0].c) === t.c ? 'checked' : ''} id="${name}-${i}"><span style="--c:${t.c}">${t.n}</span></label>`).join('')}</div>`;
}

/* ---------- Hoy ---------- */
function viewHoy(p) {
  const t = today(), nm = nowMin();
  const pend = p.tareas.filter((x) => !x.hecha).sort(byDue);
  const over = pend.filter((x) => x.fecha < t).length;
  const semana = pend.filter((x) => x.fecha >= t && x.fecha <= addDays(t, 6)).length;
  const ex = pend.find((x) => x.tipo === 'Examen' && x.fecha >= t);
  const exD = ex ? diffDays(t, ex.fecha) : null;
  const al = alertas(p);
  const proximas = pend.filter((x) => x.fecha <= addDays(t, 7)).slice(0, 8);

  const clases = clasesDelDia(p, t);
  let siguiente = null;
  for (let i = 1; i <= 7 && !clases.length && !siguiente; i++) { const c = clasesDelDia(p, addDays(t, i)); if (c.length) siguiente = { d: addDays(t, i), c: c[0] }; }
  const tl = clases.map((c) => {
    const st = toMin(c.inicio), en = toMin(c.fin);
    const cls = nm >= st && nm < en ? 'now' : nm >= en ? 'past' : '';
    const tag = cls === 'now' ? '<span class="pill hema">Ahora</span>' : (cls === '' && clases.find((k) => toMin(k.inicio) > nm) === c ? '<span class="pill">Siguiente</span>' : '');
    return `<div class="slot ${cls}"><div class="hr"><b>${c.inicio}</b>${c.fin}</div><div style="min-width:0"><div style="font-weight:700">${esc(matName(c.materiaId))}</div><div class="meta">${esc(c.tipo || '')}${c.salon || (mat(c.materiaId) || {}).salon ? ' · ' + esc(c.salon || mat(c.materiaId).salon) : ''}</div></div>${tag}</div>`;
  }).join('');

  const reps = p.temas.filter((x) => x.proximo <= t);
  const semMin = minutosSemana(p);
  const totalMin = Object.values(semMin).reduce((a, b) => a + b, 0);

  const sinMaterias = !p.materias.length
    ? `<div class="notice" style="margin-bottom:20px"><b>Empieza por tus materias.</b> Registra cada materia con su horario de clases; después podrás agregar tareas, calificaciones y faltas. <div class="row" style="margin-top:10px"><button class="btn primary sm" data-act="newMat">${I.plus} Agregar materia</button></div></div>` : '';

  return `<div class="page-head"><div><span class="eyebrow">${esc(fmtLong(t))}</span><h1>Hola, ${esc(p.nombre)}</h1></div><button class="btn primary" data-act="newTask">${I.plus} Nueva tarea</button></div>
  ${sinMaterias}
  <div class="statline">
    <div class="stat"><b class="mono">${semana}</b><span>Pendientes en 7 días</span></div>
    <div class="stat ${over ? 'bad' : ''}"><b class="mono">${over}</b><span>Atrasadas</span></div>
    <div class="stat"><b class="mono">${exD == null ? '—' : exD === 0 ? 'Hoy' : exD + ' d'}</b><span>${ex ? 'Examen: ' + esc(matName(ex.materiaId)) : 'Sin exámenes próximos'}</span></div>
  </div>
  <div class="grid2">
    <div class="stack">
      <section class="panel"><div class="panel-head"><h2>Avisos</h2><span class="pill">${al.length}</span></div>
        ${al.length ? `<div class="alerts">${al.slice(0, 10).map((a) => `<div class="alert ${a.lvl}" data-act="${a.act}" data-id="${a.id}" role="button" tabindex="0" style="cursor:pointer"><b class="k">${esc(a.k)}</b><span>${esc(a.txt)}</span></div>`).join('')}</div>` : emptyNote('Todo en orden. No tienes nada atrasado ni urgente.')}
      </section>
      <section class="panel"><div class="panel-head"><h2>Próximas entregas</h2><button class="btn sm" data-act="tab" data-id="tareas">Ver todas</button></div>
        ${proximas.length ? `<div class="tlist">${proximas.map(taskRow).join('')}</div>` : emptyNote('Nada para los próximos 7 días.')}
      </section>
    </div>
    <div class="stack">
      <section class="panel"><div class="panel-head"><h2>Clases de hoy</h2><button class="btn sm" data-act="tab" data-id="calendario">Horario</button></div>
        ${clases.length ? `<div class="timeline">${tl}</div>` : emptyNote(siguiente ? `Hoy no tienes clases. La siguiente es ${esc(matName(siguiente.c.materiaId))}, el ${esc(fmtLong(siguiente.d).toLowerCase())} a las ${siguiente.c.inicio}.` : 'Hoy no tienes clases registradas.')}
      </section>
      <section class="panel"><div class="panel-head"><h2>Repasos de hoy</h2><button class="btn sm" data-act="tab" data-id="estudio">Repasar</button></div>
        ${reps.length ? `<div class="mini-list">${reps.slice(0, 4).map((x) => `<div><span style="min-width:0">${esc(x.titulo)}</span>${chip(x.materiaId)}</div>`).join('')}</div>${reps.length > 4 ? `<p class="muted small" style="margin:8px 0 0">y ${reps.length - 4} más</p>` : ''}` : emptyNote('No tienes temas pendientes de repaso. Agrega los temas que ves en clase y la app te dirá cuándo repasarlos.')}
      </section>
      <section class="panel"><div class="panel-head"><h2>Estudio esta semana</h2><b class="mono">${fmtMin(totalMin)}</b></div>${barras(semMin)}</section>
    </div>
  </div>`;
}
function fmtMin(m) { const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h ${pad(r)} min` : `${r} min`; }
function minutosSemana(p) {
  const mon = mondayOf(today()), out = {};
  for (let i = 0; i < 7; i++) { const d = p.estudio[addDays(mon, i)] || {}; for (const [k, v] of Object.entries(d)) out[k] = (out[k] || 0) + v; }
  return out;
}
function barras(semMin) {
  const e = Object.entries(semMin).sort((a, b) => b[1] - a[1]);
  if (!e.length) return emptyNote('Usa el temporizador de la sección Estudio y aquí verás tus horas por materia.');
  const max = Math.max(...e.map((x) => x[1]));
  return `<div class="bars">${e.map(([k, v]) => `<div class="bar"><span class="bl">${esc(matName(k))}</span><div class="meter" style="--c:${esc(matColor(k))}"><i style="width:${Math.max(4, v / max * 100)}%"></i></div><span class="bt">${fmtMin(v)}</span></div>`).join('')}</div>`;
}

/* ---------- Calendario ---------- */
function viewCalendario(p) {
  const isW = S.cal.mode === 'semana';
  let label, body;
  if (isW) {
    const mon = mondayOf(S.cal.ref), sun = addDays(mon, 6), a = parseYmd(mon), b = parseYmd(sun);
    label = a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${MESES[b.getMonth()].slice(0, 3)}` : `${a.getDate()} ${MESES[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MESES[b.getMonth()].slice(0, 3)}`;
    body = viewSemana(p, mon);
  } else {
    const r = parseYmd(S.cal.ref);
    label = `${MESES[r.getMonth()][0].toUpperCase() + MESES[r.getMonth()].slice(1)} ${r.getFullYear()}`;
    body = viewMes(p, r);
  }
  return `<div class="page-head"><div><span class="eyebrow">Calendario</span><h1>${isW ? 'Tu semana' : 'Tu mes'}</h1></div>
    <div class="row"><button class="btn" data-act="newMat">${I.plus} Materia</button><button class="btn primary" data-act="newTask" data-date="${S.cal.sel}">${I.plus} Tarea</button></div></div>
  <div class="cal-head">
    <div class="seg" role="group" aria-label="Vista"><button data-act="calMode" data-id="semana" aria-pressed="${isW}">Semana</button><button data-act="calMode" data-id="mes" aria-pressed="${!isW}">Mes</button></div>
    <div class="cal-nav"><button class="btn sm" data-act="calNav" data-id="-1" aria-label="Anterior">${I.l}</button><strong>${label}</strong><button class="btn sm" data-act="calNav" data-id="1" aria-label="Siguiente">${I.r}</button><button class="btn sm ghost" data-act="calNav" data-id="0">Hoy</button></div>
  </div>
  ${body}`;
}
function viewSemana(p, mon) {
  const t = today(), days = [...Array(7)].map((_, i) => addDays(mon, i));
  let minH = 7, maxH = 19;
  for (const c of p.clases) { minH = Math.min(minH, Math.floor(toMin(c.inicio) / 60)); maxH = Math.max(maxH, Math.ceil(toMin(c.fin) / 60)); }
  const SL = 15, H = 12, rows = (maxH - minH) * 60 / SL;
  const showWeekend = p.clases.some((c) => c.dia >= 6) || days.slice(5).some((d) => p.tareas.some((x) => x.fecha === d));
  const nd = showWeekend ? 7 : 5;
  const R = (min) => 3 + Math.round((min - minH * 60) / SL);
  let html = `<div class="week" style="grid-template-columns:48px repeat(${nd}, minmax(0,1fr));grid-template-rows:auto auto repeat(${rows}, ${H}px);${nd === 5 ? 'min-width:560px' : ''}">`;
  html += `<div style="grid-column:1;grid-row:1" class="wh"></div><div style="grid-column:1;grid-row:2" class="dues hlab">Entregas</div>`;
  for (let i = 0; i < nd; i++) {
    const d = days[i];
    html += `<div class="wh ${d === t ? 'today' : ''}" style="grid-column:${i + 2};grid-row:1">${DIAS_C[i]}<b>${parseYmd(d).getDate()}</b></div>`;
    const ts = p.tareas.filter((x) => x.fecha === d).sort(byDue);
    html += `<div class="dues" style="grid-column:${i + 2};grid-row:2">${ts.map((x) => `<button class="${x.tipo === 'Examen' ? 'ex' : ''} ${x.hecha ? 'done' : ''}" style="--c:${esc(matColor(x.materiaId))}" data-act="editTask" data-id="${x.id}" title="${esc(x.titulo)}">${esc(x.titulo)}</button>`).join('')}</div>`;
    if (d === t) html += `<div class="colbg today" style="grid-column:${i + 2};grid-row:3 / span ${rows}"></div>`;
  }
  for (let h = minH; h < maxH; h++) {
    html += `<div class="hl" style="grid-row:${R(h * 60)}"></div><div class="hlab" style="grid-column:1;grid-row:${R(h * 60)} / span 4">${pad(h)}:00</div>`;
  }
  for (let i = 0; i < nd; i++) {
    for (const c of clasesDelDia(p, days[i])) {
      const m = mat(c.materiaId);
      html += `<button class="cls" style="--c:${esc(m.color)};grid-column:${i + 2};grid-row:${R(toMin(c.inicio))} / ${Math.max(R(toMin(c.inicio)) + 2, R(toMin(c.fin)))}" data-act="openMat" data-id="${m.id}"><b>${esc(m.nombre)}</b>${c.inicio}–${c.fin}${c.salon || m.salon ? ' · ' + esc(c.salon || m.salon) : ''}</button>`;
    }
  }
  html += '</div>';
  const pend = p.tareas.filter((x) => x.fecha >= days[0] && x.fecha <= days[6]).sort(byDue);
  const noClases = !p.clases.length ? `<div class="notice" style="margin-bottom:12px">Aún no hay clases en tu horario. Abre una materia y agrega sus días y horas.</div>` : '';
  return `${noClases}<div class="week-wrap">${html}</div>
    <section class="panel daylist"><div class="panel-head"><h2>Entregas de esta semana</h2></div>${pend.length ? `<div class="tlist">${pend.map(taskRow).join('')}</div>` : emptyNote('Sin entregas esta semana.')}</section>`;
}
function viewMes(p, r) {
  const t = today(), first = ymd(new Date(r.getFullYear(), r.getMonth(), 1));
  const dim = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  const start = mondayOf(first), weeks = Math.ceil((dow(first) - 1 + dim) / 7);
  let cells = DIAS_C.map((d) => `<div class="dh">${d}</div>`).join('');
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i), out = parseYmd(d).getMonth() !== r.getMonth();
    const ts = p.tareas.filter((x) => x.fecha === d).sort((a, b) => (b.tipo === 'Examen') - (a.tipo === 'Examen') || byDue(a, b));
    const evs = ts.slice(0, 3).map((x) => `<span class="ev ${x.tipo === 'Examen' ? 'ex' : ''}" style="--c:${esc(matColor(x.materiaId))}">${esc(x.titulo)}</span>`).join('') + (ts.length > 3 ? `<span class="ev" style="--c:var(--ink-2)">+${ts.length - 3}</span>` : '');
    const dots = ts.slice(0, 4).map((x) => `<i class="dot" style="--c:${esc(matColor(x.materiaId))}"></i>`).join('');
    cells += `<button class="day ${out ? 'out' : ''} ${d === t ? 'today' : ''}" data-act="selDay" data-id="${d}" aria-pressed="${d === S.cal.sel}" aria-label="${esc(fmtLong(d))}, ${ts.length} entregas"><span class="n">${parseYmd(d).getDate()}</span>${evs}<span class="dots">${dots}</span></button>`;
  }
  const sel = S.cal.sel, cl = clasesDelDia(p, sel), ts = p.tareas.filter((x) => x.fecha === sel).sort(byDue);
  return `<div class="month">${cells}</div>
  <section class="panel daylist"><div class="panel-head"><h2>${esc(fmtLong(sel))}</h2><button class="btn sm" data-act="newTask" data-date="${sel}">${I.plus} Tarea este día</button></div>
    ${cl.length ? `<div class="timeline" style="margin-bottom:10px">${cl.map((c) => `<div class="slot"><div class="hr"><b>${c.inicio}</b>${c.fin}</div><div>${chip(c.materiaId)} <span class="muted small">${esc(c.tipo || '')}</span></div><span></span></div>`).join('')}</div>` : ''}
    ${ts.length ? `<div class="tlist">${ts.map(taskRow).join('')}</div>` : emptyNote(cl.length ? 'Sin entregas este día.' : 'Sin clases ni entregas este día.')}
  </section>`;
}

/* ---------- Tareas ---------- */
function viewTareas(p) {
  const t = today();
  const f = S.fMat;
  let ts = p.tareas.filter((x) => f === 'todas' || x.materiaId === f);
  const chips = `<div class="chips" role="group" aria-label="Filtrar por materia"><button class="fchip" data-act="fMat" data-id="todas" aria-pressed="${f === 'todas'}">Todas</button>${p.materias.map((m) => `<button class="fchip" data-act="fMat" data-id="${m.id}" aria-pressed="${f === m.id}"><span class="dot" style="--c:${esc(m.color)}"></span>${esc(m.nombre)}</button>`).join('')}</div>`;
  let body;
  if (S.tVista === 'pendientes') {
    ts = ts.filter((x) => !x.hecha).sort(byDue);
    const groups = [
      ['Atrasadas', ts.filter((x) => x.fecha < t)], ['Hoy', ts.filter((x) => x.fecha === t)], ['Mañana', ts.filter((x) => x.fecha === addDays(t, 1))],
      ['Esta semana', ts.filter((x) => x.fecha > addDays(t, 1) && x.fecha <= addDays(t, 7))], ['Más adelante', ts.filter((x) => x.fecha > addDays(t, 7))]
    ].filter((g) => g[1].length);
    body = groups.length ? groups.map(([n, l]) => `<h3 class="group-title">${n} <span class="pill ${n === 'Atrasadas' ? 'bad' : ''}">${l.length}</span></h3><div class="tlist">${l.map(taskRow).join('')}</div>`).join('') : emptyNote(p.materias.length ? 'No tienes tareas pendientes. Agrega una con el botón Nueva tarea.' : 'Primero agrega tus materias en la sección Materias.');
  } else {
    ts = ts.filter((x) => x.hecha).sort((a, b) => byDue(b, a)).slice(0, 60);
    body = ts.length ? `<div class="tlist">${ts.map(taskRow).join('')}</div>` : emptyNote('Aún no has marcado tareas como hechas.');
  }
  const nPend = p.tareas.filter((x) => !x.hecha).length;
  return `<div class="page-head"><div><span class="eyebrow">Tareas</span><h1>${nPend} pendientes</h1></div><button class="btn primary" data-act="newTask">${I.plus} Nueva tarea</button></div>
    <div style="display:grid;gap:12px;margin-bottom:14px">${chips}<div class="seg" role="group" aria-label="Mostrar" style="justify-self:start"><button data-act="tVista" data-id="pendientes" aria-pressed="${S.tVista === 'pendientes'}">Pendientes</button><button data-act="tVista" data-id="hechas" aria-pressed="${S.tVista === 'hechas'}">Hechas</button></div></div>
    <section class="panel">${body}</section>`;
}

/* ---------- Materias ---------- */
function viewMaterias(p) {
  const cards = p.materias.map((m) => {
    const g = grade(m, p.minAprob), mx = maxFaltas(p, m), f = faltasDe(p, m);
    const cls = p.clases.filter((c) => c.materiaId === m.id).sort((a, b) => a.dia - b.dia || toMin(a.inicio) - toMin(b.inicio));
    const horario = cls.length ? cls.map((c) => `${DIAS_C[c.dia - 1]} ${c.inicio}`).join(' · ') : 'Sin horario';
    const prom = g.actual == null ? '—' : round1(g.actual);
    const promCls = g.actual == null ? '' : g.actual >= p.minAprob ? 'ok' : g.actual >= p.minAprob - 10 ? 'warn' : 'bad';
    const fCls = f > mx ? 'bad' : (mx - f) <= 1 && f > 0 ? 'warn' : '';
    const pend = p.tareas.filter((x) => x.materiaId === m.id && !x.hecha).length;
    return `<button class="mcard" data-act="openMat" data-id="${m.id}" style="--c:${esc(m.color)}">
      <div class="mh"><span class="sw"></span><div style="min-width:0"><h3>${esc(m.nombre)}</h3><div class="sub">${esc([m.profe, m.salon].filter(Boolean).join(' · ') || 'Toca para agregar profesor y salón')}</div></div></div>
      <div class="sub mono">${esc(horario)}</div>
      <div class="mstats"><div class="${promCls}"><b>${prom}</b><span>Promedio</span></div><div class="${fCls}"><b>${f}/${mx}</b><span>Faltas</span></div><div><b>${pend}</b><span>Pendientes</span></div></div>
    </button>`;
  }).join('');
  return `<div class="page-head"><div><span class="eyebrow">Materias</span><h1>${p.materias.length} ${p.materias.length === 1 ? 'materia' : 'materias'}</h1><p>Aprobatoria: ${esc(p.minAprob)} · Asistencia mínima: ${esc(p.asistMin)}% · <a href="#" data-act="perfil">cambiar</a></p></div><button class="btn primary" data-act="newMat">${I.plus} Agregar materia</button></div>
    ${p.materias.length ? `<div class="mgrid">${cards}</div>` : `<section class="panel">${emptyNote('Todavía no hay materias. Agrega la primera con su horario de clases.')}</section>`}`;
}

/* ---------- Estudio ---------- */
function viewEstudio(p) {
  const t = today();
  const due = p.temas.filter((x) => x.proximo <= t).sort((a, b) => a.proximo.localeCompare(b.proximo));
  const prox = p.temas.filter((x) => x.proximo > t).sort((a, b) => a.proximo.localeCompare(b.proximo));
  const opts = `<option value="">General</option>` + p.materias.map((m) => `<option value="${m.id}" ${Timer.materiaId === m.id ? 'selected' : ''}>${esc(m.nombre)}</option>`).join('');
  const lvl = (n) => `<span class="lvl" aria-label="Nivel ${n + 1} de ${INTERVALOS.length}">${INTERVALOS.map((_, i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  return `<div class="page-head"><div><span class="eyebrow">Estudio</span><h1>Concentración y repaso</h1></div></div>
  <div class="grid2">
    <div class="stack">
      <section class="panel"><div class="panel-head"><h2>Temporizador</h2><div class="seg" role="group" aria-label="Duración">${PRESETS.map((x, i) => `<button data-act="preset" data-id="${i}" aria-pressed="${Timer.preset === i}">${x.f}/${x.b}</button>`).join('')}</div></div>
        <div class="timer">
          <div class="ring ${Timer.mode === 'break' ? 'brk' : ''}" id="tm-ring"><svg viewBox="0 0 120 120"><circle class="bgc" cx="60" cy="60" r="52"/><circle class="fgc" id="tm-arc" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="0"/></svg><div class="lbl"><b id="tm-time">25:00</b><span id="tm-mode">Bloque de estudio</span></div></div>
          <label class="f" style="width:min(320px,100%)">Materia<select id="tm-mat">${opts}</select></label>
          <div class="row" style="justify-content:center"><button class="btn primary" data-act="tmStart" id="tm-start">Iniciar</button><button class="btn" data-act="tmReset">Reiniciar</button><button class="btn ghost" data-act="tmSkip">Saltar</button></div>
          <p class="muted small" style="margin:0;max-width:44ch">Al terminar cada bloque se suma el tiempo a la materia. Deja el celular boca abajo y estudia sin interrupciones.</p>
        </div>
      </section>
      <section class="panel"><div class="panel-head"><h2>Esta semana</h2><b class="mono">${fmtMin(Object.values(minutosSemana(p)).reduce((a, b) => a + b, 0))}</b></div>${barras(minutosSemana(p))}</section>
    </div>
    <div class="stack">
      <section class="panel"><div class="panel-head"><h2>Repaso espaciado</h2><span class="pill ${due.length ? 'hema' : ''}">${due.length} hoy</span></div>
        <p class="muted small" style="margin:0 0 12px">Registra cada tema que ves en clase. La app te lo pide de nuevo a los 1, 3, 7, 14, 30, 60 y 120 días. Antes de abrir tus apuntes, intenta explicarlo de memoria y luego revisa qué te faltó.</p>
        <form id="f-tema" class="row" autocomplete="off" style="margin-bottom:12px"><select id="tema-mat" class="btn" style="flex:0 1 160px;font-weight:400" aria-label="Materia">${p.materias.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('') || '<option value="">General</option>'}</select><input id="tema-tit" class="btn" style="flex:1 1 160px;font-weight:400;text-align:left;cursor:text" required maxlength="120" placeholder="Ej. Ciclo de Krebs"><button class="btn primary" type="submit">${I.plus} Agregar</button></form>
        ${due.length ? due.map((x) => `<div class="review"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b style="min-width:0;overflow-wrap:anywhere">${esc(x.titulo)}</b>${lvl(x.nivel)}</div><div class="meta">${chip(x.materiaId)}<span>${x.proximo < t ? `Pendiente desde ${esc(fmtDate(x.proximo))}` : 'Para hoy'}</span></div>
          <div class="row"><button class="btn sm" data-act="rev" data-id="${x.id}" data-r="olvide">Lo olvidé</button><button class="btn sm" data-act="rev" data-id="${x.id}" data-r="costo">Me costó</button><button class="btn sm primary" data-act="rev" data-id="${x.id}" data-r="bien">Lo recordé</button></div></div>`).join('') : emptyNote(p.temas.length ? 'Ya repasaste todo lo de hoy.' : 'Aún no hay temas. Agrega el primero arriba.')}
        ${prox.length ? `<details style="margin-top:12px"><summary class="small" style="cursor:pointer;font-weight:700">Próximos repasos (${prox.length})</summary><div class="mini-list" style="margin-top:8px">${prox.map((x) => `<div><span style="min-width:0;overflow-wrap:anywhere">${esc(x.titulo)} <span class="muted small">· ${esc(matName(x.materiaId))}</span></span><span class="row" style="flex-wrap:nowrap"><span class="mono small">${esc(fmtDate(x.proximo))}</span><button class="btn sm ghost" data-act="delTema" data-id="${x.id}" aria-label="Borrar tema">${I.x}</button></span></div>`).join('')}</div></details>` : ''}
      </section>
    </div>
  </div>`;
}

/* =========================================================
   Hojas emergentes (formularios y detalle)
   ========================================================= */
function openSheet(html, info) {
  const body = $('#sheet-body');
  const keep = S.sheet && info && S.sheet.type === info.type && S.sheet.id === info.id ? $('.sheet').scrollTop : 0;
  S.sheet = info;
  body.innerHTML = html;
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
  $('.sheet').scrollTop = keep;
  if (!keep) { const f = body.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea'); if (f && matchMedia('(min-width: 700px)').matches) f.focus(); }
}
function closeSheet() { $('#sheet').hidden = true; S.sheet = null; document.body.style.overflow = ''; }
function refreshSheet() {
  if (!S.sheet) return;
  const { type, id } = S.sheet;
  if (type === 'mat') { if (mat(id)) openMat(id); else closeSheet(); }
  else if (type === 'perfil') openPerfil();
  else if (type === 'task' || type === 'pin' || type === 'newperfil' || type === 'newmat') return;
}
const sheetTop = (title, extra = '') => `<div class="sheet-top"><h2 id="sheet-title">${title}</h2><div class="row">${extra}<button class="btn sm ghost" data-act="close" aria-label="Cerrar">${I.x}</button></div></div>`;

function openTask(id, date) {
  const p = P();
  const t = id ? p.tareas.find((x) => x.id === id) : null;
  const d = t || { titulo: '', materiaId: S.fMat !== 'todas' ? S.fMat : (p.materias[0] || {}).id || '', tipo: 'Tarea', fecha: date || addDays(today(), 1), hora: '23:59', notas: '', importante: false };
  const opts = p.materias.map((m) => `<option value="${m.id}" ${d.materiaId === m.id ? 'selected' : ''}>${esc(m.nombre)}</option>`).join('') + `<option value="" ${!d.materiaId ? 'selected' : ''}>General</option>`;
  openSheet(`${sheetTop(t ? 'Editar tarea' : 'Nueva tarea', t ? `<a class="btn sm" href="${esc(gcalTarea(t))}" target="_blank" rel="noopener">${I.gcal} Agregar a Google Calendar</a>` : '')}
    <form id="f-task" class="form" data-id="${t ? t.id : ''}" autocomplete="off">
      <label class="f">¿Qué hay que hacer?<input id="t-titulo" required maxlength="140" value="${esc(d.titulo)}" placeholder="Ej. Reporte de práctica de histología"></label>
      <div class="two"><label class="f">Materia<select id="t-mat">${opts}</select></label><label class="f">Tipo<select id="t-tipo">${TIPOS_TAREA.map((x) => `<option ${x === d.tipo ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>
      <div class="two"><label class="f">Fecha de entrega<input id="t-fecha" type="date" required value="${esc(d.fecha)}"></label><label class="f">Hora<input id="t-hora" type="time" value="${esc(d.hora || '23:59')}"></label></div>
      <label class="f">Notas<textarea id="t-notas" maxlength="1000" placeholder="Temas, páginas, formato de entrega…">${esc(d.notas || '')}</textarea></label>
      <label class="check-line"><input type="checkbox" id="t-imp" ${d.importante ? 'checked' : ''}><span>Marcar como importante</span></label>
      <label class="check-line" id="t-plan-line" ${!t && d.tipo === 'Examen' ? '' : 'hidden'}><input type="checkbox" id="t-plan" checked><span>Crear sesiones de estudio 7, 3 y 1 día antes del examen</span></label>
      <div class="row" style="justify-content:space-between;margin-top:6px">${t ? `<button type="button" class="btn danger" data-act="delTask" data-id="${t.id}" data-confirm="1">Eliminar</button>` : '<span></span>'}<button class="btn primary" type="submit">${t ? 'Guardar cambios' : 'Agregar tarea'}</button></div>
      <p class="muted small" style="margin:0">El botón de Google Calendar agrega la entrega a tu calendario; Google te avisará según los recordatorios de tu calendario.</p>
    </form>`, { type: 'task', id });
}

function openMatForm(id) {
  const m = id ? mat(id) : { nombre: '', profe: '', salon: '', color: TINCIONES[P().materias.length % TINCIONES.length].c, sesiones: '' };
  return `<form id="f-mat" class="form" data-id="${id || ''}" autocomplete="off">
    <label class="f">Nombre de la materia<input id="m-nombre" required maxlength="60" value="${esc(m.nombre)}" placeholder="Ej. Anatomía Humana"></label>
    <div class="two"><label class="f">Profesor(a)<input id="m-profe" maxlength="60" value="${esc(m.profe || '')}"></label><label class="f">Salón<input id="m-salon" maxlength="40" value="${esc(m.salon || '')}"></label></div>
    <div class="f" style="display:grid;gap:6px"><span class="small muted" style="font-weight:700">Color</span>${swatches('mcolor', m.color)}</div>
    ${id ? `<label class="f">Clases en el semestre (opcional)<input id="m-ses" type="number" min="1" max="400" value="${esc(m.sesiones || '')}" placeholder="Se calcula con tu horario: ${sesiones(P(), m)}"></label>` : ''}
    <div class="row" style="justify-content:flex-end"><button class="btn primary" type="submit">${id ? 'Guardar datos' : 'Crear materia'}</button></div>
  </form>`;
}
function openNewMat() {
  openSheet(`${sheetTop('Nueva materia')}${openMatForm(null)}<p class="muted small">Después de crearla podrás agregar sus clases, criterios de evaluación y faltas.</p>`, { type: 'newmat' });
}
function openMat(id) {
  const p = P(), m = mat(id);
  if (!m) return;
  const g = grade(m, p.minAprob), mx = maxFaltas(p, m), fl = p.faltas.filter((f) => f.materiaId === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const cls = p.clases.filter((c) => c.materiaId === id).sort((a, b) => a.dia - b.dia || toMin(a.inicio) - toMin(b.inicio));
  const tgt = (v) => g.rest <= 0 ? null : g.need(v);
  const fmtNeed = (v) => v == null ? '—' : v <= 0 ? '✓' : v > 100 ? '>100' : Math.ceil(v);

  let verdict = '';
  if (!m.criterios.length) verdict = '';
  else if (g.pesoEval === 0) verdict = `<div class="verdict">Aún no capturas calificaciones. Escríbelas en la columna Calificación conforme te las entreguen.</div>`;
  else if (g.rest <= 0) verdict = `<div class="verdict ${g.puntos >= p.minAprob ? 'ok' : 'bad'}">Calificación final: <b class="mono">${round1(g.puntos)}</b>. ${g.puntos >= p.minAprob ? 'Aprobada.' : `Por debajo del ${p.minAprob}.`}</div>`;
  else if (g.needMin <= 0) verdict = `<div class="verdict ok">Ya tienes asegurado el ${p.minAprob}. Llevas <b class="mono">${round1(g.puntos)}</b> puntos de ${round1(g.pesoEval)} posibles.</div>`;
  else if (g.needMin > 100) verdict = `<div class="verdict bad">Aunque saques 100 en lo que falta, no alcanzas el ${p.minAprob}. Habla con tu profesor sobre opciones como extraordinario.</div>`;
  else verdict = `<div class="verdict ${g.needMin > 85 ? 'warn' : ''}">Para aprobar necesitas promediar <b class="mono">${Math.ceil(g.needMin)}</b> en lo que falta (${round1(g.rest)}% de la calificación). Llevas ${round1(g.puntos)} de ${round1(g.pesoEval)} puntos posibles.</div>`;
  const warnPeso = m.criterios.length && Math.abs(g.pesoTotal - 100) > 0.01 ? `<p class="small" style="color:var(--warn);margin:8px 0 0">Los porcentajes suman ${round1(g.pesoTotal)}%. Deberían sumar 100%.</p>` : '';

  openSheet(`${sheetTop(`<span class="row" style="flex-wrap:nowrap"><span class="dot" style="--c:${esc(m.color)};width:14px;height:14px"></span>${esc(m.nombre)}</span>`)}
    <h3>Evaluación</h3>
    ${m.criterios.length ? `<div class="crit crit-head"><span>Criterio</span><span>Valor</span><span>Calificación</span><span></span></div>${m.criterios.map((c) => `<div class="crit"><span class="cn">${esc(c.nombre)}</span><span class="mono small">${esc(c.peso)}%</span><input id="cal-${c.id}" type="number" inputmode="decimal" min="0" max="100" step="0.1" data-crit="${c.id}" data-mat="${id}" value="${c.cal == null ? '' : esc(c.cal)}" placeholder="—" aria-label="Calificación de ${esc(c.nombre)}"><button class="btn sm ghost" data-act="delCrit" data-id="${c.id}" data-mat="${id}" aria-label="Borrar ${esc(c.nombre)}">${I.x}</button></div>`).join('')}` :
      `<p class="muted small" style="margin:0 0 10px">Agrega cómo te evalúan (parciales, prácticas, final) con su porcentaje. Revisa el encuadre que te dio tu profesor.</p><button class="btn sm" data-act="plantilla" data-id="${id}">Usar plantilla: 3 parciales 20% c/u, prácticas 20%, final 20%</button>`}
    ${warnPeso}
    <form id="f-crit" data-mat="${id}" class="row" style="margin-top:10px" autocomplete="off"><input id="cr-nombre" class="btn" style="flex:1 1 150px;font-weight:400;text-align:left;cursor:text" required maxlength="40" placeholder="Criterio, ej. Parcial 1"><input id="cr-peso" class="btn" type="number" min="1" max="100" step="0.5" style="flex:0 0 90px;font-weight:400;cursor:text" required placeholder="%"><button class="btn" type="submit">${I.plus} Agregar</button></form>
    ${verdict}
    ${g.pesoEval > 0 && g.rest > 0 ? `<div class="targets"><div><b>${fmtNeed(tgt(p.minAprob))}</b><span>para ${p.minAprob}</span></div><div><b>${fmtNeed(tgt(80))}</b><span>para 80</span></div><div><b>${fmtNeed(tgt(90))}</b><span>para 90</span></div></div>` : ''}
    <hr class="section-sep">
    <h3>Faltas</h3>
    <div class="meter" style="--c:${faltasDe(p, m) > mx ? 'var(--eosin)' : faltasDe(p, m) >= mx ? 'var(--warn)' : 'var(--ok)'}"><i style="width:${mx ? clamp(faltasDe(p, m) / mx * 100, 2, 100) : faltasDe(p, m) ? 100 : 2}%"></i></div>
    <p class="small" style="margin:8px 0">Llevas <b>${faltasDe(p, m)}</b> de <b>${mx}</b> faltas permitidas (asistencia mínima ${p.asistMin}% de unas ${sesiones(p, m)} clases). Ajusta el porcentaje al reglamento de tu escuela.</p>
    <form id="f-falta" data-mat="${id}" class="row" autocomplete="off"><input id="fa-fecha" class="btn" type="date" value="${today()}" style="font-weight:400" aria-label="Fecha de la falta"><button class="btn" type="submit">${I.plus} Registrar falta</button></form>
    ${fl.length ? `<div class="mini-list" style="margin-top:8px">${fl.map((f) => `<div><span class="mono small">${esc(fmtDate(f.fecha))}</span><button class="btn sm ghost" data-act="delFalta" data-id="${f.id}" aria-label="Borrar falta">${I.x}</button></div>`).join('')}</div>` : ''}
    <hr class="section-sep">
    <h3>Horario de clases</h3>
    ${cls.length ? `<div class="mini-list">${cls.map((c) => `<div><span><b>${DIAS[c.dia - 1]}</b> <span class="mono small">${c.inicio}–${c.fin}</span> <span class="muted small">${esc([c.tipo, c.salon].filter(Boolean).join(' · '))}</span></span><span class="row" style="flex-wrap:nowrap"><a class="gcal" href="${esc(gcalClase(p, c))}" target="_blank" rel="noopener" title="Agregar a Google Calendar (cada semana)" aria-label="Agregar clase a Google Calendar">${I.gcal}</a><button class="btn sm ghost" data-act="delClase" data-id="${c.id}" aria-label="Borrar clase">${I.x}</button></span></div>`).join('')}</div>` : '<p class="muted small" style="margin:0">Sin clases todavía.</p>'}
    <form id="f-clase" data-mat="${id}" class="form" style="margin-top:12px" autocomplete="off">
      <div class="three"><label class="f">Día<select id="c-dia">${DIAS.map((d, i) => `<option value="${i + 1}">${d}</option>`).join('')}</select></label><label class="f">Inicio<input id="c-ini" type="time" required value="07:00"></label><label class="f">Fin<input id="c-fin" type="time" required value="09:00"></label></div>
      <div class="two"><label class="f">Tipo<select id="c-tipo">${TIPOS_CLASE.map((x) => `<option>${x}</option>`).join('')}</select></label><label class="f">Salón (si cambia)<input id="c-salon" maxlength="40" placeholder="${esc(m.salon || 'Ej. Anfiteatro')}"></label></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="submit">${I.plus} Agregar clase</button></div>
    </form>
    <p class="muted small">El botón de calendario en cada clase la agrega a Google Calendar repitiéndose cada semana hasta el fin del semestre.</p>
    <hr class="section-sep">
    <h3>Datos de la materia</h3>
    ${openMatForm(id)}
    <hr class="section-sep">
    <button class="btn danger" data-act="delMat" data-id="${id}" data-confirm="1">Eliminar materia (con sus clases, tareas y faltas)</button>`, { type: 'mat', id });
}

function openPerfil() {
  const p = P();
  const isDemo = p.id === DEMO;
  const lista = [...S.perfiles];
  if (Store.local(DEMO) && !lista.some((x) => x.id === DEMO)) lista.push({ id: DEMO, nombre: 'Perfil de ejemplo', color: TINCIONES[5].c });
  const when = Store.last ? new Date(Store.last).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : null;
  const guardado = isDemo
    ? '<p class="small muted" style="margin:0">El perfil de ejemplo solo vive en este dispositivo y no se guarda en la hoja.</p>'
    : `<p class="small" style="margin:0">Tus datos se guardan en la hoja de Google de la app${when ? `; último guardado a las ${when}` : ''}. En este dispositivo también queda una copia, así que funciona sin internet y sube los cambios cuando vuelve la conexión.</p>`;
  const nSup = 'Notification' in window;
  const nState = !nSup ? 'unsupported' : Notification.permission;
  const avisos = !nSup
    ? '<p class="small muted">Este navegador no permite avisos. En iPhone, primero agrega la app a tu pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ahí.</p>'
    : `<label class="check-line"><input type="checkbox" id="n-on" ${DEV.notif.on && nState === 'granted' ? 'checked' : ''}><span>Avisarme de clases, entregas, exámenes y repasos</span></label>
       <label class="f" style="margin-top:10px;max-width:260px">Aviso antes de cada clase<select id="n-min">${[5, 10, 15, 30].map((v) => `<option value="${v}" ${DEV.notif.claseMin === v ? 'selected' : ''}>${v} minutos antes</option>`).join('')}</select></label>
       ${nState === 'denied' ? '<p class="small" style="color:var(--eosin)">Los avisos están bloqueados para esta página. Actívalos en la configuración del navegador.</p>' : ''}
       <p class="muted small">Estos avisos llegan mientras la app está abierta o en segundo plano. Para recibirlos aunque la cierres, usa los botones de Google Calendar en tus tareas y clases.</p>`;
  const pinBox = (field, label) => `<label class="f">${label}<input id="${field}" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="6" required autocomplete="off"></label>`;
  openSheet(`${sheetTop('Perfiles y ajustes')}
    <h3>Perfiles</h3>
    <div class="mini-list">${lista.map((o) => `<div><span class="row" style="flex-wrap:nowrap;min-width:0"><span class="av" style="--c:${esc(o.color)}">${inicial(o.nombre)}</span><b style="min-width:0;overflow-wrap:anywhere">${esc(o.nombre)}</b></span>${o.id === p.id ? '<span class="pill hema">En uso</span>' : `<button class="btn sm" data-act="pick" data-id="${esc(o.id)}">${hasSession(o.id) ? 'Cambiar' : 'Entrar con PIN'}</button>`}</div>`).join('')}</div>
    <div class="row" style="margin-top:10px">${API ? `<button class="btn" data-act="newPerfil">${I.plus} Nuevo perfil</button>` : ''}<button class="btn ghost" data-act="lista">Ver pantalla de perfiles</button></div>
    <hr class="section-sep">
    <h3>Editar «${esc(p.nombre)}»</h3>
    <form id="f-perfil" class="form" autocomplete="off">${profileFields(p, false)}<div class="row" style="justify-content:flex-end"><button class="btn primary" type="submit">Guardar perfil</button></div></form>
    <hr class="section-sep">
    <h3>Dónde se guarda</h3>${guardado}
    ${isDemo ? '' : `<hr class="section-sep">
    <h3>Cambiar PIN</h3>
    <form id="f-pinchg" class="form" autocomplete="off"><div class="two">${pinBox('pc-act', 'PIN actual')}${pinBox('pc-new', 'PIN nuevo')}</div><div class="row" style="justify-content:flex-end"><button class="btn" type="submit">Cambiar PIN</button></div></form>
    <p class="muted small">Al cambiarlo se cierra la sesión de este perfil en los demás dispositivos.</p>`}
    <hr class="section-sep">
    <h3>Avisos en este dispositivo</h3>${avisos}
    <hr class="section-sep">
    <h3>Copia de seguridad</h3>
    <p class="muted small" style="margin:0 0 10px">Descarga un archivo con los datos de este perfil, o recupera uno que guardaste antes (reemplaza lo que hay ahora).</p>
    <div class="row"><button class="btn" data-act="export">Descargar copia</button><label class="btn" for="imp-file">Recuperar copia<input id="imp-file" type="file" accept="application/json,.json" hidden></label></div>
    <hr class="section-sep">
    ${isDemo ? '<button class="btn danger" data-act="delDemo" data-confirm="1">Borrar el perfil de ejemplo</button>' : `<div class="row"><button class="btn danger" data-act="logout" data-confirm="1">Cerrar sesión de «${esc(p.nombre)}» en este dispositivo</button></div>
    <p class="muted small">Para volver a entrar te pedirá tu PIN. Tus datos siguen guardados en la hoja.</p>
    <details style="margin-top:12px"><summary class="small" style="cursor:pointer;font-weight:700;color:var(--eosin)">Eliminar este perfil para siempre</summary>
      <form id="f-borrar" class="form" style="margin-top:10px" autocomplete="off"><p class="small" style="margin:0">Se borran todas sus materias, tareas y calificaciones. No se puede deshacer.</p>${pinBox('pb-pin', 'Escribe tu PIN para confirmar')}<div class="row"><button class="btn danger" type="submit">Eliminar perfil</button></div></form>
    </details>`}`, { type: 'perfil' });
}
function openNewPerfil() {
  const g = semestreGuess();
  const anyToken = Object.entries(DEV.sessions).find(([k]) => k !== DEMO);
  openSheet(`${sheetTop('Nuevo perfil')}<p class="muted small" style="margin-top:0">Cada persona tiene su propio perfil con PIN. También sirve para llevar otro ciclo o una segunda carrera.</p>
    <form id="f-nuevo" class="form" autocomplete="off">${profileFields({ inicio: g.inicio, fin: g.fin, color: TINCIONES[S.perfiles.length % TINCIONES.length].c }, true)}
      <div class="two"><label class="f">PIN (4 a 6 números)<input id="pf-pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="6" required autocomplete="off"></label><label class="f">Repite el PIN<input id="pf-pin2" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="6" required autocomplete="off"></label></div>
      ${anyToken ? '' : '<label class="f">Código de instalación<input id="pf-codigo" inputmode="numeric" required maxlength="10" autocomplete="off" placeholder="Te lo da quien instaló la app"></label><p class="muted small" style="margin:-4px 0 0">Solo se pide en un dispositivo donde todavía nadie ha entrado.</p>'}
      <p class="small" id="pf-err" role="alert" style="color:var(--eosin);margin:0"></p>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" type="submit" id="pf-btn">Crear perfil</button></div></form>`, { type: 'newperfil' });
}
function openPin(id) {
  const m = S.perfiles.find((p) => p.id === id) || { nombre: 'Perfil', color: TINCIONES[0].c };
  openSheet(`${sheetTop(`<span class="row" style="flex-wrap:nowrap"><span class="av" style="--c:${esc(m.color)}">${inicial(m.nombre)}</span>${esc(m.nombre)}</span>`)}
    <form id="f-pin" class="form" data-id="${esc(id)}" autocomplete="off">
      <label class="f">Escribe tu PIN<input id="pin-in" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="6" required autocomplete="off" style="font-size:1.4rem;letter-spacing:.4em;text-align:center"></label>
      <p class="small" id="pin-err" role="alert" style="color:var(--eosin);margin:0"></p>
      <button class="btn primary" type="submit" id="pin-btn">Entrar</button>
      <p class="muted small" style="margin:0">Solo te lo pide la primera vez en este dispositivo. Si lo olvidaste, alguien con acceso a la hoja de Google puede ayudarte a recuperar tus datos.</p>
    </form>`, { type: 'pin', id });
  setTimeout(() => { const i = $('#pin-in'); if (i) i.focus(); }, 60);
}

/* =========================================================
   Temporizador
   ========================================================= */
const Timer = {
  preset: 0, mode: 'focus', running: false, endAt: 0, remaining: PRESETS[0].f * 60, materiaId: '', iv: null, audio: null,
  total() { return (this.mode === 'focus' ? PRESETS[this.preset].f : PRESETS[this.preset].b) * 60; },
  start() {
    if (this.running) { this.remaining = Math.max(0, (this.endAt - Date.now()) / 1000); this.running = false; clearInterval(this.iv); this.paint(); return; }
    try { if (!this.audio) this.audio = new (window.AudioContext || window.webkitAudioContext)(); this.audio.resume(); } catch (e) { /* sin sonido */ }
    this.running = true; this.endAt = Date.now() + this.remaining * 1000;
    clearInterval(this.iv); this.iv = setInterval(() => this.tick(), 500); this.paint();
  },
  tick() {
    if (!this.running) return;
    this.remaining = Math.max(0, (this.endAt - Date.now()) / 1000);
    if (this.remaining <= 0) this.finish(); else this.paint();
  },
  log(min) {
    if (min < 1) return;
    const key = this.materiaId || '';
    mutate((p) => {
      const d = today();
      p.estudio[d] = p.estudio[d] || {};
      p.estudio[d][key] = (p.estudio[d][key] || 0) + Math.round(min);
      const cut = addDays(d, -150);
      for (const k of Object.keys(p.estudio)) if (k < cut) delete p.estudio[k];
    }, { sheet: false });
  },
  finish() {
    clearInterval(this.iv); this.running = false;
    this.beep();
    if (this.mode === 'focus') {
      const f = PRESETS[this.preset].f;
      this.mode = 'break'; this.remaining = PRESETS[this.preset].b * 60;
      this.log(f);
      Notif.show('Bloque terminado', `Sumaste ${f} min de estudio. Descansa ${PRESETS[this.preset].b} minutos.`, 'timer');
      toast(`Buen trabajo: ${f} minutos. Toma un descanso.`);
    } else {
      this.mode = 'focus'; this.remaining = PRESETS[this.preset].f * 60;
      Notif.show('Fin del descanso', 'Listo para otro bloque de estudio.', 'timer');
      toast('Terminó el descanso.');
    }
    this.paint();
  },
  reset() {
    if (this.mode === 'focus') {
      const done = (this.total() - (this.running ? Math.max(0, (this.endAt - Date.now()) / 1000) : this.remaining)) / 60;
      if (done >= 5) { this.log(Math.floor(done)); toast(`Se guardaron ${Math.floor(done)} minutos de estudio.`); }
    }
    clearInterval(this.iv); this.running = false; this.mode = 'focus'; this.remaining = PRESETS[this.preset].f * 60; this.paint();
  },
  skip() { if (this.mode === 'focus') { this.reset(); this.mode = 'break'; this.remaining = PRESETS[this.preset].b * 60; } else { this.reset(); } this.paint(); },
  setPreset(i) { if (this.running) return toast('Pausa o reinicia el temporizador para cambiar la duración.'); this.preset = i; this.mode = 'focus'; this.remaining = PRESETS[i].f * 60; render(); },
  beep() {
    try {
      const a = this.audio; if (!a) return;
      [0, 0.35, 0.7].forEach((t) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.3); o.connect(g).connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.32); });
    } catch (e) { /* sin sonido */ }
  },
  paint() {
    const tEl = $('#tm-time'); if (!tEl) return;
    const s = Math.ceil(this.remaining);
    tEl.textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
    $('#tm-mode').textContent = this.mode === 'focus' ? 'Bloque de estudio' : 'Descanso';
    $('#tm-ring').classList.toggle('brk', this.mode === 'break');
    $('#tm-arc').setAttribute('stroke-dashoffset', String(326.7 * (1 - this.remaining / this.total())));
    $('#tm-start').textContent = this.running ? 'Pausar' : (this.remaining < this.total() ? 'Continuar' : 'Iniciar');
  }
};

/* =========================================================
   Avisos del navegador
   ========================================================= */
const Notif = {
  async show(title, body, tag) {
    if (!DEV.notif.on || !('Notification' in window) || Notification.permission !== 'granted') return;
    const opts = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) await reg.showNotification(title, opts); else new Notification(title, opts);
    } catch (e) { try { new Notification(title, opts); } catch (e2) { /* nada */ } }
  },
  mark(k) { DEV.notified[k] = Date.now(); },
  check() {
    if (!DEV.notif.on || !S.data) return;
    const p = P(), t = today(), nm = nowMin(), now = Date.now();
    for (const [k, v] of Object.entries(DEV.notified)) if (now - v > 4 * 86400000) delete DEV.notified[k];
    let changed = false;
    for (const c of clasesDelDia(p, t)) {
      const st = toMin(c.inicio), k = `c:${c.id}:${t}`;
      if (nm >= st - DEV.notif.claseMin && nm < st && !DEV.notified[k]) {
        this.mark(k); changed = true;
        this.show(`${matName(c.materiaId)} en ${st - nm} min`, `${c.inicio}–${c.fin}${c.salon || (mat(c.materiaId) || {}).salon ? ' · ' + (c.salon || mat(c.materiaId).salon) : ''}`, k);
      }
    }
    for (const x of p.tareas) {
      if (x.hecha) continue;
      const due = parseYmd(x.fecha).getTime() + toMin(x.hora || '23:59') * 60000;
      if (now >= due) continue;
      const ths = x.tipo === 'Examen' ? [3, 24, 72] : [3, 24];
      const hit = ths.filter((h) => now >= due - h * 3600000);
      if (!hit.length) continue;
      const k = `t:${x.id}:${hit[0]}`;
      if (DEV.notified[k]) continue;
      hit.forEach((h) => this.mark(`t:${x.id}:${h}`)); changed = true;
      const hrs = Math.round((due - now) / 3600000);
      const cuando = hrs < 1 ? 'en menos de una hora' : hrs < 24 ? `en ${hrs} h` : `en ${Math.round(hrs / 24)} días`;
      this.show(`${x.tipo === 'Examen' ? 'Examen' : 'Entrega'} ${cuando}`, `${x.titulo} · ${matName(x.materiaId)}`, k);
    }
    const rep = p.temas.filter((x) => x.proximo <= t).length;
    if (rep && nm >= 8 * 60 && !DEV.notified['r:' + t]) {
      this.mark('r:' + t); changed = true;
      this.show('Repasos de hoy', `${rep} ${rep === 1 ? 'tema' : 'temas'} para repasar.`, 'r:' + t);
    }
    if (changed) saveDev();
  }
};

/* =========================================================
   Perfil de ejemplo
   ========================================================= */
function makeEjemplo() {
  const t = today();
  const p = newProfile({ id: DEMO, nombre: 'Perfil de ejemplo', carrera: 'Médico Cirujano', semestre: '3er semestre', ...semestreGuess(), color: TINCIONES[5].c });
  const M = (nombre, color, profe, salon) => ({ id: 'm' + uid(), nombre, color, profe, salon, criterios: [] });
  const ana = M('Anatomía Humana', TINCIONES[0].c, 'Dra. Ramírez', 'Anfiteatro 2');
  const fis = M('Fisiología', TINCIONES[1].c, 'Dr. Ortega', 'Aula 14');
  const bio = M('Bioquímica Médica', TINCIONES[3].c, 'Dra. Salinas', 'Aula 9');
  const his = M('Histología', TINCIONES[2].c, 'Dr. Méndez', 'Lab. de microscopía');
  const sp = M('Salud Pública', TINCIONES[4].c, 'Mtra. Cruz', 'Aula 3');
  p.materias = [ana, fis, bio, his, sp];
  const C = (m, dia, a, b, tipo, salon) => ({ id: 'c' + uid(), materiaId: m.id, dia, inicio: a, fin: b, tipo, salon: salon || '' });
  p.clases = [
    C(ana, 1, '07:00', '09:00', 'Teoría'), C(ana, 3, '07:00', '09:00', 'Teoría'), C(ana, 5, '08:00', '11:00', 'Práctica', 'Anfiteatro 1'),
    C(fis, 1, '09:00', '11:00', 'Teoría'), C(fis, 4, '09:00', '11:00', 'Teoría'),
    C(bio, 2, '07:00', '09:00', 'Teoría'), C(bio, 4, '12:00', '14:00', 'Laboratorio', 'Lab. 3'),
    C(his, 2, '11:00', '13:00', 'Teoría'), C(his, 3, '11:00', '14:00', 'Laboratorio'),
    C(sp, 1, '12:00', '14:00', 'Seminario'), C(sp, 5, '12:00', '13:00', 'Teoría')
  ];
  const T = (m, titulo, tipo, d, hora, extra = {}) => ({ id: 't' + uid(), materiaId: m.id, titulo, tipo, fecha: addDays(t, d), hora, notas: '', importante: false, hecha: false, ...extra });
  p.tareas = [
    T(his, 'Reporte de práctica: tejido epitelial', 'Práctica', -1, '23:59'),
    T(fis, 'Cuestionario de potencial de acción', 'Tarea', 0, '22:00'),
    T(ana, 'Láminas de miembro superior', 'Tarea', 1, '07:00'),
    T(bio, 'Segundo parcial: metabolismo de carbohidratos', 'Examen', 5, '07:00', { importante: true, notas: 'Glucólisis, gluconeogénesis, ciclo de Krebs y vía de las pentosas.' }),
    T(sp, 'Ensayo sobre determinantes sociales de la salud', 'Proyecto', 9, '23:59'),
    T(ana, 'Examen práctico de anfiteatro', 'Examen', 12, '08:00'),
    T(fis, 'Lectura: Guyton cap. 5', 'Lectura', -3, '23:59', { hecha: true })
  ];
  p.tareas.push(T(bio, 'Estudiar para Segundo parcial: metabolismo de carbohidratos', 'Estudio', 2, '18:00'));
  p.tareas.push(T(bio, 'Estudiar para Segundo parcial: metabolismo de carbohidratos', 'Estudio', 4, '18:00'));
  const K = (nombre, peso, cal) => ({ id: 'k' + uid(), nombre, peso, cal });
  ana.criterios = [K('Parcial 1', 20, 82), K('Parcial 2', 20, 76), K('Parcial 3', 20, null), K('Prácticas de anfiteatro', 20, 90), K('Final', 20, null)];
  fis.criterios = [K('Parcial 1', 30, 64), K('Parcial 2', 30, null), K('Tareas', 10, 85), K('Final', 30, null)];
  bio.criterios = [K('Parcial 1', 25, 88), K('Parcial 2', 25, null), K('Laboratorio', 20, 92), K('Final', 30, null)];
  his.criterios = [K('Parciales', 50, 79), K('Laboratorio', 30, null), K('Final', 20, null)];
  p.faltas = [{ id: 'f' + uid(), materiaId: fis.id, fecha: addDays(t, -9) }, { id: 'f' + uid(), materiaId: fis.id, fecha: addDays(t, -16) }, { id: 'f' + uid(), materiaId: fis.id, fecha: addDays(t, -23) }, { id: 'f' + uid(), materiaId: sp.id, fecha: addDays(t, -4) }];
  const R = (m, titulo, nivel, d) => ({ id: 'r' + uid(), materiaId: m.id, titulo, nivel, proximo: addDays(t, d), creado: addDays(t, -10) });
  p.temas = [R(bio, 'Ciclo de Krebs', 2, 0), R(ana, 'Plexo braquial', 1, 0), R(fis, 'Bomba sodio-potasio', 0, -1), R(his, 'Tipos de epitelio', 3, 4), R(ana, 'Irrigación del miembro superior', 1, 2)];
  const mon = mondayOf(t);
  for (let i = 0; i < Math.min(dow(t), 5); i++) p.estudio[addDays(mon, i)] = { [bio.id]: 50, [ana.id]: i % 2 ? 25 : 50 };
  return p;
}

/* =========================================================
   Eventos
   ========================================================= */
let toastT = null;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 3200);
}
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, id = el.dataset.id;
  if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault();
  if (el.dataset.confirm && !el.dataset.armed) {
    el.dataset.armed = '1'; el.classList.add('armed'); el.dataset.txt = el.textContent; el.textContent = 'Toca otra vez para confirmar';
    setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.classList.remove('armed'); el.textContent = el.dataset.txt; } }, 4000);
    return;
  }
  switch (act) {
    case 'tab': S.tab = id; closeSheet(); render(); window.scrollTo(0, 0); break;
    case 'close': closeSheet(); break;
    case 'perfil': openPerfil(); break;
    case 'newPerfil': openNewPerfil(); break;
    case 'pick':
      closeSheet();
      if (hasSession(id) || id === DEMO) { S.tab = 'hoy'; Store.activate(id); }
      else openPin(id);
      break;
    case 'lista': closeSheet(); DEV.active = null; saveDev(); S.data = null; render(); Store.refreshList().then(() => { if (!S.data) render(); }); break;
    case 'ejemplo':
      if (!Store.local(DEMO)) LS.set(Store.key(DEMO), makeEjemplo());
      DEV.sessions[DEMO] = 'local'; saveDev(); S.tab = 'hoy';
      Store.activate(DEMO);
      toast('Este es un perfil de ejemplo. Puedes borrarlo en Perfiles y ajustes.');
      break;
    case 'delDemo': LS.del(Store.key(DEMO)); delete DEV.sessions[DEMO]; DEV.active = null; saveDev(); S.data = null; closeSheet(); render(); toast('Perfil de ejemplo borrado.'); break;
    case 'newTask': openTask(null, el.dataset.date); break;
    case 'editTask': openTask(id); break;
    case 'toggle': mutate((p) => { const t = p.tareas.find((x) => x.id === id); if (t) { t.hecha = !t.hecha; if (t.hecha) toast('¡Hecha!'); } }); break;
    case 'delTask': closeSheet(); mutate((p) => { p.tareas = p.tareas.filter((x) => x.id !== id); }); toast('Tarea eliminada.'); break;
    case 'newMat': openNewMat(); break;
    case 'openMat': openMat(id); break;
    case 'delMat': closeSheet(); mutate((p) => {
      p.materias = p.materias.filter((m) => m.id !== id);
      for (const k of ['clases', 'tareas', 'faltas', 'temas']) p[k] = p[k].filter((x) => x.materiaId !== id);
    }); toast('Materia eliminada.'); break;
    case 'plantilla': mutate((p) => { const m = p.materias.find((x) => x.id === id); m.criterios = [['Parcial 1', 20], ['Parcial 2', 20], ['Parcial 3', 20], ['Prácticas', 20], ['Final', 20]].map(([n, w]) => ({ id: 'k' + uid(), nombre: n, peso: w, cal: null })); }); break;
    case 'delCrit': mutate((p) => { const m = p.materias.find((x) => x.id === el.dataset.mat); m.criterios = m.criterios.filter((c) => c.id !== id); }); break;
    case 'delFalta': mutate((p) => { p.faltas = p.faltas.filter((f) => f.id !== id); }); break;
    case 'delClase': mutate((p) => { p.clases = p.clases.filter((c) => c.id !== id); }); break;
    case 'calMode': S.cal.mode = id; render(); break;
    case 'calNav': {
      const n = Number(id);
      if (n === 0) { S.cal.ref = today(); S.cal.sel = today(); }
      else if (S.cal.mode === 'semana') S.cal.ref = addDays(S.cal.ref, 7 * n);
      else { const r = parseYmd(S.cal.ref); S.cal.ref = ymd(new Date(r.getFullYear(), r.getMonth() + n, 1)); }
      render(); break;
    }
    case 'selDay': S.cal.sel = id; render(); break;
    case 'fMat': S.fMat = id; render(); break;
    case 'tVista': S.tVista = id; render(); break;
    case 'preset': Timer.setPreset(Number(id)); break;
    case 'tmStart': Timer.start(); break;
    case 'tmReset': Timer.reset(); break;
    case 'tmSkip': Timer.skip(); break;
    case 'rev': mutate((p) => {
      const x = p.temas.find((k) => k.id === id); if (!x) return;
      const r = el.dataset.r, t = today();
      if (r === 'bien') { x.nivel = Math.min(x.nivel + 1, INTERVALOS.length - 1); x.proximo = addDays(t, INTERVALOS[x.nivel]); }
      else if (r === 'costo') { x.proximo = addDays(t, Math.max(1, Math.round(INTERVALOS[x.nivel] / 2))); }
      else { x.nivel = 0; x.proximo = addDays(t, 1); }
      toast(`Siguiente repaso: ${fmtDate(x.proximo)}.`);
    }); break;
    case 'delTema': mutate((p) => { p.temas = p.temas.filter((x) => x.id !== id); }); break;
    case 'sync':
      if (!S.data || S.data.id === DEMO) break;
      if (!hasSession(S.data.id)) { openPin(S.data.id); break; }
      await Store.pull();
      if (Store.status === 'ok') toast('Todo guardado en la hoja.'); else toast('Sin conexión. Tus cambios están en este dispositivo y se subirán después.');
      break;
    case 'logout': {
      const pid = S.data.id, tok = DEV.sessions[pid];
      if (Store.isDirty(pid)) await Store.push();
      if (Store.isDirty(pid)) { toast('Hay cambios sin subir. Conéctate a internet antes de cerrar sesión.'); break; }
      if (tok) api({ action: 'salir', token: tok }, 8000).catch(() => {});
      delete DEV.sessions[pid]; LS.del(Store.key(pid)); LS.del(Store.dirtyKey(pid));
      DEV.active = null; saveDev(); S.data = null;
      closeSheet(); render(); toast('Sesión cerrada en este dispositivo.');
      break;
    }
    case 'export': {
      const blob = new Blob([JSON.stringify(S.data, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `expediente-${(S.data.nombre || 'perfil').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${today()}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      break;
    }
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.sheet) closeSheet();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.crit) {
    const v = el.value === '' ? null : clamp(num(el.value) ?? 0, 0, 100);
    mutate((p) => { const m = p.materias.find((x) => x.id === el.dataset.mat); const c = m && m.criterios.find((k) => k.id === el.dataset.crit); if (c) c.cal = v; });
  } else if (el.id === 't-tipo') {
    const line = $('#t-plan-line'); if (line && !$('#f-task').dataset.id) line.hidden = el.value !== 'Examen';
  } else if (el.id === 'tm-mat') {
    Timer.materiaId = el.value;
  } else if (el.id === 'n-on') {
    if (el.checked) {
      const r = await Notification.requestPermission();
      DEV.notif.on = r === 'granted';
      if (!DEV.notif.on) { el.checked = false; toast('No se dieron permisos para avisos.'); } else { Notif.show('Avisos activados', 'Te avisaremos de clases, entregas y repasos.', 'on'); }
    } else DEV.notif.on = false;
    saveDev();
  } else if (el.id === 'n-min') {
    DEV.notif.claseMin = Number(el.value); saveDev();
  } else if (el.id === 'imp-file' && el.files[0]) {
    try {
      let data = JSON.parse(await el.files[0].text());
      if (data && Array.isArray(data.profiles)) data = data.profiles[0];
      if (!data || !Array.isArray(data.materias)) throw new Error('formato');
      const id = S.data.id;
      S.data = normalize({ ...data, id });
      Store.save(); closeSheet(); render();
      toast('Copia recuperada.');
    } catch (err) { toast('Ese archivo no es una copia de Expediente Escolar.'); }
  }
});

document.addEventListener('submit', async (e) => {
  const f = e.target;
  e.preventDefault();
  const v = (sel) => { const el = f.querySelector(sel); return el ? el.value.trim() : ''; };
  const radio = (name) => { const el = f.querySelector(`input[name=${name}]:checked`); return el ? el.value : TINCIONES[0].c; };
  switch (f.id) {
    case 'f-nuevo': {
      const err = $('#pf-err'), btn = $('#pf-btn');
      const pin = v('#pf-pin');
      if (!/^\d{4,6}$/.test(pin)) { err.textContent = 'El PIN debe tener de 4 a 6 números.'; return; }
      if (pin !== v('#pf-pin2')) { err.textContent = 'Los dos PIN no coinciden.'; return; }
      const anyToken = (Object.entries(DEV.sessions).find(([k]) => k !== DEMO) || [])[1];
      const datos = { nombre: v('#pf-nombre'), carrera: v('#pf-carrera'), semestre: v('#pf-semestre'), inicio: v('#pf-inicio'), fin: v('#pf-fin'), color: radio('pcolor') };
      btn.disabled = true; btn.textContent = 'Creando…'; err.textContent = '';
      try {
        const r = await api({ action: 'crearPerfil', token: anyToken, codigo: v('#pf-codigo'), nombre: datos.nombre, carrera: datos.carrera, color: datos.color, pin, dispositivo: dispositivo() });
        if (!r.ok) {
          const E = { codigo: 'El código de instalación no es correcto.', pinFormato: 'El PIN debe tener de 4 a 6 números.', nombre: 'Escribe un nombre.', limite: 'Ya hay demasiados perfiles.' };
          err.textContent = E[r.error] || 'No se pudo crear el perfil. Intenta de nuevo.'; btn.disabled = false; btn.textContent = 'Crear perfil'; return;
        }
        DEV.sessions[r.id] = r.token; saveDev();
        S.perfiles = [...S.perfiles, { id: r.id, nombre: datos.nombre, color: datos.color }]; LS.set('expediente:perfiles', S.perfiles);
        LS.set(Store.key(r.id), newProfile({ id: r.id, ...datos }));
        closeSheet(); S.tab = 'hoy';
        await Store.activate(r.id);
        Store.save();
        toast(`Perfil «${datos.nombre}» creado.`);
      } catch (x) { err.textContent = 'No hay conexión con la hoja de Google. Revisa tu internet.'; btn.disabled = false; btn.textContent = 'Crear perfil'; }
      break;
    }
    case 'f-pin': {
      const id = f.dataset.id, err = $('#pin-err'), btn = $('#pin-btn');
      btn.disabled = true; btn.textContent = 'Entrando…'; err.textContent = '';
      try {
        const r = await api({ action: 'entrar', id, pin: v('#pin-in'), dispositivo: dispositivo() });
        if (!r.ok) {
          const E = { pin: `PIN incorrecto. Te quedan ${r.quedan} intentos.`, bloqueado: `Demasiados intentos. Espera ${r.minutos} minutos.`, perfil: 'Ese perfil ya no existe.' };
          err.textContent = E[r.error] || 'No se pudo entrar. Intenta de nuevo.'; btn.disabled = false; btn.textContent = 'Entrar';
          $('#pin-in').value = ''; return;
        }
        DEV.sessions[id] = r.token; saveDev();
        closeSheet(); S.tab = 'hoy';
        await Store.activate(id);
      } catch (x) { err.textContent = 'No hay conexión con la hoja de Google. Revisa tu internet.'; btn.disabled = false; btn.textContent = 'Entrar'; }
      break;
    }
    case 'f-pinchg': {
      try {
        const r = await api({ action: 'cambiarPin', token: DEV.sessions[S.data.id], actual: v('#pc-act'), nuevo: v('#pc-new') });
        toast(r.ok ? 'Listo, tu PIN cambió.' : r.error === 'pin' ? 'Tu PIN actual no es correcto.' : r.error === 'pinFormato' ? 'El PIN nuevo debe tener de 4 a 6 números.' : 'No se pudo cambiar el PIN.');
        if (r.ok) f.reset();
      } catch (x) { toast('Necesitas internet para cambiar el PIN.'); }
      break;
    }
    case 'f-borrar': {
      try {
        const pid = S.data.id;
        const r = await api({ action: 'borrarPerfil', token: DEV.sessions[pid], pin: v('#pb-pin') });
        if (!r.ok) { toast(r.error === 'pin' ? 'PIN incorrecto.' : 'No se pudo eliminar el perfil.'); return; }
        delete DEV.sessions[pid]; LS.del(Store.key(pid)); LS.del(Store.dirtyKey(pid));
        S.perfiles = S.perfiles.filter((x) => x.id !== pid); LS.set('expediente:perfiles', S.perfiles);
        DEV.active = null; saveDev(); S.data = null; closeSheet(); render();
        toast('Perfil eliminado.');
      } catch (x) { toast('Necesitas internet para eliminar el perfil.'); }
      break;
    }
    case 'f-perfil': {
      mutate((p) => {
        Object.assign(p, { nombre: v('#pf-nombre') || p.nombre, carrera: v('#pf-carrera'), semestre: v('#pf-semestre'), inicio: v('#pf-inicio'), fin: v('#pf-fin'), color: radio('pcolor') });
        p.minAprob = clamp(num(v('#pf-min')) ?? 70, 1, 100); p.asistMin = clamp(num(v('#pf-asist')) ?? 80, 0, 100);
      });
      toast('Perfil guardado.');
      break;
    }
    case 'f-task': {
      const id = f.dataset.id;
      const data = { titulo: v('#t-titulo'), materiaId: v('#t-mat'), tipo: v('#t-tipo'), fecha: v('#t-fecha'), hora: v('#t-hora') || '23:59', notas: v('#t-notas'), importante: $('#t-imp').checked };
      const plan = !id && data.tipo === 'Examen' && $('#t-plan') && $('#t-plan').checked;
      closeSheet();
      mutate((p) => {
        if (id) Object.assign(p.tareas.find((x) => x.id === id), data);
        else {
          p.tareas.push({ id: 't' + uid(), hecha: false, ...data });
          if (plan) for (const d of [7, 3, 1]) {
            const fd = addDays(data.fecha, -d);
            if (fd >= today()) p.tareas.push({ id: 't' + uid(), hecha: false, titulo: `Estudiar para ${data.titulo}`, materiaId: data.materiaId, tipo: 'Estudio', fecha: fd, hora: '18:00', notas: d === 1 ? 'Repaso final: solo resúmenes y preguntas de práctica.' : 'Repasa con preguntas, no solo releyendo.', importante: false });
          }
        }
      });
      toast(id ? 'Tarea actualizada.' : plan ? 'Examen agregado con sus sesiones de estudio.' : 'Tarea agregada.');
      break;
    }
    case 'f-mat': {
      const id = f.dataset.id;
      const data = { nombre: v('#m-nombre'), profe: v('#m-profe'), salon: v('#m-salon'), color: radio('mcolor') };
      if (id) { data.sesiones = num(v('#m-ses')) || ''; mutate((p) => Object.assign(p.materias.find((m) => m.id === id), data)); toast('Materia guardada.'); }
      else { const m = { id: 'm' + uid(), criterios: [], ...data }; mutate((p) => p.materias.push(m), { sheet: false }); openMat(m.id); toast('Materia creada. Ahora agrega sus clases.'); }
      break;
    }
    case 'f-clase': {
      const ini = v('#c-ini'), fin = v('#c-fin');
      if (toMin(fin) <= toMin(ini)) { toast('La hora de fin debe ser después de la de inicio.'); return; }
      mutate((p) => p.clases.push({ id: 'c' + uid(), materiaId: f.dataset.mat, dia: Number(v('#c-dia')), inicio: ini, fin, tipo: v('#c-tipo'), salon: v('#c-salon') }));
      toast('Clase agregada al horario.');
      break;
    }
    case 'f-crit': {
      const peso = num(v('#cr-peso'));
      mutate((p) => { const m = p.materias.find((x) => x.id === f.dataset.mat); m.criterios.push({ id: 'k' + uid(), nombre: v('#cr-nombre'), peso: clamp(peso || 0, 0, 100), cal: null }); });
      break;
    }
    case 'f-falta': {
      mutate((p) => p.faltas.push({ id: 'f' + uid(), materiaId: f.dataset.mat, fecha: v('#fa-fecha') || today() }));
      toast('Falta registrada.');
      break;
    }
    case 'f-tema': {
      const titulo = v('#tema-tit'); if (!titulo) return;
      mutate((p) => p.temas.push({ id: 'r' + uid(), materiaId: v('#tema-mat'), titulo, nivel: 0, proximo: addDays(today(), 1), creado: today() }));
      toast('Tema agregado. Primer repaso: mañana.');
      break;
    }
  }
});

/* =========================================================
   Arranque
   ========================================================= */
(async () => {
  if (DEV.active && hasSession(DEV.active) && (Store.local(DEV.active) || DEV.active !== DEMO)) {
    await Store.activate(DEV.active);
    Store.refreshList();
  } else {
    DEV.active = null;
    render();
    await Store.refreshList();
    if (!S.data) render();
  }
})();
setInterval(() => { Notif.check(); if (S.data && S.tab === 'hoy' && !S.sheet && document.visibilityState === 'visible') render(); }, 60000);
setTimeout(() => Notif.check(), 3000);
setInterval(() => Store.refresh(), 120000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { Store.refresh(); Notif.check(); Timer.tick(); } });
window.addEventListener('online', () => Store.refresh());
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
