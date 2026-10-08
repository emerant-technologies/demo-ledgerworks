/* ==========================================================================
   LedgerWorks - ui.js  (v2: bilingual, finance team, demo hooks)
   Dashboard overlay, panels, practice modal, and engine <-> world wiring.
   Codes against SPEC.md + SPEC2.md. No DOM in engine/world.
   ========================================================================== */
(function () {
  'use strict';

  const LW = (window.LW = window.LW || {});
  const doc = document;

  /* ------------------------------------------------------------------ i18n */
  // i18n.js is loaded first; keep a tiny stub so the UI never hard-crashes without it.
  const I = LW.i18n || (LW.i18n = {
    lang: 'en',
    t: (k) => k,
    setLang() {},
    on() {},
    fmtMoney: (n) => '€' + n,
    fmtMoneyK: (n) => '€' + n,
    fmtNum: (n, d) => Number(n).toFixed(d || 0),
    fmtDate: (s) => s,
    fmtMonth: (s) => s,
    has: () => false,
  });
  const t = (k, v) => I.t(k, v);

  /* ------------------------------------------------------------------ utils */
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || doc).querySelectorAll(s));
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.matchMedia('(max-width: 899px)').matches;
  const num = (n) => (typeof n === 'number' && isFinite(n) ? n : 0);
  const sum = (arr, k) => arr.reduce((a, r) => a + num(r[k]), 0);
  const cents = (n) => Math.round(num(n) * 100);

  const money = (n, dec) => I.fmtMoney(num(n), dec);
  const moneyK = (n) => I.fmtMoneyK(num(n));
  const pct = (n) => I.fmtNum(num(n), 1) + '%';
  const safe = (fn, fallback) => {
    try { const r = fn(); return r == null ? fallback : r; } catch (e) { console.warn('[ui]', e); return fallback; }
  };

  /* ------------------------------------------------------------------ icons */
  const P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    rotateL: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    rotateR: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
    focus: '<circle cx="12" cy="12" r="3"/><path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    arrowUp: '<path d="M7 17 17 7M8 7h9v9"/>',
    arrowDown: '<path d="M7 7l10 10M17 8v9H8"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    receipt: '<path d="M4 3h16v18l-3-2-3 2-2-2-2 2-3-2-3 2z"/><path d="M8 8h8M8 12h8"/>',
    truck: '<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    bank: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.6 3.5 5"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5z"/><path d="M8 7h8M8 11h6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    scale: '<path d="M12 3v18M5 21h14M6 7h12"/><path d="m6 7-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    plusCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  };
  const icon = (name, size) =>
    `<svg class="ic" width="${size || 16}" height="${size || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  const hydrate = (root) =>
    $$('[data-ic]', root).forEach((n) => {
      if (n.firstChild) return;
      n.innerHTML = icon(n.dataset.ic, +n.dataset.size || 16);
    });

  /* Static text: data-i18n (text), data-i18n-ph (placeholder), data-i18n-aria, data-i18n-title */
  function applyI18n(root) {
    $$('[data-i18n]', root).forEach((n) => { n.textContent = t(n.dataset.i18n); });
    $$('[data-i18n-ph]', root).forEach((n) => { n.setAttribute('placeholder', t(n.dataset.i18nPh)); });
    $$('[data-i18n-aria]', root).forEach((n) => { n.setAttribute('aria-label', t(n.dataset.i18nAria)); });
    $$('[data-i18n-title]', root).forEach((n) => { n.setAttribute('title', t(n.dataset.i18nTitle)); });
  }

  /* ------------------------------------------------------------- building meta */
  const B = {
    sales: { color: '#2f6bff', icon: 'receipt' },
    procure: { color: '#8b5cf6', icon: 'truck' },
    warehouse: { color: '#f59e0b', icon: 'box' },
    bank: { color: '#10b981', icon: 'bank' },
    payroll: { color: '#ec4899', icon: 'users' },
    ledger: { color: '#0ea5e9', icon: 'book' },
    reporting: { color: '#6366f1', icon: 'chart' },
  };
  const BIDS = Object.keys(B);
  const bName = (id) => (B[id] ? t('b.' + id + '.name') : id);
  const bProc = (id) => (B[id] ? t('b.' + id + '.proc') : '');
  const bColor = (id) => (B[id] ? B[id].color : '#7482a0');
  const STATUS_CLS = { ok: 'ok', warn: 'warn', alert: 'bad' };
  const ROLE_N = 5;

  const TEAM_DEF = [
    { id: 'elena', home: 'ledger', color: '#0ea5e9' },
    { id: 'maria', home: 'sales', color: '#2f6bff' },
    { id: 'georgi', home: 'procure', color: '#8b5cf6' },
    { id: 'ivan', home: 'warehouse', color: '#f59e0b' },
    { id: 'ana', home: 'bank', color: '#10b981' },
    { id: 'nikolai', home: 'payroll', color: '#ec4899' },
    { id: 'desi', home: 'reporting', color: '#6366f1' },
  ];

  /* ------------------------------------------------------------------- state */
  const S = {
    selected: null,
    tab: 'journal',
    sheetTab: 'tables',
    statuses: {},
    statusTimers: {},
    autoIds: new Set(),
    lastAutoToast: 0,
    lastAlertMsg: {},
    running: true,
    speed: 1,
    metrics: null,
    baseline: null,
    series: { cash: [], ar: [], ni: [], cr: [] },
    badges: {},
    flashId: null,
    tbHighlight: null,
    level: 1,
    hasWorld: false,
    modal: null,
    prevInsp: {},
    queued: null,
    feed: [],
    feedLang: {},
    teamSig: '',
  };

  let E = null; // engine, set in boot()

  /* --------------------------------------------------------- world (guarded) */
  function W(fn) {
    const args = Array.prototype.slice.call(arguments, 1);
    try {
      if (S.hasWorld && LW.world && typeof LW.world[fn] === 'function') return LW.world[fn].apply(LW.world, args);
    } catch (e) {
      console.warn('[ui] world.' + fn + ' failed', e);
    }
    return undefined;
  }

  /* ------------------------------------------------------------ engine helpers */
  const getMetrics = () => safe(() => E.metrics(), {}) || {};
  const acctList = () => Object.keys(E.accounts || {}).sort().map((k) => E.accounts[k]);
  const bal = (code) => (E.accounts && E.accounts[code] ? num(E.accounts[code].balance) : 0);
  const findScenario = (id) => (E.scenarios || []).filter((s) => s.id === id)[0] || null;
  const entryTotal = (e) => sum((e.lines || []).map((l) => ({ v: l.dr })), 'v');
  const entriesFor = (id) => (E.journal || []).filter((e) => id === 'ledger' || e.process === id);
  const isAuto = (e) => !!(e && (e.auto || S.autoIds.has(e.id)));
  const typeLabel = (ty) => (ty ? (I.has('type.' + ty) ? t('type.' + ty) : ty) : '');
  const diffName = (d) => t('diff.' + Math.min(3, Math.max(1, d || 1)));

  function teamList() {
    if (E && Array.isArray(E.team) && E.team.length) return E.team;
    return TEAM_DEF.map((m) => ({
      id: m.id, home: m.home, color: m.color, status: 'idle', task: '',
      name: t('team.' + m.id + '.name'), role: t('team.' + m.id + '.role'),
    }));
  }
  const memberById = (id) => teamList().filter((m) => m.id === id)[0] || null;
  const firstName = (m) => String((m && m.name) || '').split(/\s+/)[0];
  const initials = (name) =>
    String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');

  /* English -> BG month for strings like "Oct 27" (engine ETA values) */
  const MON = { Jan: 'jan', Feb: 'feb', Mar: 'mar', Apr: 'apr', May: 'may', Jun: 'jun', Jul: 'jul', Aug: 'aug', Sep: 'sep', Oct: 'oct', Nov: 'nov', Dec: 'dec' };
  function locShortDate(s) {
    const m = /^([A-Z][a-z]{2})\s+(\d{1,2})$/.exec(String(s || '').trim());
    if (!m || !MON[m[1]]) return s || '';
    return I.lang === 'bg' ? m[2] + ' ' + t('mon.' + MON[m[1]]) : s;
  }

  /* ===================================================================== toast */
  function toast(kind, title, body, ms) {
    const root = $('#toasts');
    if (!root) return;
    while (root.children.length >= 3) root.firstElementChild.remove();
    const el = doc.createElement('div');
    el.className = 'toast ' + kind;
    el.setAttribute('role', kind === 'alert' ? 'alert' : 'status');
    el.innerHTML =
      `<span class="t-ic">${icon(kind === 'success' ? 'check' : kind === 'info' ? 'zap' : 'alert', 14)}</span>` +
      `<div class="t-body"><b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ''}</div>`;
    root.appendChild(el);
    let gone = false;
    const kill = () => {
      if (gone) return;
      gone = true;
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    };
    el.addEventListener('click', kill);
    setTimeout(kill, ms || 5200);
  }

  /* ================================================================ KPI cards */
  const KPIS = [
    { id: 'cash', icon: 'wallet', color: '#10b981', good: 1, get: (m) => m.cash, fmt: (v) => money(v), sub: (m) => t('kpi.sub.wc', { v: moneyK(m.workingCapital) }) },
    { id: 'ar', icon: 'receipt', color: '#2f6bff', good: -1, get: (m) => m.ar, fmt: (v) => money(v), sub: (m) => t('kpi.sub.dso', { n: Math.round(num(m.dso)) }) },
    { id: 'ni', icon: 'chart', color: '#8b5cf6', good: 1, abs: true, get: (m) => m.netIncome, fmt: (v) => money(v), sub: (m) => t('kpi.sub.gm', { v: pct(m.grossMarginPct) }) },
    { id: 'cr', icon: 'scale', color: '#f59e0b', good: 1, get: (m) => m.currentRatio, fmt: (v) => I.fmtNum(num(v), 2) + 'x', sub: (m) => t('kpi.sub.dpo', { n: Math.round(num(m.dpo)) }) },
  ];

  function buildKpis() {
    const root = $('#kpis');
    root.innerHTML = KPIS.map(
      (k) => `
      <article class="kpi glass" id="kpi-${k.id}" data-demo="kpi-${k.id}" style="--c:${k.color}">
        <div class="kpi-top"><span class="kpi-ic">${icon(k.icon, 14)}</span><span class="label" data-kl>${esc(t('kpi.' + k.id))}</span></div>
        <div class="spark"></div>
        <div class="kpi-val" data-v>€0</div>
        <div class="kpi-bot"><span class="delta" data-d>${icon('arrowUp', 11)}0.0%</span><span class="kpi-sub" data-s></span></div>
      </article>`
    ).join('');
    KPIS.forEach((k) => {
      const v = $('#kpi-' + k.id + ' [data-v]');
      v._val = 0;
    });
  }

  function animateNumber(node, to, fmt, instant) {
    const from = node._val == null ? to : node._val;
    node._val = to;
    cancelAnimationFrame(node._raf);
    if (reduceMotion || instant || from === to) { node.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 900;
    const step = (ts) => {
      const k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      node.textContent = fmt(from + (to - from) * e);
      if (k < 1) node._raf = requestAnimationFrame(step);
    };
    node._raf = requestAnimationFrame(step);
  }

  function sparkSvg(vals, color) {
    if (vals.length < 2) return '';
    const w = 96, h = 32, min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), rng = max - min || 1;
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - 3 - ((v - min) / rng) * (h - 8)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const id = 'sg' + color.replace('#', '');
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <path d="${line} L${w} ${h} L0 ${h} Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  }

  function updateKpis(m, relang) {
    if (!S.baseline) S.baseline = Object.assign({}, m);
    KPIS.forEach((k) => {
      const cur = num(k.get(m)), base = num(k.get(S.baseline));
      const card = $('#kpi-' + k.id);
      if (!card) return;
      $('[data-kl]', card).textContent = t('kpi.' + k.id);
      animateNumber($('[data-v]', card), cur, k.fmt, relang);
      $('[data-s]', card).textContent = k.sub(m);

      let diff = cur - base, txt;
      const flat = k.abs ? Math.abs(diff) < 1 : Math.abs(base) > 0 ? Math.abs(diff / base) < 0.0005 : Math.abs(diff) < 0.01;
      if (k.abs || Math.abs(base) < 1) txt = (diff >= 0 ? '+' : '-') + moneyK(Math.abs(diff)).replace('-', '');
      else txt = (diff >= 0 ? '+' : '') + I.fmtNum((diff / Math.abs(base)) * 100, 1) + '%';
      if (k.id === 'cr') txt = (diff >= 0 ? '+' : '-') + I.fmtNum(Math.abs(diff), 2);
      const d = $('[data-d]', card);
      d.className = 'delta' + (flat ? '' : diff * k.good > 0 ? ' up' : ' down');
      d.innerHTML = (flat ? '' : icon(diff >= 0 ? 'arrowUp' : 'arrowDown', 11)) + (flat ? esc(t('kpi.nochange')) : esc(txt));
      d.title = t('kpi.deltaTip');

      if (!relang) {
        const s = S.series[k.id];
        if (!s.length) s.push(cur);
        s.push(cur);
        if (s.length > 32) s.shift();
      }
      $('.spark', card).innerHTML = sparkSvg(S.series[k.id], k.color);
    });
  }

  /* ==================================================================== badges */
  function updateBadges(m) {
    const tx = {
      sales: t('badge.ar') + ' ' + moneyK(m.ar),
      bank: t('badge.cash') + ' ' + moneyK(m.cash),
      procure: t('badge.ap') + ' ' + moneyK(m.ap),
      warehouse: t('badge.inv') + ' ' + moneyK(m.inventory),
      ledger: t('badge.ni') + ' ' + moneyK(m.netIncome),
    };
    Object.keys(tx).forEach((id) => {
      if (S.badges[id] !== tx[id]) { S.badges[id] = tx[id]; W('setBadge', id, tx[id]); }
    });
  }

  /* ================================================================ XP / level */
  function roleName(level) {
    return t('role.' + Math.min(ROLE_N - 1, Math.floor((level - 1) / 2)));
  }
  function updateXp(m, quiet) {
    const level = m.level || 1, xp = num(m.xp);
    $('#lvl').textContent = t('xp.lv', { n: level });
    $('#xpVal').textContent = I.fmtNum(xp, 0);
    let prog = (xp % 100) / 100;
    if (m.nextLevelXp && m.nextLevelXp > num(m.levelXp)) prog = (xp - num(m.levelXp)) / (m.nextLevelXp - num(m.levelXp));
    $('#xpBar').style.width = Math.max(4, Math.min(100, prog * 100)) + '%';
    const st = num(m.streak);
    $('#streak').hidden = st < 2;
    $('#streakVal').textContent = st;
    $('#xpPill').title = t('xp.tip', { level, xp: I.fmtNum(xp, 0), streak: st, acc: Math.round(num(m.accuracyPct)) });
    $('#roleLabel').textContent = roleName(level);
    if (!quiet && level > S.level && S.level) {
      toast('success', t('xp.levelUp'), t('xp.reached', { n: level, role: roleName(level) }));
      pulseXp();
    }
    S.level = level;
  }
  function pulseXp(delta) {
    const p = $('#xpPill');
    p.classList.remove('glow'); void p.offsetWidth; p.classList.add('glow');
    if (delta) {
      const f = $('#xpFloat');
      f.textContent = '+' + delta + ' ' + t('xp.unit');
      f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    }
  }

  /* ============================================================= Month-end close */
  function currentStep() {
    return (E.closeSteps || []).filter((s) => !s.done)[0] || null;
  }
  // Engine localizes titles; fall back to our own dictionary if the engine did not.
  function stepTitle(s) {
    return I.lang === 'bg' && I.has('close.' + s.id) && /^[\x00-\x7f]*$/.test(s.title || '') ? t('close.' + s.id) : s.title;
  }

  function renderClose() {
    const steps = E.closeSteps || [];
    const done = steps.filter((s) => s.done).length;
    const cur = currentStep();
    $('#closeCount').textContent = done + '/' + steps.length;
    const root = $('#closePanel');
    const stepsHtml = steps
      .map((s, i) => {
        const cls = s.done ? 'done' : cur && cur.id === s.id ? 'current' : 'todo';
        const inner = s.done ? icon('check', 16) : icon((B[s.building] || {}).icon || 'layers', 16);
        return `<button type="button" class="step ${cls}" data-step="${esc(s.id)}" data-demo="close-step-${esc(s.id)}" style="--acc:${bColor(s.building)}" aria-label="${esc(t('close.stepAria', { n: i + 1, title: stepTitle(s) }))}${s.done ? esc(' (' + t('close.done').toLowerCase() + ')') : ''}">
          <span class="dot">${inner}</span><span class="s-title">${esc(stepTitle(s))}</span><span class="s-eta">${s.done ? esc(t('close.done')) : esc(locShortDate(s.eta))}</span></button>`;
      })
      .join('');
    let summary;
    if (cur) {
      const sc = findScenario(cur.scenarioId);
      const idx = steps.indexOf(cur) + 1;
      summary = `<div class="step-summary">
        <div class="ss-main">
          <span class="label">${esc(t('close.current', { i: idx, n: steps.length }))}</span>
          <div class="ss-title">${esc(stepTitle(cur))} <span class="chip nodot" style="background:color-mix(in srgb, ${bColor(cur.building)} 14%, white);color:${bColor(cur.building)}">${esc(bName(cur.building))}</span></div>
          <p>${esc(sc ? sc.prompt : t('close.fallbackPrompt'))}</p>
        </div>
        <button type="button" class="btn primary" data-step="${esc(cur.id)}" data-demo="close-start">${esc(t('close.start'))} ${icon('arrowRight', 14)}</button></div>`;
    } else {
      summary = `<div class="step-summary"><div class="ss-main"><span class="label">${esc(t('close.allDone'))}</span><div class="ss-title">${esc(t('close.closedTitle'))}</div><p>${esc(t('close.closedBody'))}</p></div><span class="chip ok">${esc(t('close.closed'))}</span></div>`;
    }
    root.innerHTML = `
      <div class="close-head"><h3>${esc(t('close.title'))}</h3><span class="chip ${done === steps.length ? 'ok' : 'info'}">${esc(done === steps.length ? t('close.complete') : t('close.inProgress'))}</span><span class="grow"></span><span class="label">${esc(t('close.steps', { done, n: steps.length }))}</span></div>
      <div class="progress"><i style="width:${steps.length ? (done / steps.length) * 100 : 0}%"></i></div>
      <div class="stepper">${stepsHtml}</div>${summary}`;
  }

  /* ======================================================================== Tables */
  function setTab(tab, opts) {
    if (['journal', 'ar', 'ap', 'tb'].indexOf(tab) < 0) tab = 'journal';
    S.tab = tab;
    $$('#tblTabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    if (isMobile() && !(opts && opts.noSheet)) setSheetTab('tables', true);
    renderTable(opts);
  }

  const BUCKET = { '0-30': 'ok', '31-60': 'warn', '61-90': 'warn', '90+': 'bad' };

  function renderTable() {
    const wrap = $('#tblWrap'), foot = $('#tblFoot'), meta = $('#tabMeta');
    const top = wrap.scrollTop;
    let html = '', f = '', m = '';
    if (S.tab === 'journal') {
      const rows = (E.journal || []).slice(-6).reverse();
      m = t('tbl.nEntries', { n: (E.journal || []).length });
      html = `<table class="tbl"><thead><tr><th>${esc(t('tbl.entry'))}</th><th>${esc(t('tbl.memo'))}</th><th>${esc(t('tbl.process'))}</th><th class="r">${esc(t('tbl.amount'))}</th></tr></thead><tbody>` +
        (rows.map((e) => `<tr data-je="${esc(e.id)}" class="${S.flashId === e.id ? 'flash' : ''}">
          <td class="id">${esc(e.id)} ${isAuto(e) ? '<span class="chip auto">' + esc(t('tbl.auto')) + '</span>' : ''}<div style="font-weight:400;color:var(--muted);font-size:11px">${esc(I.fmtDate(e.date || ''))}</div></td>
          <td class="memo" title="${esc(e.memo)}">${esc(e.memo)}</td>
          <td><span class="pdot" style="--dotc:${bColor(e.process)}"></span>${esc(bName(e.process))}</td>
          <td class="r">${money(entryTotal(e), true)}</td></tr>`).join('') ||
          `<tr><td colspan="4" class="empty">${esc(t('tbl.noEntries'))}</td></tr>`) + `</tbody></table>`;
      f = `<span>${esc(t('tbl.latest6'))}</span><span class="grow"></span><span class="chip ${getMetrics().trialBalanceOk === false ? 'bad' : 'ok'}">${esc(t('tbl.ledgerBalanced'))}</span>`;
    } else if (S.tab === 'ar') {
      const rows = safe(() => E.arAging(), []);
      m = t('tbl.nInvoices', { n: rows.length });
      html = `<table class="tbl"><thead><tr><th>${esc(t('tbl.customer'))}</th><th>${esc(t('tbl.invoice'))}</th><th class="r">${esc(t('tbl.amount'))}</th><th class="r">${esc(t('tbl.days'))}</th><th>${esc(t('tbl.bucket'))}</th></tr></thead><tbody>` +
        rows.map((r) => `<tr><td>${esc(r.customer)}</td><td class="id">${esc(r.invoice)}</td><td class="r">${money(r.amount, true)}</td><td class="r">${num(r.daysOut)}</td><td><span class="chip ${BUCKET[r.bucket] || ''}">${esc(r.bucket)}</span></td></tr>`).join('') +
        (rows.length ? '' : `<tr><td colspan="5" class="empty">${esc(t('tbl.noAr'))}</td></tr>`) + `</tbody></table>`;
      const o90 = sum(rows.filter((r) => r.bucket === '90+'), 'amount');
      f = `<span>${esc(t('tbl.total'))} <b>${money(sum(rows, 'amount'), true)}</b></span><span class="grow"></span><span>${esc(t('tbl.over90'))} <b style="color:${o90 ? 'var(--bad-ink)' : 'inherit'}">${money(o90, true)}</b></span>`;
    } else if (S.tab === 'ap') {
      const rows = safe(() => E.apDue(), []).slice().sort((a, b) => a.dueInDays - b.dueInDays);
      m = t('tbl.nBills', { n: rows.length });
      html = `<table class="tbl"><thead><tr><th>${esc(t('tbl.vendor'))}</th><th>${esc(t('tbl.bill'))}</th><th class="r">${esc(t('tbl.amount'))}</th><th>${esc(t('tbl.due'))}</th></tr></thead><tbody>` +
        rows.map((r) => {
          const d = num(r.dueInDays);
          const cls = d < 0 ? 'bad' : d <= 7 ? 'warn' : 'ok';
          const tx = d < 0 ? t('ap.overdue', { n: Math.abs(d) }) : d === 0 ? t('ap.today') : t('ap.in', { n: d });
          return `<tr><td>${esc(r.vendor)}</td><td class="id">${esc(r.bill)}</td><td class="r">${money(r.amount, true)}</td><td><span class="chip ${cls}">${esc(tx)}</span></td></tr>`;
        }).join('') + (rows.length ? '' : `<tr><td colspan="4" class="empty">${esc(t('tbl.noAp'))}</td></tr>`) + `</tbody></table>`;
      const soon = sum(rows.filter((r) => r.dueInDays <= 7), 'amount');
      f = `<span>${esc(t('tbl.total'))} <b>${money(sum(rows, 'amount'), true)}</b></span><span class="grow"></span><span>${esc(t('tbl.due7'))} <b>${money(soon, true)}</b></span>`;
    } else {
      const rows = safe(() => E.trialBalance(), []);
      const dr = sum(rows, 'debit'), cr = sum(rows, 'credit'), ok = cents(dr) === cents(cr);
      m = t('tbl.nAccounts', { n: rows.length });
      html = `<table class="tbl"><thead><tr><th>${esc(t('tbl.code'))}</th><th>${esc(t('tbl.account'))}</th><th class="r">${esc(t('tbl.debit'))}</th><th class="r">${esc(t('tbl.credit'))}</th></tr></thead><tbody>` +
        rows.map((r) => `<tr data-code="${esc(r.code)}" class="${S.tbHighlight === r.code ? 'hl' : ''}"><td class="id">${esc(r.code)}</td><td>${esc(r.name)}</td><td class="r ${r.debit ? '' : 'dim'}">${r.debit ? money(r.debit, true) : '-'}</td><td class="r ${r.credit ? '' : 'dim'}">${r.credit ? money(r.credit, true) : '-'}</td></tr>`).join('') +
        `</tbody></table>`;
      f = `<span>${esc(t('tbl.totals'))} <b>${money(dr, true)}</b> / <b>${money(cr, true)}</b></span><span class="grow"></span><span class="chip ${ok ? 'ok' : 'bad'}">${esc(ok ? t('tb.balancedOk') : t('tb.outOfBalance'))}</span>`;
    }
    wrap.innerHTML = html;
    wrap.scrollTop = top;
    foot.innerHTML = f;
    meta.textContent = m;
    if (S.tab === 'tb' && S.tbHighlight) {
      const row = $('tr.hl', wrap);
      if (row) row.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  /* ===================================================================== Inspector */
  function buildingMetrics(id, m) {
    const ar = safe(() => E.arAging(), []), ap = safe(() => E.apDue(), []);
    const count = entriesFor(id).length;
    const tone = (v, bad) => (v > 0 ? bad : 'ok');
    const days = (v) => t('u.days', { n: Math.round(num(v)) });
    const bal2 = (ok) => (ok ? t('tb.balancedOk') : t('tb.off'));
    switch (id) {
      case 'sales': {
        const o90 = sum(ar.filter((r) => r.bucket === '90+'), 'amount');
        return [
          { k: 'revMtd', v: money(m.revenue) }, { k: 'receivables', v: money(m.ar) },
          { k: 'dso', v: days(m.dso) }, { k: 'openInv', v: String(ar.length) },
          { k: 'over90', v: money(o90), t: tone(o90, 'bad') }, { k: 'grossMargin', v: pct(m.grossMarginPct) },
        ];
      }
      case 'procure': {
        const soon = sum(ap.filter((r) => r.dueInDays >= 0 && r.dueInDays <= 7), 'amount');
        const over = sum(ap.filter((r) => r.dueInDays < 0), 'amount');
        return [
          { k: 'payables', v: money(m.ap) }, { k: 'dpo', v: days(m.dpo) },
          { k: 'openBills', v: String(ap.length) }, { k: 'due7', v: money(soon), t: soon > 0 ? 'warn' : '' },
          { k: 'overdue', v: money(over), t: tone(over, 'bad') }, { k: 'entries', v: String(count) },
        ];
      }
      case 'warehouse': {
        const turns = num(m.inventory) > 0 ? num(m.cogs) / num(m.inventory) : 0;
        return [
          { k: 'inventory', v: money(m.inventory) }, { k: 'cogsMtd', v: money(m.cogs) },
          { k: 'grossProfit', v: money(num(m.revenue) - num(m.cogs)) }, { k: 'grossMargin', v: pct(m.grossMarginPct) },
          { k: 'turns', v: I.fmtNum(turns, 2) + 'x' }, { k: 'entries', v: String(count) },
        ];
      }
      case 'bank': {
        const cover = num(m.ap) > 0 ? num(m.cash) / num(m.ap) : 0;
        return [
          { k: 'cashBalance', v: money(m.cash) }, { k: 'workingCap', v: money(m.workingCapital) },
          { k: 'currentRatio', v: I.fmtNum(num(m.currentRatio), 2) + 'x' }, { k: 'cashApCover', v: I.fmtNum(cover, 2) + 'x', t: cover > 0 && cover < 1 ? 'warn' : '' },
          { k: 'arCollect', v: money(m.ar) }, { k: 'entries', v: String(count) },
        ];
      }
      case 'payroll': {
        const ratio = num(m.revenue) > 0 ? (bal('6000') / num(m.revenue)) * 100 : 0;
        return [
          { k: 'wagesExp', v: money(bal('6000')) }, { k: 'wagesPay', v: money(bal('2150')) },
          { k: 'accrued', v: money(bal('2100')) }, { k: 'totalExp', v: money(m.expenses) },
          { k: 'payrollRev', v: pct(ratio) }, { k: 'entries', v: String(count) },
        ];
      }
      case 'ledger': {
        const tb = safe(() => E.trialBalance(), []);
        const dr = sum(tb, 'debit'), cr = sum(tb, 'credit'), ok = cents(dr) === cents(cr);
        return [
          { k: 'jeCount', v: String((E.journal || []).length) }, { k: 'accounts', v: String(Object.keys(E.accounts || {}).length) },
          { k: 'totDr', v: money(dr) }, { k: 'totCr', v: money(cr) },
          { k: 'tb', v: bal2(ok), t: ok ? 'ok' : 'bad' }, { k: 'netIncome', v: money(m.netIncome) },
        ];
      }
      case 'reporting': {
        const steps = E.closeSteps || [];
        const ok = m.trialBalanceOk !== false;
        return [
          { k: 'revenue', v: money(m.revenue) }, { k: 'netIncome', v: money(m.netIncome) },
          { k: 'grossMargin', v: pct(m.grossMarginPct) }, { k: 'currentRatio', v: I.fmtNum(num(m.currentRatio), 2) + 'x' },
          { k: 'closeProg', v: steps.filter((s) => s.done).length + '/' + steps.length }, { k: 'tb', v: bal2(ok), t: ok ? 'ok' : 'bad' },
        ];
      }
    }
    return [];
  }

  function renderInspector() {
    const el = $('#inspector');
    const id = S.selected;
    doc.body.classList.toggle('insp-open', !!(id && B[id]));
    if (!id || !B[id]) {
      el.classList.remove('open');
      el.innerHTML = `<div class="insp-empty"><div class="big">${icon('focus', 22)}</div><b>${esc(t('insp.selectTitle'))}</b>${esc(t('insp.selectBody'))}</div>`;
      return;
    }
    const b = B[id], m = S.metrics || getMetrics();
    const scroll = $('.insp-body', el) ? $('.insp-body', el).scrollTop : 0;
    const wasOpen = el.classList.contains('open') && el.dataset.id === id;
    const status = S.statuses[id] || 'ok';
    const items = buildingMetrics(id, m);
    const entries = entriesFor(id).slice(-5).reverse();
    el.style.setProperty('--acc', b.color);
    el.dataset.id = id;
    el.innerHTML = `
      <div class="insp-head">
        <span class="insp-ic">${icon(b.icon, 22)}</span>
        <div class="grow"><h3>${esc(bName(id))}</h3><p>${esc(bProc(id))}</p></div>
        <button type="button" class="icon-btn" data-act="close-insp" data-demo="inspector-close" aria-label="${esc(t('insp.close'))}">${icon('x', 16)}</button>
      </div>
      <div class="insp-status"><span class="chip ${STATUS_CLS[status]}">${esc(t('status.' + status))}</span><span class="muted">${esc(t('insp.nPosted', { n: entriesFor(id).length }))}</span></div>
      <div class="insp-body">
        <div class="metric-grid">${items.map((it) => {
          const key = id + ':' + it.k;
          const changed = S.prevInsp[key] !== undefined && S.prevInsp[key] !== it.v;
          S.prevInsp[key] = it.v;
          return `<div class="metric"><span class="label">${esc(t('im.' + it.k))}</span><div class="val ${it.t || ''} ${changed ? 'bump' : ''}">${esc(it.v)}</div></div>`;
        }).join('')}</div>
        <div class="label">${esc(t('insp.recent'))}</div>
        <ul class="entries">${entries.map((e) => `<li><button type="button" data-je="${esc(e.id)}"><span class="je-id">${esc(e.id)}</span><span class="je-memo" title="${esc(e.memo)}">${esc(e.memo)}${isAuto(e) ? ' &middot; ' + esc(t('tbl.auto').toLowerCase()) : ''}</span><span class="je-amt">${money(entryTotal(e))}</span></button></li>`).join('') || `<li class="empty">${esc(t('insp.noEntries'))}</li>`}</ul>
      </div>
      <div class="insp-actions"><button type="button" class="btn primary" data-act="practice" data-demo="inspector-practice">${icon('plusCircle', 16)} ${esc(t('insp.practice'))}</button><button type="button" class="btn" data-act="focus" data-demo="inspector-focus">${icon('focus', 16)} ${esc(t('insp.focus'))}</button></div>`;
    if (!wasOpen) { el.classList.remove('open'); void el.offsetWidth; }
    el.classList.add('open');
    const body = $('.insp-body', el);
    if (body && wasOpen) body.scrollTop = scroll;
  }

  function select(id, opts) {
    opts = opts || {};
    if (id && !B[id]) id = null;
    S.selected = id || null;
    renderInspector();
    if (id) {
      if (opts.focus) W('focus', id);
      if (opts.pulse) W('pulse', id, bColor(id));
      if (isMobile()) setSheetTab('inspect', true);
    } else if (isMobile() && S.sheetTab === 'inspect') {
      setSheetTab('team');
    }
    renderFallback();
  }

  // Public: select through the world when possible so the 3D highlight follows.
  function selectBuilding(id) {
    if (id && !B[id]) id = null;
    W('select', id || null);
    if (S.selected !== (id || null)) select(id);
    if (id) W('focus', id);
  }

  /* ============================================================== Bottom sheet (mobile) */
  function setSheetTab(tab, expand) {
    S.sheetTab = tab;
    const sh = $('#sheet');
    sh.dataset.tab = tab;
    $$('.sheet-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.stab === tab)));
    if (expand) sh.classList.remove('collapsed');
  }

  /* ================================================================ Team panel + feed */
  const STATUS_KEYS = { idle: 'idle', working: 'working', walking: 'walking' };

  function renderTeam(force) {
    const root = $('#teamPanel');
    if (!root) return;
    const team = teamList();
    const list = $('#teamList', root);
    const sig = I.lang + '|' + team.map((m) => m.id + m.name + m.role + m.color).join('|');
    if (force || S.teamSig !== sig) {
      S.teamSig = sig;
      list.innerHTML = team.map((m) => `
        <button type="button" class="team-row" data-member="${esc(m.id)}" data-demo="team-member-${esc(m.id)}" style="--mc:${esc(m.color)}">
          <span class="t-av">${esc(initials(m.name))}<i class="t-st" data-st></i></span>
          <span class="t-main">
            <span class="t-line1"><b class="t-name">${esc(m.name)}</b><span class="t-role">${esc(m.role)}</span></span>
            <span class="t-task" data-task></span>
          </span>
        </button>`).join('');
    }
    team.forEach((m) => {
      const row = $('.team-row[data-member="' + m.id + '"]', list);
      if (!row) return;
      const st = STATUS_KEYS[m.status] || 'idle';
      row.dataset.status = st;
      const task = $('[data-task]', row);
      const txt = m.task || t('team.status.' + st);
      if (task.textContent !== txt) task.textContent = txt;
      task.title = txt;
      row.title = m.name + ' · ' + m.role;
    });
    $('#teamCount').textContent = t('team.activeCount', { n: team.filter((m) => m.status && m.status !== 'idle').length, total: team.length });
  }

  function feedText(it) {
    const m = memberById(it.memberId);
    const name = firstName(m) || it.memberId;
    if (it.lang === I.lang && it.task) return name + ': ' + it.task;
    const kind = I.has('kind.' + it.kind) ? t('kind.' + it.kind) : t('kind.other');
    return name + ': ' + kind + (it.from && it.to ? ' · ' + bName(it.from) + ' → ' + bName(it.to) : '');
  }

  function renderFeed() {
    const ul = $('#teamFeed');
    if (!ul) return;
    const items = S.feed.slice(0, 4);
    ul.innerHTML = items.length
      ? items.map((it) => {
          const m = memberById(it.memberId);
          return `<li style="--mc:${esc((m && m.color) || '#7482a0')}"><time>${esc(it.time)}</time><i class="f-dot"></i><span class="f-txt">${esc(feedText(it))}</span></li>`;
        }).join('')
      : `<li class="empty">${esc(t('team.feedEmpty'))}</li>`;
  }

  function onActivity(a) {
    if (!a || !a.memberId) return;
    S.feed.unshift({
      memberId: a.memberId, from: a.from, to: a.to, kind: a.kind, task: a.task || '', entryId: a.entryId,
      lang: I.lang, time: new Date().toLocaleTimeString('en-GB'),
    });
    if (S.feed.length > 24) S.feed.length = 24;
    renderFeed();
    if (a.to) W('walk', a.memberId, a.to, { label: a.task || '' });
  }

  function showTeam() {
    selectBuilding(null);
    if (isMobile()) setSheetTab('team', true);
  }

  /* ================================================================ Fallback (no WebGL) */
  function renderFallback() {
    const fb = $('#fallback');
    if (S.hasWorld) { fb.hidden = true; return; }
    fb.hidden = false;
    fb.innerHTML = `<p class="fb-note">${esc(t('fb.note'))}</p><div class="fb-grid">` +
      BIDS.map((id) => {
        const b = B[id], st = S.statuses[id] || 'ok';
        return `<button type="button" class="fb-card" data-b="${id}" style="--acc:${b.color}${S.selected === id ? ';outline:2px solid ' + b.color : ''}">
          <span class="fb-ic">${icon(b.icon, 17)}</span><b>${esc(bName(id))}</b><small>${esc(S.badges[id] || bProc(id))}</small>
          <span class="chip ${STATUS_CLS[st]}" style="justify-self:start">${esc(t('status.' + st))}</span></button>`;
      }).join('') + `</div>`;
  }

  /* ======================================================================== Modal base */
  function isModalOpen() { return !!S.modal; }

  function closeModal(silent) {
    const mm = S.modal;
    if (!mm) return;
    S.modal = null;
    doc.removeEventListener('keydown', mm.onKey, true);
    mm.root.remove();
    if (!silent && mm.prevFocus && mm.prevFocus.focus) { try { mm.prevFocus.focus(); } catch (e) { /* noop */ } }
    return mm;
  }

  function mountModal(html, cls, accent, prevFocus) {
    const prev = S.modal;
    if (prev) closeModal(true);
    const root = $('#modalRoot');
    const wrap = doc.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal ${cls || ''}" role="dialog" aria-modal="true" data-demo="modal" style="--acc:${accent || '#2f6bff'}">${html}</div>`;
    root.appendChild(wrap);
    hydrate(wrap);
    applyI18n(wrap);
    const modal = $('.modal', wrap);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeModal(); }
      else if (e.key === 'Tab') {
        const f = $$('button:not([disabled]), input:not([disabled]), [tabindex="0"]', modal).filter((n) => n.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    doc.addEventListener('keydown', onKey, true);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap && e.isTrusted) closeModal(); });
    S.modal = { root: wrap, modal, onKey, prevFocus: prevFocus || (prev && prev.prevFocus) || doc.activeElement, relocalize: null };
    return modal;
  }

  /* ---- entry detail (read only) ---- */
  function openEntryDetail(id) {
    const e = (E.journal || []).filter((x) => x.id === id)[0];
    if (!e) return;
    const accounts = E.accounts || {};
    const modal = mountModal(`
      <div class="m-head"><div class="m-badge">${icon((B[e.process] || {}).icon || 'book', 22)}</div>
        <div class="m-titles"><div class="eyebrow">${esc(t('je.eyebrow'))} · ${esc(I.fmtDate(e.date || ''))}</div><h2 id="mTitle">${esc(e.id)} <span style="font-weight:500;color:var(--muted)">${esc(e.memo)}</span></h2></div>
        <button type="button" class="icon-btn" data-close data-demo="modal-close" aria-label="${esc(t('common.close'))}">${icon('x', 18)}</button></div>
      <div style="display:flex;gap:8px;margin-bottom:6px"><span class="chip nodot" style="background:color-mix(in srgb, ${bColor(e.process)} 14%, white);color:${bColor(e.process)}">${esc(bName(e.process))}</span>${isAuto(e) ? '<span class="chip auto">' + esc(t('tbl.auto')) + '</span>' : ''}</div>
      <table class="detail-tbl"><thead><tr><th>${esc(t('tbl.account'))}</th><th class="r">${esc(t('tbl.debit'))}</th><th class="r">${esc(t('tbl.credit'))}</th></tr></thead><tbody>${(e.lines || []).map((l) =>
        `<tr><td>${esc(l.acct)} &middot; ${esc((accounts[l.acct] || {}).name || '')}</td><td class="r">${l.dr ? money(l.dr, true) : ''}</td><td class="r">${l.cr ? money(l.cr, true) : ''}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>${esc(t('tbl.total'))}</td><td class="r">${money(sum(e.lines || [], 'dr'), true)}</td><td class="r">${money(sum(e.lines || [], 'cr'), true)}</td></tr></tfoot></table>
      <div class="m-foot"><span></span><button type="button" class="btn" data-close>${esc(t('common.close'))}</button></div>`, 'sm', bColor(e.process));
    modal.setAttribute('aria-label', t('je.aria', { id: e.id }));
    $$('[data-close]', modal).forEach((b) => b.addEventListener('click', () => closeModal()));
    const cb = $('.btn[data-close]', modal); if (cb) cb.focus();
    S.modal.relocalize = () => { const pf = S.modal && S.modal.prevFocus; openEntryDetail(id); if (S.modal) S.modal.prevFocus = pf; };
  }

  /* ======================================================================= Practice modal */
  // Accepts a scenario object or id.
  function openPractice(scArg, opts) {
    opts = opts || {};
    const sc0 = typeof scArg === 'string' ? findScenario(scArg) : scArg;
    if (!sc0) { toast('warn', t('pm.noScenario'), t('pm.noScenarioBody')); return; }
    const scId = sc0.id;
    const cur = () => findScenario(scId) || sc0;
    const acc = bColor(sc0.building);
    const nLines = Math.min(6, Math.max(2, (sc0.lines || []).length));
    const modal = mountModal(`
      <div class="m-head">
        <div class="m-badge">${icon((B[sc0.building] || {}).icon || 'book', 22)}</div>
        <div class="m-titles"><div class="eyebrow" id="mEyebrow"></div><h2 id="mTitle"></h2></div>
        <div class="m-meta"><span class="diff" id="mDiff" data-i18n-title="pm.difficulty"></span><span class="chip info nodot" id="mXp"></span></div>
        <button type="button" class="icon-btn" data-close data-demo="modal-close" data-i18n-aria="common.close">${icon('x', 18)}</button>
      </div>
      <p class="m-prompt" id="mPrompt"></p>
      <div class="grid-head label"><span data-i18n="tbl.account"></span><span data-i18n="tbl.debit"></span><span data-i18n="tbl.credit"></span><span></span></div>
      <div class="grid-rows" id="gRows"></div>
      <div class="grid-actions">
        <button type="button" class="link-btn" id="addRow" data-demo="add-line">${icon('plus', 14)} <span data-i18n="pm.addLine"></span></button>
        <div class="totals"><span><span data-i18n="pm.debits"></span> <b id="tDr">€0.00</b></span><span><span data-i18n="pm.credits"></span> <b id="tCr">€0.00</b></span><span class="chip" id="tBal"></span></div>
      </div>
      <div class="m-feedback info" id="mFb" data-demo="feedback" role="status" aria-live="polite"></div>
      <div class="m-callout hint" id="mHint" hidden></div>
      <div class="m-callout answer" id="mAnswer" hidden></div>
      <div class="m-foot">
        <div class="grp"><button type="button" class="btn ghost" id="hintBtn" data-demo="hint">${icon('bulb', 15)} <span data-i18n="pm.hint"></span></button><button type="button" class="btn ghost" id="ansBtn" data-demo="show-answer">${icon('eye', 15)} <span data-i18n="pm.showAnswer"></span></button></div>
        <div class="grp"><button type="button" class="btn" id="nextBtn" data-demo="next" data-i18n="pm.next"></button><button type="button" class="btn primary" id="checkBtn" data-demo="check">${icon('check', 15)} <span data-i18n="pm.check"></span></button></div>
      </div>
      <div class="confetti" id="confetti"></div>`, '', acc, opts.prevFocus);

    modal.setAttribute('aria-labelledby', 'mTitle');
    const st = { attempts: 0, solved: false, busy: false, hintOn: false, ansOn: false, fb: null };
    const rowsEl = $('#gRows', modal);
    const fb = $('#mFb', modal);
    // fn returns inner html; engineFed marks text that came from the engine (cannot be re-translated)
    const setFb = (kind, fn, engineFed) => { st.fb = { kind, fn, engineFed: !!engineFed }; fb.className = 'm-feedback ' + kind; fb.innerHTML = fn(); };

    const accounts = acctList();
    const label = (a) => a.code + ' · ' + a.name;
    const decSep = () => (I.lang === 'bg' ? ',' : '.');

    function parseAmt(v) {
      let s = String(v || '').replace(/[^0-9.,]/g, '');
      if (!s) return 0;
      const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
      if (lc >= 0 && ld >= 0) {
        const dec = lc > ld ? ',' : '.', grp = dec === ',' ? '.' : ',';
        s = s.split(grp).join('').replace(dec, '.');
      } else if (lc >= 0) {
        const parts = s.split(',');
        s = parts.length === 2 && (parts[1].length !== 3 || I.lang === 'bg') ? parts[0] + '.' + parts[1] : parts.join('');
      } else if (ld >= 0) {
        const parts = s.split('.');
        if (parts.length > 2) s = parts.join('');
      }
      const n = parseFloat(s);
      return isFinite(n) ? n : 0;
    }
    const fmtAmt = (n) => (n > 0 ? I.fmtNum(n, 2) : '');
    const plainAmt = (n) => (n > 0 ? String(n).replace('.', decSep()) : '');

    function totals() {
      let dr = 0, cr = 0;
      $$('.g-row', rowsEl).forEach((r) => {
        const d = parseAmt($('.dr', r).value), c = parseAmt($('.cr', r).value);
        dr += cents(d); cr += cents(c);
        r.classList.toggle('has-dr', d > 0); r.classList.toggle('has-cr', c > 0);
      });
      $('#tDr', modal).textContent = money(dr / 100, true);
      $('#tCr', modal).textContent = money(cr / 100, true);
      const chip = $('#tBal', modal);
      if (dr === 0 && cr === 0) { chip.className = 'chip'; chip.textContent = t('pm.enterAmounts'); }
      else if (dr === cr) { chip.className = 'chip ok'; chip.textContent = t('pm.balanced'); }
      else { chip.className = 'chip warn'; chip.textContent = t('pm.outBy', { v: money(Math.abs(dr - cr) / 100, true) }); }
    }

    function reindex() {
      $$('.g-row', rowsEl).forEach((r, i) => {
        $('.acct-in', r).setAttribute('data-demo', 'line-' + i + '-account');
        $('.dr', r).setAttribute('data-demo', 'line-' + i + '-debit');
        $('.cr', r).setAttribute('data-demo', 'line-' + i + '-credit');
      });
    }

    function closeLists(except) {
      $$('.combo-list', rowsEl).forEach((l) => {
        if (l === except) return;
        l.hidden = true;
        l.innerHTML = '';
        const i = l.parentNode && $('.acct-in', l.parentNode);
        if (i) i.setAttribute('aria-expanded', 'false');
      });
    }

    function addRow() {
      const row = doc.createElement('div');
      row.className = 'g-row';
      row.innerHTML = `
        <div class="combo"><input class="acct-in" type="text" placeholder="${esc(t('pm.accountPh'))}" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-label="${esc(t('tbl.account'))}"><div class="combo-list" role="listbox" hidden></div></div>
        <input class="amt dr" type="text" inputmode="decimal" placeholder="0.00" autocomplete="off" aria-label="${esc(t('pm.debitAmount'))}">
        <input class="amt cr" type="text" inputmode="decimal" placeholder="0.00" autocomplete="off" aria-label="${esc(t('pm.creditAmount'))}">
        <button type="button" class="icon-btn rm" aria-label="${esc(t('pm.removeLine'))}">${icon('x', 15)}</button>`;
      rowsEl.appendChild(row);
      wireRow(row);
      reindex();
      return row;
    }

    function wireRow(row) {
      const inp = $('.acct-in', row), list = $('.combo-list', row), dr = $('.dr', row), cr = $('.cr', row);
      let active = 0, shown = [];
      const open = () => { closeLists(list); list.hidden = false; inp.setAttribute('aria-expanded', 'true'); };
      const close = () => { list.hidden = true; list.innerHTML = ''; inp.setAttribute('aria-expanded', 'false'); };
      const pick = (a) => { row.dataset.acct = a.code; inp.value = label(a); close(); };
      const render = () => {
        const q = inp.value.trim().toLowerCase();
        const sel = row.dataset.acct && E.accounts[row.dataset.acct] && inp.value === label(E.accounts[row.dataset.acct]);
        shown = accounts.filter((a) => sel || !q || a.code.indexOf(q) === 0 || a.name.toLowerCase().indexOf(q) >= 0 || label(a).toLowerCase().indexOf(q) >= 0);
        active = Math.min(active, Math.max(0, shown.length - 1));
        list.innerHTML = shown.length
          ? shown.map((a, i) => `<div class="combo-item ${i === active ? 'active' : ''}" role="option" data-i="${i}" data-demo="acct-opt-${esc(a.code)}"><span class="code">${esc(a.code)}</span><span class="nm">${esc(a.name)}</span><span class="ty">${esc(typeLabel(a.type))}</span></div>`).join('')
          : `<div class="combo-empty">${esc(t('pm.noMatch'))}</div>`;
        const a = $('.active', list); if (a) a.scrollIntoView({ block: 'nearest' });
      };
      row._render = () => { if (!list.hidden) render(); };
      inp.addEventListener('focus', () => { inp.select(); active = 0; open(); render(); });
      inp.addEventListener('input', () => { delete row.dataset.acct; active = 0; open(); render(); });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) { open(); render(); } active = Math.min(shown.length - 1, active + 1); render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); render(); }
        else if (e.key === 'Enter') { if (!list.hidden && shown[active]) { e.preventDefault(); pick(shown[active]); dr.focus(); } }
        else if (e.key === 'Escape' && !list.hidden) { e.stopPropagation(); close(); }
      });
      inp.addEventListener('blur', () => {
        // accept an exact typed code, else restore the previous valid selection
        const typed = inp.value.trim();
        if (!row.dataset.acct && E.accounts[typed]) row.dataset.acct = typed;
        const a = row.dataset.acct && E.accounts[row.dataset.acct];
        inp.value = a ? label(a) : '';
        close();
      });
      // mousedown only keeps focus in the input; selection happens on click (works for synthetic clicks too)
      list.addEventListener('mousedown', (e) => { e.preventDefault(); });
      list.addEventListener('click', (e) => {
        const it = e.target.closest('.combo-item');
        if (it && shown[+it.dataset.i]) { pick(shown[+it.dataset.i]); if (e.isTrusted) dr.focus(); }
      });
      const sanitize = (el, other) => {
        const clean = el.value.replace(/[^0-9.,]/g, '');
        if (clean !== el.value) el.value = clean;
        if (parseAmt(el.value) > 0) other.value = '';
        totals();
      };
      dr.addEventListener('input', () => sanitize(dr, cr));
      cr.addEventListener('input', () => sanitize(cr, dr));
      [dr, cr].forEach((el) => {
        el.addEventListener('blur', () => { el.value = fmtAmt(parseAmt(el.value)); totals(); });
        el.addEventListener('focus', () => { el.value = plainAmt(parseAmt(el.value)); el.select(); });
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#checkBtn', modal).click(); } });
      });
      $('.rm', row).addEventListener('click', () => {
        if ($$('.g-row', rowsEl).length <= 2) { // keep minimum two lines, just clear
          delete row.dataset.acct; inp.value = ''; dr.value = ''; cr.value = ''; totals(); return;
        }
        row.remove(); reindex(); totals();
      });
    }

    // Resolve the account of a row from state, or from the typed text when it exactly names one.
    function rowAcct(r) {
      if (r.dataset.acct) return r.dataset.acct;
      const txt = $('.acct-in', r).value.trim();
      const m = /^(\d{4})(\s|$|·)/.exec(txt);
      if (m && E.accounts[m[1]] && (txt === m[1] || txt === label(E.accounts[m[1]]))) return m[1];
      return '';
    }

    function readLines() {
      const lines = [];
      $$('.g-row', rowsEl).forEach((r) => {
        const d = parseAmt($('.dr', r).value), c = parseAmt($('.cr', r).value), a = rowAcct(r);
        if (a && (d > 0 || c > 0)) lines.push({ acct: a, dr: Math.round(d * 100) / 100, cr: Math.round(c * 100) / 100 });
      });
      return lines;
    }
    const incomplete = () =>
      $$('.g-row', rowsEl).some((r) => {
        const has = parseAmt($('.dr', r).value) > 0 || parseAmt($('.cr', r).value) > 0;
        return has !== !!rowAcct(r) && (has || rowAcct(r));
      });

    const shake = () => { modal.classList.remove('shake'); void modal.offsetWidth; modal.classList.add('shake'); };

    function confetti() {
      if (reduceMotion) return;
      const box = $('#confetti', modal), colors = ['#2f6bff', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9'];
      let h = '';
      for (let i = 0; i < 42; i++) {
        const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 260;
        h += `<i style="--cc:${colors[i % colors.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 60}px;--rot:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 0.12}s"></i>`;
      }
      box.innerHTML = h;
    }

    function check() {
      if (st.solved || st.busy) return;
      const sc = cur();
      const lines = readLines();
      if (lines.length < 2) { shake(); setFb('bad', () => icon('alert', 16) + '<span>' + esc(t('pm.needTwo')) + '</span>'); return; }
      let res;
      try { res = E.attempt(sc.id, lines); } catch (err) { console.error(err); res = { correct: false, feedback: t('pm.engineError', { msg: err.message }), _local: true }; }
      st.attempts++;
      if (res && res.correct) {
        st.solved = true;
        setFb('ok', () => icon('check', 16) + '<span>' + esc(t('pm.correctPosting')) + '</span>');
        $$('input,button', rowsEl).forEach((n) => (n.disabled = true));
        $('#checkBtn', modal).disabled = true;
        confetti();
        const delta = num(sc.xp);
        toast('success', t('pm.correctToast', { n: delta }), sc.explanation || t('pm.postedToast'), 7000);
        completeStepFor(sc.id);
        setTimeout(() => { if (S.modal && S.modal.modal === modal) closeModal(); }, 1900);
      } else {
        shake();
        const eng = res && res.feedback && !res._local ? String(res.feedback) : '';
        setFb('bad', () => {
          let m2 = eng || (res && res.feedback) || t('pm.notQuite');
          if (st.attempts >= 2) m2 += ' ' + t('pm.nudge');
          return icon('alert', 16) + '<span>' + esc(m2) + '</span>';
        }, !!eng);
      }
    }

    function renderHint() {
      const h = $('#mHint', modal);
      h.hidden = !st.hintOn;
      if (st.hintOn) h.innerHTML = '<b>' + esc(t('pm.hintLabel')) + '</b> ' + esc(cur().hint || t('pm.hintFallback'));
    }
    function renderAnswer() {
      const a = $('#mAnswer', modal);
      a.hidden = !st.ansOn;
      if (!st.ansOn) return;
      const sc = cur();
      a.innerHTML = '<b>' + esc(t('pm.answer')) + '</b><table class="ans-tbl">' + (sc.lines || []).map((l) => {
        const ac = E.accounts[l.acct] || {};
        return `<tr><td>${esc(l.acct)} &middot; ${esc(ac.name || '')}</td><td class="r">${l.dr ? esc(t('pm.drShort')) + ' ' + money(l.dr, true) : ''}</td><td class="r">${l.cr ? esc(t('pm.crShort')) + ' ' + money(l.cr, true) : ''}</td></tr>`;
      }).join('') + '</table>' + (sc.explanation ? `<div>${esc(sc.explanation)}</div>` : '');
    }

    // Re-render every language-dependent piece in place, keeping the user's input.
    function relocalize() {
      const sc = cur();
      $('#mEyebrow', modal).textContent = t('pm.eyebrow') + ' · ' + bName(sc.building);
      $('#mTitle', modal).textContent = sc.title;
      $('#mPrompt', modal).textContent = sc.prompt;
      $('#mXp', modal).textContent = '+' + num(sc.xp) + ' ' + t('xp.unit');
      $('#mDiff', modal).innerHTML = [1, 2, 3].map((i) => `<i class="${i <= sc.difficulty ? 'on' : ''}"></i>`).join('') + '&nbsp;' + esc(diffName(sc.difficulty));
      applyI18n(modal);
      $$('.g-row', rowsEl).forEach((r) => {
        const inp = $('.acct-in', r);
        inp.setAttribute('placeholder', t('pm.accountPh'));
        inp.setAttribute('aria-label', t('tbl.account'));
        $('.dr', r).setAttribute('aria-label', t('pm.debitAmount'));
        $('.cr', r).setAttribute('aria-label', t('pm.creditAmount'));
        $('.rm', r).setAttribute('aria-label', t('pm.removeLine'));
        if (r.dataset.acct && E.accounts[r.dataset.acct]) inp.value = label(E.accounts[r.dataset.acct]);
        ['.dr', '.cr'].forEach((c) => { const el = $(c, r); if (doc.activeElement !== el) el.value = fmtAmt(parseAmt(el.value)); });
        if (r._render) r._render();
      });
      totals();
      renderHint();
      renderAnswer();
      if (st.fb) {
        if (st.fb.engineFed && !st.solved) setFb('bad', () => icon('alert', 16) + '<span>' + esc(t('pm.notQuite')) + '</span>');
        else fb.innerHTML = st.fb.fn();
      }
    }
    S.modal.relocalize = relocalize;

    // wiring
    for (let i = 0; i < nLines; i++) addRow();
    $$('[data-close]', modal).forEach((b) => b.addEventListener('click', () => closeModal()));
    $('#addRow', modal).addEventListener('click', (e) => { const r = addRow(); if (e.isTrusted) $('.acct-in', r).focus(); });
    $('#checkBtn', modal).addEventListener('click', check);
    $('#hintBtn', modal).addEventListener('click', () => { st.hintOn = true; renderHint(); });
    $('#ansBtn', modal).addEventListener('click', () => { st.ansOn = true; renderAnswer(); });
    $('#nextBtn', modal).addEventListener('click', () => {
      const sc = cur();
      let next = safe(() => E.nextScenario(sc.building), null);
      if (next && next.id === sc.id) next = safe(() => E.nextScenario(sc.building), next);
      openPractice(next, { prevFocus: S.modal && S.modal.prevFocus });
    });
    // clicking anywhere in the modal that is not an account combo closes open dropdowns
    modal.addEventListener('mousedown', (e) => { if (!e.target.closest('.combo')) closeLists(); });
    modal.addEventListener('click', (e) => { if (!e.target.closest('.combo')) closeLists(); });

    relocalize();
    const first = $('.acct-in', rowsEl);
    if (first && !opts.noFocus) first.focus();
  }

  function completeStepFor(scenarioId) {
    const step = (E.closeSteps || []).filter((s) => s.scenarioId === scenarioId && !s.done)[0];
    if (step) safe(() => E.completeCloseStep(step.id), null);
  }

  function openStep(stepId) {
    const step = (E.closeSteps || []).filter((s) => s.id === stepId)[0];
    if (!step) return;
    const sc = findScenario(step.scenarioId) || safe(() => E.nextScenario(step.building), null);
    openPractice(sc);
  }

  /* ========================================================================== Search */
  const searchState = { items: [], active: 0 };

  function searchAll(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    BIDS.filter((id) => (bName(id) + ' ' + bProc(id) + ' ' + id).toLowerCase().indexOf(q) >= 0).slice(0, 3)
      .forEach((id) => out.push({ type: 'building', g: t('search.buildings'), id, t: bName(id), s: bProc(id), ic: B[id].icon, color: B[id].color }));
    acctList().filter((a) => a.code.indexOf(q) === 0 || a.name.toLowerCase().indexOf(q) >= 0).slice(0, 5)
      .forEach((a) => out.push({ type: 'account', g: t('search.accounts'), id: a.code, t: a.code + ' · ' + a.name, s: typeLabel(a.type) + ' · ' + t('search.balance') + ' ' + money(a.balance, true), ic: 'layers' }));
    (E.journal || []).slice().reverse().filter((e) => e.id.toLowerCase().indexOf(q) >= 0 || (e.memo || '').toLowerCase().indexOf(q) >= 0).slice(0, 4)
      .forEach((e) => out.push({ type: 'je', g: t('search.entries'), id: e.id, t: e.id + ' · ' + e.memo, s: bName(e.process) + ' · ' + money(entryTotal(e), true), ic: 'book' }));
    (E.scenarios || []).filter((s) => s.id.toLowerCase().indexOf(q) >= 0 || (s.title || '').toLowerCase().indexOf(q) >= 0 || (s.prompt || '').toLowerCase().indexOf(q) >= 0).slice(0, 4)
      .forEach((s) => out.push({ type: 'scenario', g: t('search.scenarios'), id: s.id, t: s.title, s: bName(s.building) + ' · ' + diffName(s.difficulty) + ' · +' + num(s.xp) + ' ' + t('xp.unit'), ic: 'plusCircle', color: bColor(s.building) }));
    return out;
  }

  function renderSearch() {
    const box = $('#searchResults'), inp = $('#searchInput');
    const q = inp.value;
    if (!q.trim()) { box.hidden = true; inp.setAttribute('aria-expanded', 'false'); return; }
    const items = (searchState.items = searchAll(q));
    searchState.active = Math.min(searchState.active, Math.max(0, items.length - 1));
    let last = '', h = '';
    items.forEach((it, i) => {
      if (it.g !== last) { h += `<div class="sr-group label">${esc(it.g)}</div>`; last = it.g; }
      h += `<button type="button" class="sr-item ${i === searchState.active ? 'active' : ''}" role="option" data-i="${i}">
        <span class="sr-ic" style="${it.color ? 'color:' + it.color : ''}">${icon(it.ic, 15)}</span><span class="sr-t"><b>${esc(it.t)}</b><small>${esc(it.s)}</small></span></button>`;
    });
    box.innerHTML = h || '<div class="sr-empty">' + esc(t('search.none', { q })) + '</div>';
    box.hidden = false;
    inp.setAttribute('aria-expanded', 'true');
    const a = $('.sr-item.active', box); if (a) a.scrollIntoView({ block: 'nearest' });
  }

  function openResult(it) {
    if (!it) return;
    const inp = $('#searchInput');
    $('#searchResults').hidden = true;
    inp.setAttribute('aria-expanded', 'false');
    inp.value = '';
    inp.blur();
    if (it.type === 'building') { select(it.id, { focus: true, pulse: true }); W('select', it.id); }
    else if (it.type === 'account') {
      S.tbHighlight = it.id;
      if (isMobile()) setSheetTab('tables', true);
      setTab('tb');
      setTimeout(() => { S.tbHighlight = null; if (S.tab === 'tb') renderTable(); }, 3500);
    } else if (it.type === 'je') openEntryDetail(it.id);
    else if (it.type === 'scenario') openPractice(findScenario(it.id));
  }

  /* ================================================================== Event handling */
  function onMetrics(m) {
    S.metrics = m;
    updateKpis(m);
    updateBadges(m);
    updateXp(m);
    if (S.selected) renderInspector();
    if (S.tab !== 'journal') renderTable();
    renderFallback();
  }

  function onPosted(p) {
    const entry = p && p.entry;
    if (!entry) return;
    if (p.auto) S.autoIds.add(entry.id);
    const hops = entry.flow && entry.flow.length ? entry.flow : entry.process && entry.process !== 'ledger' ? [{ from: entry.process, to: 'ledger', kind: 'entry', label: entry.id }] : [];
    const accent = bColor(entry.process);
    W('pulse', entry.process, accent);
    if (hops.length) {
      const pr = W('flow', hops);
      if (pr && typeof pr.then === 'function') pr.then(() => W('pulse', 'ledger', bColor('ledger')), () => {});
    } else {
      W('pulse', 'ledger', bColor('ledger'));
    }
    S.flashId = entry.id;
    if (S.tab === 'journal') renderTable();
    setTimeout(() => { if (S.flashId === entry.id) S.flashId = null; }, 2600);
    if (S.selected) renderInspector();
    if (p.auto) {
      const now = Date.now();
      if (now - S.lastAutoToast > 10000) {
        S.lastAutoToast = now;
        toast('info', t('toast.autoPosted', { id: entry.id }), (entry.memo || '') + ' · ' + money(entryTotal(entry)), 4200);
      }
    }
  }

  function setStatus(building, level) {
    if (!B[building]) return;
    S.statuses[building] = level;
    W('setStatus', building, level);
    clearTimeout(S.statusTimers[building]);
    if (level !== 'ok') {
      S.statusTimers[building] = setTimeout(() => {
        S.statuses[building] = 'ok';
        W('setStatus', building, 'ok');
        if (S.selected === building) renderInspector();
        renderFallback();
      }, 45000);
    }
    if (S.selected === building) renderInspector();
    renderFallback();
  }

  function onAlert(a) {
    if (!a) return;
    if (a.level === 'ok') { setStatus(a.building, 'ok'); return; }   // engine signals a cleared condition
    const level = a.level === 'alert' ? 'alert' : 'warn';
    setStatus(a.building, level);
    const key = a.building + '|' + a.message, now = Date.now();
    if (S.lastAlertMsg[key] && now - S.lastAlertMsg[key] < 20000) return;
    S.lastAlertMsg[key] = now;
    toast(level, t(level === 'alert' ? 'toast.alertTitle' : 'toast.warnTitle', { b: bName(a.building) }), a.message, 6500);
  }

  /* ----------------------------------------------------------------- speed / live */
  function syncSpeedUi() {
    $$('#speedSeg button').forEach((b) => b.setAttribute('aria-pressed', String(S.running ? b.dataset.speed === String(S.speed) : b.dataset.speed === 'pause')));
    $('#livePill').classList.toggle('paused', !S.running);
    $('#liveLabel').textContent = S.running ? t('live.live') : t('live.paused');
  }
  function setSpeedMode(mode) {
    try {
      if (mode === 'pause') {
        if (S.running) E.stop();
        S.running = false;
      } else {
        S.speed = +mode;
        if (typeof E.setSpeed === 'function') E.setSpeed(S.speed);
        if (!S.running) { E.start(); S.running = true; }
      }
    } catch (e) { console.warn('[ui] speed', e); }
    syncSpeedUi();
  }

  function tickClock() {
    const d = new Date();
    $('#clock').textContent = d.toLocaleTimeString('en-GB');
    const last = (E.journal || [])[(E.journal || []).length - 1];
    if (last && last.date) {
      const mo = I.fmtMonth(last.date);
      if (mo) $('#monthLabel').textContent = mo;
    }
  }

  /* ---------------------------------------------------------------------- fatal */
  function fatal(title, msg) {
    const f = doc.createElement('div');
    f.id = 'fatal';
    f.innerHTML = `<div class="box" role="alert"><h2>${esc(title)}</h2><p>${msg}</p></div>`;
    doc.body.appendChild(f);
    doc.body.classList.remove('loading');
  }

  /* ============================================================== language switching */
  function labelsMap() {
    const m = {};
    BIDS.forEach((id) => { m[id] = bName(id); });
    m.customers = t('gate.customers');
    m.vendors = t('gate.vendors');
    return m;
  }

  function syncLangSwitch() {
    $$('#langSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === I.lang)));
  }

  function applyLang() {
    if (!E) return;
    const L = I.lang;
    doc.documentElement.lang = L;
    doc.title = t('app.title');
    if (typeof E.setLang === 'function' && E.lang !== L) {
      try { E.setLang(L); } catch (e) { console.warn('[ui] engine.setLang failed', e); }
    }
    applyI18n(doc);
    syncLangSwitch();
    W('setLabels', labelsMap());
    W('setTeam', teamList());
    S.badges = {};
    S.prevInsp = {};
    const m = (S.metrics = getMetrics());
    updateKpis(m, true);
    updateBadges(m);
    updateXp(m, true);
    renderInspector();
    renderClose();
    renderTable();
    renderTeam(true);
    renderFeed();
    renderFallback();
    syncSpeedUi();
    tickClock();
    if ($('#searchInput').value) renderSearch();
    if (S.modal && typeof S.modal.relocalize === 'function') S.modal.relocalize();
  }

  /* ======================================================================== boot */
  function boot() {
    hydrate(doc);
    if (!LW.engine) {
      doc.body.classList.add('no-world');
      applyI18n(doc);
      fatal(t('fatal.title'), t('fatal.body'));
      return;
    }
    E = LW.engine;

    // keep engine language in sync before the first render
    if (typeof E.setLang === 'function' && E.lang !== I.lang) { try { E.setLang(I.lang); } catch (e) { console.warn('[ui]', e); } }
    doc.documentElement.lang = I.lang;
    doc.title = t('app.title');
    applyI18n(doc);
    syncLangSwitch();

    // 3D world (optional)
    let ok = false;
    if (LW.world && typeof LW.world.init === 'function') {
      try { ok = LW.world.init($('#world')) !== false; } catch (e) { console.error('[ui] world.init failed', e); ok = false; }
    }
    S.hasWorld = ok;
    if (!ok) doc.body.classList.add('no-world');
    if (ok) {
      W('on', 'select', (id) => { if ((id || null) !== S.selected) select(id || null); });
      W('setLabels', labelsMap());
      W('setTeam', teamList());
    }

    buildKpis();
    S.metrics = getMetrics();
    updateKpis(S.metrics);
    updateXp(S.metrics, true);
    renderInspector();
    renderClose();
    setTab('journal', { noSheet: true });
    renderTeam(true);
    renderFeed();
    renderFallback();
    tickClock();
    setInterval(tickClock, 1000);
    if (!ok) setTimeout(() => toast('warn', t('toast.noWebglTitle'), t('toast.noWebglBody'), 5000), 600);

    // engine events
    E.on('posted', onPosted);
    E.on('metrics', onMetrics);
    E.on('alert', onAlert);
    E.on('close', () => { renderClose(); if (S.selected === 'reporting') renderInspector(); });
    E.on('xp', (x) => { if (x && x.delta) pulseXp(x.delta); });
    E.on('activity', onActivity);
    E.on('team', () => { renderTeam(); });
    // language: single source of truth is LW.i18n
    I.on(applyLang);

    // ---- DOM events
    $('#speedSeg').addEventListener('click', (e) => { const b = e.target.closest('button[data-speed]'); if (b) setSpeedMode(b.dataset.speed); });
    $('#langSeg').addEventListener('click', (e) => { const b = e.target.closest('button[data-lang]'); if (b && b.dataset.lang !== I.lang) I.setLang(b.dataset.lang); });
    $('#mapctl').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'zoomIn') W('zoom', 1);
      else if (a === 'zoomOut') W('zoom', -1);
      else if (a === 'rotL') W('rotate', Math.PI / 8);
      else if (a === 'rotR') W('rotate', -Math.PI / 8);
      else if (a === 'home') W('resetView');
      if (!S.hasWorld) toast('warn', t('toast.noWebglTitle'), t('toast.mapNeedsWebgl'), 2500);
    });
    $('#companyPill').addEventListener('click', () => toast('info', t('co.name'), t('co.only'), 3600));
    $('#tblTabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) setTab(b.dataset.tab); });
    $('#tblWrap').addEventListener('click', (e) => { const r = e.target.closest('tr[data-je]'); if (r) openEntryDetail(r.dataset.je); });
    $('#closePanel').addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b) openStep(b.dataset.step); });
    $('#teamPanel').addEventListener('click', (e) => {
      const r = e.target.closest('[data-member]'); if (!r) return;
      const m = memberById(r.dataset.member);
      if (!m) return;
      W('focus', m.home);
      W('highlightMember', m.id);
      if (!S.hasWorld) toast('warn', t('toast.noWebglTitle'), t('toast.focusNeedsWebgl'), 2500);
    });
    $('#inspector').addEventListener('click', (e) => {
      const je = e.target.closest('[data-je]'); if (je) { openEntryDetail(je.dataset.je); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'close-insp') selectBuilding(null);
      else if (b.dataset.act === 'practice') {
        let sc = null;
        if (S.queued) { sc = findScenario(S.queued); S.queued = null; }
        openPractice(sc || safe(() => E.nextScenario(S.selected), null), { prevFocus: b });
      } else if (b.dataset.act === 'focus') { W('focus', S.selected); if (!S.hasWorld) toast('warn', t('toast.noWebglTitle'), t('toast.focusNeedsWebgl'), 2500); }
    });
    $('#fallback').addEventListener('click', (e) => { const c = e.target.closest('[data-b]'); if (c) select(c.dataset.b, { pulse: true }); });
    $('#sheetHandle').addEventListener('click', () => $('#sheet').classList.toggle('collapsed'));
    $('.sheet-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-stab]'); if (b) setSheetTab(b.dataset.stab, true); });
    if (isMobile()) $('#sheet').classList.add('collapsed');
    setSheetTab('tables');

    // search
    const sInp = $('#searchInput');
    sInp.addEventListener('input', () => { searchState.active = 0; renderSearch(); });
    sInp.addEventListener('focus', renderSearch);
    sInp.addEventListener('keydown', (e) => {
      const n = searchState.items.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); searchState.active = Math.min(n - 1, searchState.active + 1); renderSearch(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); searchState.active = Math.max(0, searchState.active - 1); renderSearch(); }
      else if (e.key === 'Enter') { e.preventDefault(); openResult(searchState.items[searchState.active]); }
      else if (e.key === 'Escape') { sInp.value = ''; renderSearch(); sInp.blur(); }
    });
    $('#searchResults').addEventListener('mousedown', (e) => {
      e.preventDefault();
      const b = e.target.closest('.sr-item'); if (b) openResult(searchState.items[+b.dataset.i]);
    });
    sInp.addEventListener('blur', () => setTimeout(() => { $('#searchResults').hidden = true; sInp.setAttribute('aria-expanded', 'false'); }, 120));
    doc.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((doc.activeElement || {}).tagName || '') && !S.modal) { e.preventDefault(); sInp.focus(); }
    });

    // public API (before the simulation starts so the demo can attach early)
    LW.ui = {
      select, selectBuilding, openPractice, closeModal: () => closeModal(), isModalOpen, toast, setTab,
      setLang: (l) => I.setLang(l), getLang: () => I.lang, showTeam,
      queueScenario: (id) => { S.queued = id || null; },
    };

    // start simulation
    try { if (typeof E.setSpeed === 'function') E.setSpeed(1); E.start(); S.running = true; } catch (e) { console.warn('[ui] engine.start failed', e); S.running = false; }
    setSpeedMode(S.running ? '1' : 'pause');
    updateBadges(S.metrics);
    doc.body.classList.remove('loading');
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
