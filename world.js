/* LedgerWorks - world.js
 * Three.js (r128) isometric accounting campus. Attaches LW.world.
 * No business logic here: engine/ui drive it through the contract in SPEC.md.
 */
(function () {
  'use strict';
  var LW = (window.LW = window.LW || {});
  var T = window.THREE;

  /* =====================================================================
   * Layout constants (world units). +z is "south" (towards default camera).
   * ===================================================================== */
  var AZ = -9.5, BZ = 14, CZ = 38, LZ0 = -36, LX = 42, VX = 15, RW = 4.4;
  var ROAD_Y = 0.14, PAD_Y = 0.08;
  var SLAB = { x0: -68, x1: 68, z0: -50, z1: 52 };
  var IDS = ['sales', 'procure', 'warehouse', 'bank', 'payroll', 'ledger', 'reporting'];
  var ENDPOINTS = ['customers', 'vendors'];
  var NAMES = {
    sales: 'Sales & Billing', procure: 'Procurement', warehouse: 'Inventory', bank: 'Treasury',
    payroll: 'Payroll', ledger: 'General Ledger', reporting: 'Reporting & Close',
    customers: 'Customers', vendors: 'Vendors'
  };
  var LABELS = {};
  Object.keys(NAMES).forEach(function (k) { LABELS[k] = NAMES[k]; });
  // Calm palette: hues keep their identity, saturation is pulled toward a neutral grey-blue.
  function muteHex(hex, k) {
    var c = new T.Color(hex), hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    var sat = hsl.s * (1 - k);
    c.setHSL(hsl.h, sat, hsl.l);
    c.lerp(new T.Color('#8a96a8'), 0.1 * hsl.s * k * 2);
    return '#' + c.getHexString();
  }
  function muteMap(o, k) { var r = {}; Object.keys(o).forEach(function (key) { r[key] = muteHex(o[key], k); }); return r; }
  var GLOBAL_MUTE = 0.1;   // applied to every lit material colour in mat()
  var ACC = muteMap({
    sales: '#2f6bff', procure: '#8b5cf6', warehouse: '#f59e0b', bank: '#10b981', payroll: '#ec4899',
    ledger: '#0ea5e9', reporting: '#6366f1', customers: '#2f6bff', vendors: '#8b5cf6'
  }, 0.12);
  var KIND = muteMap({
    invoice: '#2f6bff', bill: '#8b5cf6', cash: '#10b981', goods: '#f59e0b', payroll: '#ec4899',
    entry: '#22d3ee', report: '#6366f1'
  }, 0.12);
  var STATUS_COL = { ok: '#4fb585', warn: '#e6a23a', alert: '#d9534f' };

  // world position, footprint [w,d], door node, ground pad rect
  var DEF = {
    sales:     { pos: [-28, -22], size: [15, 10], door: [-28, -14.5], pad: [-37.5, -18.5, -29.5, -12.4] },
    ledger:    { pos: [0, -22],   size: [14, 12], door: [0, -13.8],   pad: [-13.4, 9.0, -29.5, -12.4] },
    procure:   { pos: [28, -22],  size: [15, 10], door: [28, -14.5],  pad: [18.5, 37.5, -29.5, -12.4] },
    payroll:   { pos: [0, 3],     size: [14, 9],  door: [0, 10],      pad: [-9.5, 12.4, -3, 11.5] },
    bank:      { pos: [-28, 26],  size: [13, 9],  door: [-28, 33.5],  pad: [-37.5, -18.5, 19, 35.6] },
    reporting: { pos: [0, 26],    size: [14, 9],  door: [0, 33.5],    pad: [-9.5, 9.5, 19, 35.6] },
    warehouse: { pos: [28, 26],   size: [17, 11], door: [28, 33.8],   pad: [18.5, 37.5, 18, 35.6] }
  };

  /* ---------- road network (axis aligned centre lines) ---------- */
  var ROADS = [
    [-68, AZ, 68, AZ, 'main'], [-LX, BZ, LX, BZ, 'main'], [-LX, CZ, LX, CZ, 'main'], [-LX, LZ0, LX, LZ0, 'main'],
    [-LX, LZ0, -LX, CZ, 'main'], [LX, LZ0, LX, CZ, 'main'], [-VX, AZ, -VX, CZ, 'main'], [VX, AZ, VX, CZ, 'main'],
    [-28, AZ, -28, -14.5, 'drive'], [28, AZ, 28, -14.5, 'drive'], [0, AZ, 0, -13.8, 'drive'],
    [0, BZ, 0, 10, 'drive'], [-28, CZ, -28, 33.5, 'drive'], [0, CZ, 0, 33.5, 'drive'], [28, CZ, 28, 33.8, 'drive']
  ];
  var NODEDEF = {
    gW: [-64, AZ], gE: [64, AZ],
    AW: [-LX, AZ], A1: [-28, AZ], AP: [-VX, AZ], A0: [0, AZ], AQ: [VX, AZ], A2: [28, AZ], AE: [LX, AZ],
    BW: [-LX, BZ], BP: [-VX, BZ], B0: [0, BZ], BQ: [VX, BZ], BE: [LX, BZ],
    CW: [-LX, CZ], C1: [-28, CZ], CP: [-VX, CZ], C0: [0, CZ], CQ: [VX, CZ], C2: [28, CZ], CE: [LX, CZ],
    NW: [-LX, LZ0], N0: [0, LZ0], NE: [LX, LZ0],
    dSales: DEF.sales.door, dProc: DEF.procure.door, dLedger: DEF.ledger.door, dPay: DEF.payroll.door,
    dBank: DEF.bank.door, dRep: DEF.reporting.door, dWare: DEF.warehouse.door
  };
  var CHAINS = [
    ['gW', 'AW', 'A1', 'AP', 'A0', 'AQ', 'A2', 'AE', 'gE'], ['BW', 'BP', 'B0', 'BQ', 'BE'],
    ['CW', 'C1', 'CP', 'C0', 'CQ', 'C2', 'CE'], ['NW', 'N0', 'NE'],
    ['NW', 'AW', 'BW', 'CW'], ['NE', 'AE', 'BE', 'CE'], ['AP', 'BP', 'CP'], ['AQ', 'BQ', 'CQ'],
    ['A1', 'dSales'], ['A2', 'dProc'], ['A0', 'dLedger'], ['B0', 'dPay'], ['C1', 'dBank'], ['C0', 'dRep'], ['C2', 'dWare']
  ];
  var NODE_OF = {
    customers: 'gW', vendors: 'gE', sales: 'dSales', procure: 'dProc', ledger: 'dLedger', payroll: 'dPay',
    bank: 'dBank', reporting: 'dRep', warehouse: 'dWare'
  };

  /* =====================================================================
   * Small helpers
   * ===================================================================== */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeIO(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function C(hex) { return new T.Color(hex).convertSRGBToLinear(); }
  function mixHex(a, b, t) {
    var ca = new T.Color(a), cb = new T.Color(b);
    return '#' + ca.lerp(cb, t).getHexString();
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- events ---------- */
  var handlers = {};
  function emit(ev, a) {
    (handlers[ev] || []).slice().forEach(function (fn) { try { fn(a); } catch (e) { console.error(e); } });
  }

  /* ---------- state ---------- */
  var S = {
    ready: false, buildings: {}, endpoints: {}, nodes: {}, adj: {}, tick: [], flows: [], ambient: [],
    labels: [], pulses: [], timeScale: 1, hovered: null, selected: null, tweens: [], view: null,
    mouse: new T.Vector2(), hoverDirty: false, pickables: [], t: 0
  };
  if (!T) { S.noTHREE = true; }

  /* =====================================================================
   * Geometry / material factories (cached, shared)
   * ===================================================================== */
  var GC = {}, MC = {};
  function boxGeo(w, h, d) { var k = 'b' + w + ',' + h + ',' + d; return GC[k] || (GC[k] = new T.BoxGeometry(w, h, d)); }
  function cylGeo(rt, rb, h, s) { var k = 'c' + rt + ',' + rb + ',' + h + ',' + s; return GC[k] || (GC[k] = new T.CylinderGeometry(rt, rb, h, s)); }
  function mat(hex, o) {
    o = o || {};
    var k = hex + '|' + JSON.stringify(o);
    if (MC[k]) return MC[k];
    var p = { color: C(o.raw ? hex : muteHex(hex, GLOBAL_MUTE)) };
    if (o.e) { p.emissive = C(o.e); p.emissiveIntensity = (o.ei != null ? o.ei : 1) * 0.1; } // no glow, only a trace of tint
    if (o.o != null) { p.transparent = true; p.opacity = o.o; p.depthWrite = o.o > 0.6; }
    var m;
    if (o.std) {
      p.roughness = o.r != null ? o.r : 0.6; p.metalness = o.m || 0;
      if (o.flat) p.flatShading = true;
      m = new T.MeshStandardMaterial(p);
    } else m = new T.MeshLambertMaterial(p);
    return (MC[k] = m);
  }
  function basic(hex, o) {
    o = o || {};
    var k = 'B' + hex + JSON.stringify(o);
    if (MC[k]) return MC[k];
    var p = { color: C(hex), toneMapped: false };
    if (o.o != null) { p.transparent = true; p.opacity = o.o; p.depthWrite = false; }
    if (o.add) { p.blending = T.AdditiveBlending; p.transparent = true; p.depthWrite = false; }
    return (MC[k] = new T.MeshBasicMaterial(p));
  }

  function add(parent, geo, m, x, y, z, o) {
    var mesh = new T.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = !(o && o.ns);
    mesh.receiveShadow = !(o && o.nr);
    if (o) { if (o.rx) mesh.rotation.x = o.rx; if (o.ry) mesh.rotation.y = o.ry; if (o.rz) mesh.rotation.z = o.rz; }
    parent.add(mesh);
    return mesh;
  }
  function bx(p, w, h, d, m, x, y, z, o) { return add(p, boxGeo(w, h, d), m, x, y + h / 2, z, o); }
  function cy(p, rt, rb, h, s, m, x, y, z, o) { return add(p, cylGeo(rt, rb, h, s), m, x, y + h / 2, z, o); }

  /* ---------- palette ---------- */
  var P = {
    wall: '#f1f0ec', wall2: '#e4e4e1', white: '#f8f7f4', plinth: '#c9c8c3', roof: '#e3e2de', dark: '#3a4252',
    dark2: '#4a5262', conc: '#e1e0dc', grey: '#c6c7c8', tire: '#2c3038', hub: '#cfd0d1', wood: '#cf9f6e',
    wood2: '#b08550', gold: '#e2b84a', gold2: '#c09a3a', green: '#7fb48c'
  };
  function glass() { return mat('#a9c3d8', { std: true, r: 0.35, m: 0.02, e: '#6f96b8', ei: 0.3 }); }
  function glassDark() { return mat('#7fa3c2', { std: true, r: 0.35, m: 0.02, e: '#4d7396', ei: 0.3 }); }
  function glassVeh() { return mat('#3b4a60', { std: true, r: 0.35, m: 0.05, e: '#4a6283', ei: 0.2 }); }

  /* ---------- merge static meshes per material (keeps draw calls low) ---------- */
  function mergeGeos(list) {
    var pos = [], nor = [], uv = [], idx = [], off = 0;
    list.forEach(function (it) {
      var g = it.geo.clone(); g.applyMatrix4(it.m);
      var p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, i;
      for (i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i));
        nor.push(n.getX(i), n.getY(i), n.getZ(i));
        if (u) uv.push(u.getX(i), u.getY(i)); else uv.push(0, 0);
      }
      if (g.index) for (i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
      else for (i = 0; i < p.count; i++) idx.push(i + off);
      off += p.count; g.dispose();
    });
    var G = new T.BufferGeometry();
    G.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    G.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    G.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    G.setIndex(idx);
    G.computeBoundingSphere();
    return G;
  }
  function mergeStatic(root) {
    root.updateMatrixWorld(true);
    var inv = new T.Matrix4().copy(root.matrixWorld).invert();
    var groups = {}, order = [];
    root.traverse(function (o) {
      if (!o.isMesh || o.userData.keep || o.userData.proxy) return;
      var p = o.parent;
      while (p && p !== root) { if (p.userData.dyn) return; p = p.parent; }
      var key = o.material.uuid + (o.castShadow ? 'c' : 'n') + (o.receiveShadow ? 'r' : 'n');
      if (!groups[key]) { groups[key] = { mat: o.material, cs: o.castShadow, rs: o.receiveShadow, items: [] }; order.push(key); }
      groups[key].items.push(o);
    });
    order.forEach(function (k) {
      var gr = groups[k];
      var list = gr.items.map(function (o) { return { geo: o.geometry, m: new T.Matrix4().multiplyMatrices(inv, o.matrixWorld) }; });
      gr.items.forEach(function (o) { o.parent.remove(o); });
      var mesh = new T.Mesh(mergeGeos(list), gr.mat);
      mesh.castShadow = gr.cs; mesh.receiveShadow = gr.rs;
      root.add(mesh);
    });
    return root;
  }

  /* ---------- canvas textures ---------- */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function canvasTex(w, h, draw) {
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    var t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    return t;
  }
  var FONT = 'Inter,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  var _glowTex = null;
  function glowTex() {
    if (_glowTex) return _glowTex;
    _glowTex = canvasTex(64, 64, function (c) {
      var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    });
    return _glowTex;
  }
  function glowSprite(hex, size, op) {
    var s = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color: new T.Color(hex), transparent: true, opacity: op == null ? 0.8 : op, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.scale.set(size, size, 1);
    return s;
  }
  function pillCanvas(text, o) {
    var s = 3, fs = (o.fs || 24) * s, pad = (o.pad || 14) * s, dotR = o.dot ? (o.dotR || 7) * s : 0;
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    var font = '700 ' + fs + 'px ' + FONT;
    ctx.font = font;
    var tw = Math.ceil(ctx.measureText(text).width);
    var h = Math.ceil(fs + pad * 1.05), w = tw + pad * 2 + (dotR ? dotR * 2 + 8 * s : 0), sh = 7 * s;
    cv.width = Math.ceil(w + sh * 2); cv.height = Math.ceil(h + sh * 2);
    ctx.font = font; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(20,28,46,.26)'; ctx.shadowBlur = sh * 0.6; ctx.shadowOffsetY = 1.5 * s;
    ctx.fillStyle = o.bg || '#ffffff';
    rr(ctx, sh, sh, w, h, h / 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    var bd = o.border || (o.bg ? null : 'rgba(40,52,76,.55)');
    if (bd) { ctx.strokeStyle = bd; ctx.lineWidth = 1.4 * s; rr(ctx, sh, sh, w, h, h / 2); ctx.stroke(); }
    var x = sh + pad;
    if (dotR) { ctx.fillStyle = o.dot; ctx.beginPath(); ctx.arc(x + dotR, sh + h / 2, dotR, 0, 7); ctx.fill(); x += dotR * 2 + 8 * s; }
    ctx.fillStyle = o.fg || '#0f1729';
    ctx.fillText(text, x, sh + h / 2 + s);
    cv.pad = sh;
    return cv;
  }
  // returns sprite with .userData.setText(text)
  function pillSprite(text, o, H) {
    var spr = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    spr.renderOrder = 30;
    spr.userData.H = H;
    function set(t) {
      spr.userData.text = t;
      var cv = pillCanvas(t, o);
      var tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
      if (spr.material.map) spr.material.map.dispose();
      spr.material.map = tex; spr.material.needsUpdate = true;
      spr.userData.bw = H * cv.width / cv.height; spr.userData.bh = H; spr.userData.padFrac = cv.pad / cv.height;
      spr.scale.set(spr.userData.bw, H, 1);
    }
    spr.userData.setText = set; set(text);
    S.labels.push(spr);
    return spr;
  }
  function disposeSprite(spr) {
    var i = S.labels.indexOf(spr); if (i >= 0) S.labels.splice(i, 1);
    if (spr.material.map) spr.material.map.dispose(); spr.material.dispose();
    if (spr.parent) spr.parent.remove(spr);
  }

  /* =====================================================================
   * Buildings
   * ===================================================================== */
  function shell(g, W, H, D, A, o) {
    o = o || {};
    bx(g, W + 0.6, 0.25, D + 0.6, mat(P.plinth), 0, 0, 0);
    bx(g, W, H - 0.25, D, mat(o.wall || P.wall), 0, 0.25, 0);
    bx(g, W + 1.0, 0.35, D + 1.0, mat(A), 0, H, 0);
    bx(g, W + 0.7, 0.45, D + 0.7, mat(P.roof), 0, H + 0.35, 0);
    return H + 0.8;
  }
  function win(g, w, h, x, y, z, ry, dark) {
    var o = ry ? { ry: ry } : null;
    var d = dark ? glassDark() : glass();
    var c = Math.cos(ry || 0), s = Math.sin(ry || 0);
    bx(g, w + 0.28, h + 0.28, 0.1, mat(P.white), x, y - 0.14, z, o);
    // glass sits proud of frame along local normal
    bx(g, w, h, 0.14, d, x + s * 0.03, y, z + c * 0.03, o);
  }
  function crate(g, x, y, z, s, ry) {
    bx(g, s, s, s, mat(P.wood), x, y, z, { ry: ry || 0 });
    bx(g, s + 0.04, s * 0.14, s + 0.04, mat(P.wood2), x, y + s * 0.2, z, { ry: ry || 0 });
    bx(g, s + 0.04, s * 0.14, s + 0.04, mat(P.wood2), x, y + s * 0.66, z, { ry: ry || 0 });
  }
  function pallet(g, x, z, w, d) {
    bx(g, w, 0.16, d, mat('#c89a5a'), x, 0, z);
    bx(g, w, 0.1, d * 0.2, mat('#a97b3e'), x, 0.16, z - d * 0.35);
    bx(g, w, 0.1, d * 0.2, mat('#a97b3e'), x, 0.16, z + d * 0.35);
  }
  function box(g, x, y, z, w, h, d, ry, col) {
    bx(g, w, h, d, mat(col || '#dca96a'), x, y, z, { ry: ry || 0 });
    bx(g, w * 0.16, h + 0.02, d + 0.02, mat('#f2dfb8'), x, y, z, { ry: ry || 0 });
  }
  function paperStack(g, x, z, A, n) {
    bx(g, 1.7, 0.16, 1.3, mat('#c89a5a'), x, 0, z);
    for (var i = 0; i < n; i++) {
      bx(g, 1.5, 0.22, 1.1, mat(i % 2 ? '#ffffff' : '#eef3ff'), x, 0.16 + i * 0.23, z);
    }
    bx(g, 1.52, 0.1, 1.12, mat(A), x, 0.16 + n * 0.23, z);
  }
  var _coinMats = {};
  function coinMat(n) {
    if (_coinMats[n]) return _coinMats[n];
    var tex = canvasTex(8, 64, function (c) {
      for (var i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#e9a912' : '#fcd34d'; c.fillRect(0, i * 8, 8, 8); }
    });
    tex.wrapT = T.RepeatWrapping; tex.repeat.set(1, n);
    return (_coinMats[n] = new T.MeshLambertMaterial({ map: tex }));
  }
  function coinStack(g, x, z, n, r) {
    r = r || 0.85;
    add(g, new T.CylinderGeometry(r, r, n * 0.3, 14), coinMat(n), x, n * 0.15, z);
  }
  function rollDoor(g, x, y, z, w, h, A) {
    bx(g, w + 0.5, h + 0.35, 0.16, mat(A), x, y - 0.05, z);
    bx(g, w, h, 0.22, mat('#e4e9f1'), x, y, z + 0.02);
    for (var i = 1; i < 6; i++) bx(g, w, 0.07, 0.26, mat('#b9c3d3'), x, y + i * (h / 6), z + 0.03);
    bx(g, w, 0.35, 0.28, mat('#f5c518'), x, y + h - 0.35, z + 0.03);
    for (var j = 0; j < 4; j++) bx(g, 0.34, 0.35, 0.3, mat('#2a3550'), x - w / 2 + 0.4 + j * (w - 0.8) / 3, y + h - 0.35, z + 0.04);
  }
  function post(g, x, y, z, h, m) { cy(g, 0.14, 0.14, h, 6, m || mat(P.dark2), x, y, z); }

  var GABLE = {};
  function gableGeo(w, rise, d) {
    var k = w + ',' + rise + ',' + d; if (GABLE[k]) return GABLE[k];
    var sh = new T.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, rise); sh.lineTo(-w / 2, 0);
    var g = new T.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return (GABLE[k] = g);
  }

  /* ---- a few static cars used in parking bays ---- */
  function parkedCar(g, x, z, ry, col, scale) {
    var c = makeCar(col); c.position.set(x, 0, z); c.rotation.y = ry || 0; if (scale) c.scale.setScalar(scale);
    g.add(c);
  }

  /* ---------------- SALES ---------------- */
  function buildSales(g) {
    var A = ACC.sales, W = 15, H = 6.2, D = 10, fz = D / 2;
    var top = shell(g, W, H, D, A);
    var wm = mat(P.white), am = mat(A);
    [-1, 1].forEach(function (s) {
      bx(g, 5.2, 3.1, 0.14, glass(), s * 4.0, 0.9, fz + 0.03);
      bx(g, 5.55, 0.22, 0.22, wm, s * 4.0, 0.75, fz + 0.06);
      bx(g, 5.55, 0.22, 0.22, wm, s * 4.0, 4.0, fz + 0.06);
      bx(g, 0.14, 3.2, 0.2, wm, s * 4.0, 0.9, fz + 0.07);
      bx(g, 5.55, 0.5, 0.2, am, s * 4.0, 0.25, fz + 0.06);
    });
    bx(g, 2.5, 3.3, 0.14, glassDark(), 0, 0.6, fz + 0.04);
    bx(g, 0.1, 3.3, 0.2, wm, 0, 0.6, fz + 0.08);
    bx(g, 2.9, 0.25, 0.24, wm, 0, 3.95, fz + 0.06);
    for (var i = -2; i <= 2; i++) win(g, 1.8, 1.0, i * 2.9, 4.6, fz + 0.02, 0, true);
    // side windows
    [-1, 1].forEach(function (s) { for (var k = -1; k <= 1; k++) win(g, 1.6, 1.8, s * (W / 2 + 0.02), 2.3, k * 3, Math.PI / 2 * s, false); });
    // striped awning
    for (var a = 0; a < 8; a++) {
      bx(g, 1.5, 0.12, 2.5, mat(a % 2 ? P.white : A), -5.25 + a * 1.5, 3.55, fz + 1.2, { rx: 0.26 });
    }
    bx(g, 12.1, 0.16, 0.16, am, 0, 3.95, fz + 0.1);
    // paper stacks / pallets at side yards
    paperStack(g, -8.7, 3.2, A, 5); paperStack(g, -8.7, 0.8, A, 3); paperStack(g, 8.7, 2.6, A, 4);
    bx(g, 1.6, 0.9, 1.0, mat('#ffffff'), 8.7, 0.16, 0.4);
    bx(g, 1.62, 0.12, 1.02, am, 8.7, 1.0, 0.4);
    // roof invoice billboard
    var bb = new T.Group(); bb.position.set(0, top, -1.6); bb.rotation.x = -0.1; g.add(bb);
    post(bb, -2.4, 0, 0, 1.5); post(bb, 2.4, 0, 0, 1.5);
    bx(bb, 6.6, 4.2, 0.3, mat(P.white), 0, 1.5, 0);
    bx(bb, 6.6, 0.35, 0.34, am, 0, 5.35, 0);
    var tex = canvasTex(512, 320, function (c, w, h) {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      c.fillStyle = A; c.fillRect(0, 0, w, 74);
      c.fillStyle = '#fff'; c.font = '800 44px ' + FONT; c.textBaseline = 'middle'; c.fillText('INVOICE', 28, 38);
      c.font = '600 24px ' + FONT; c.fillText('#INV-2041', w - 190, 38);
      c.fillStyle = '#c8d3ea';
      for (var i = 0; i < 4; i++) { c.fillRect(28, 104 + i * 38, 300 - (i % 2) * 70, 14); c.fillRect(w - 128, 104 + i * 38, 100, 14); }
      c.fillStyle = A; rr(c, w - 218, h - 78, 190, 52, 12); c.fill();
      c.fillStyle = '#fff'; c.font = '800 32px ' + FONT; c.fillText('€ 4,820', w - 196, h - 51);
    });
    add(bb, new T.PlaneGeometry(6.2, 3.9), new T.MeshBasicMaterial({ map: tex, toneMapped: false }), 0, 3.5, 0.17, { ns: true });
    // parked cars
    parkedCar(g, -5.6, fz + 3.9, Math.PI / 2, '#f4f6fb'); parkedCar(g, 5.4, fz + 3.9, Math.PI / 2, '#fbbf24');
    return { top: top + 5.6, beacon: [W / 2 - 0.4, top, fz - 0.8], label: top + 6.2, anchor: [0, top + 6.6, 0],
      proxies: [[W + 1, top + 1, D + 1, 0, (top + 1) / 2, 0], [6.6, 6.2, 0.6, 0, top + 4, -1.6]] };
  }

  /* ---------------- PROCUREMENT ---------------- */
  function buildProcure(g) {
    var A = ACC.procure, W = 15, H = 5.6, D = 10, fz = D / 2;
    var top = shell(g, W, H, D, A);
    var am = mat(A), wm = mat(P.white);
    // dock platform and doors
    bx(g, 10.6, 1.0, 3.2, mat(P.conc), 1.7, 0.08, fz + 1.6);
    bx(g, 10.8, 0.14, 3.4, mat('#cbd3e0'), 1.7, 1.08, fz + 1.6);
    for (var i = 0; i < 3; i++) {
      rollDoor(g, -0.3 + i * 3.6, 1.15, fz + 0.1, 2.6, 2.9, A);
      bx(g, 0.5, 0.5, 0.3, mat('#222a3a'), -0.3 + i * 3.6 - 1.0, 1.2, fz + 0.4);
      bx(g, 0.5, 0.5, 0.3, mat('#222a3a'), -0.3 + i * 3.6 + 1.0, 1.2, fz + 0.4);
    }
    // canopy
    bx(g, 11.4, 0.28, 3.7, am, 1.7, 4.75, fz + 1.9);
    bx(g, 11.4, 0.1, 3.7, wm, 1.7, 5.03, fz + 1.9);
    [-3.8, 0.0, 3.8, 7.2].forEach(function (x) { post(g, x, 1.1, fz + 3.5, 3.7, mat(P.white)); });
    // office entrance on left
    bx(g, 2.2, 3.1, 0.14, glassDark(), -5.6, 0.55, fz + 0.04);
    bx(g, 0.1, 3.1, 0.2, wm, -5.6, 0.55, fz + 0.08);
    win(g, 1.4, 1.3, -5.6, 3.9 - 0.6, fz + 0.02, 0, true);
    for (var k = -1; k <= 1; k++) win(g, 1.8, 1.2, 1.3 + k * 4, 4.0, -fz - 0.02, 0, true);
    [-1, 1].forEach(function (s) { win(g, 1.6, 1.6, s * (W / 2 + 0.02), 2.6, 0, Math.PI / 2 * s, false); });
    // crates on dock + yard
    crate(g, 5.9, 1.22, fz + 1.1, 1.2); crate(g, 7.2, 1.22, fz + 1.1, 1.2); crate(g, 6.55, 2.44, fz + 1.1, 1.2, 0.2);
    crate(g, 5.4, 1.22, fz + 2.6, 1.0); crate(g, -1.5, 1.22, fz + 2.5, 1.0); crate(g, -0.3, 1.22, fz + 2.5, 1.0);
    pallet(g, -8.8, 1.5, 1.6, 1.6); crate(g, -8.8, 0.26, 1.5, 1.3); crate(g, -8.8, 1.56, 1.5, 1.1, 0.3);
    pallet(g, -8.8, -1.2, 1.6, 1.6); crate(g, -8.8, 0.26, -1.2, 1.3);
    pallet(g, 8.9, 0.2, 1.6, 1.6); crate(g, 8.9, 0.26, 0.2, 1.3);
    // roof AC units + sign cube
    [-4.5, 4.5].forEach(function (x) {
      bx(g, 2.0, 0.9, 1.6, mat('#dfe5ef'), x, top, -1.5);
      cy(g, 0.55, 0.55, 0.08, 14, mat('#9aa6bb'), x, top + 0.9, -1.5);
    });
    // roof "bill" board: stack of invoices in purple
    var bb = new T.Group(); bb.position.set(0.5, top, -0.5); g.add(bb);
    post(bb, -1.6, 0, 0, 1.2); post(bb, 1.6, 0, 0, 1.2);
    bx(bb, 4.6, 2.6, 0.3, wm, 0, 1.2, 0);
    bx(bb, 4.6, 0.4, 0.34, am, 0, 3.8, 0);
    var tex = canvasTex(384, 224, function (c, w, h) {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      c.fillStyle = A; c.font = '800 46px ' + FONT; c.textBaseline = 'middle'; c.fillText('VENDOR BILL', 24, 44);
      c.fillStyle = '#d9d0f7';
      for (var i = 0; i < 3; i++) { c.fillRect(24, 90 + i * 34, 250 - i * 40, 12); c.fillRect(w - 110, 90 + i * 34, 80, 12); }
      c.fillStyle = A; c.fillRect(24, h - 52, 140, 30);
    });
    add(bb, new T.PlaneGeometry(4.3, 2.4), new T.MeshBasicMaterial({ map: tex, toneMapped: false }), 0, 2.5, 0.17, { ns: true });
    // parked purple truck
    var tr = makeFlatbed('#8b5cf6', true); tr.position.set(-6.8, 0, fz + 3.6); tr.rotation.y = Math.PI / 2; g.add(tr);
    return { top: top + 4, beacon: [W / 2 - 0.4, top, fz - 0.8], label: top + 4.6, anchor: [0, top + 5, 0],
      proxies: [[W + 1, top + 1, D + 1, 0, (top + 1) / 2, 0], [12, 1.5, 4, 1.7, 1.4, fz + 1.5]] };
  }

  /* ---------------- WAREHOUSE / INVENTORY ---------------- */
  function buildWarehouse(g) {
    var A = ACC.warehouse, W = 17, H = 5.6, D = 11, fz = D / 2, rise = 2.3;
    bx(g, W + 0.6, 0.25, D + 0.6, mat(P.plinth), 0, 0, 0);
    bx(g, W, H - 0.25, D, mat(P.wall), 0, 0.25, 0);
    bx(g, W + 0.05, 1.1, D + 0.05, mat('#fde7bd'), 0, 0.25, 0);
    bx(g, W + 0.5, 0.3, D + 0.5, mat(A), 0, H, 0);
    // gable roof panels
    var half = W / 2 + 0.6, len = Math.sqrt(half * half + rise * rise), ang = Math.atan2(rise, half);
    [-1, 1].forEach(function (s) {
      bx(g, len, 0.3, D + 1.0, mat('#ffb740'), s * half / 2, H + 0.3 + rise / 2 - 0.1, 0, { rz: -s * ang });
    });
    bx(g, 0.7, 0.25, D + 1.1, mat('#fff4de'), 0, H + 0.3 + rise + 0.0, 0);
    // gable ends
    var ge = new T.Mesh(gableGeo(W, rise, 0.2), mat(P.wall)); ge.position.set(0, H + 0.3, 0); ge.castShadow = true; ge.receiveShadow = true;
    ge.scale.z = 1; g.add(ge);
    // roof skylights
    [-1, 1].forEach(function (s) { for (var k = -1; k <= 1; k++) bx(g, 2.4, 0.12, 1.4, mat('#cfe9ff', { e: '#86c6ff', ei: 0.4 }), s * 4.2, H + 0.3 + rise * 0.45 + 0.05 + 0.1, k * 3.2, { rz: -s * ang }); });
    // roll-up doors
    for (var i = 0; i < 4; i++) rollDoor(g, -6.2 + i * 4.1, 0.25, fz + 0.1, 3.0, 3.6, A);
    // office door side
    [-1, 1].forEach(function (s) { for (var k = -1; k <= 1; k++) win(g, 1.4, 1.2, s * (W / 2 + 0.02), 3.3, k * 3.2, Math.PI / 2 * s, false); });
    // cube emblem on gable
    var cb = new T.Group(); cb.position.set(0, H + 0.9, fz + 0.3); g.add(cb);
    bx(cb, 2.0, 2.0, 0.5, mat('#dca96a'), 0, 0, 0);
    bx(cb, 0.4, 2.02, 0.52, mat('#f2dfb8'), 0, 0, 0);
    bx(cb, 2.02, 0.4, 0.52, mat('#f2dfb8'), 0, 0.8, 0);
    // pallets of boxes in front yard sides
    function stack(x, z, nx, ny, col) {
      pallet(g, x, z, 2.2, 1.7);
      for (var a = 0; a < nx; a++) for (var b = 0; b < ny; b++) box(g, x - 0.6 + a * 1.2 - (nx - 1) * 0.0, 0.26 + b * 0.78, z, 1.0, 0.74, 1.3, 0, col);
    }
    stack(-8.9 - 0.3, fz - 1.0, 2, 3, '#dca96a'); stack(-8.9 - 0.3, fz - 3.6, 2, 2, '#f6b873');
    stack(8.9 + 0.3, fz - 1.0, 2, 3, '#e9b878'); stack(8.9 + 0.3, fz - 3.8, 2, 1, '#dca96a');
    // cubes decor near doors
    box(g, -6.2, 0.1, fz + 1.4, 1.1, 1.0, 1.1, 0.3); box(g, 6.1, 0.1, fz + 1.5, 1.2, 1.1, 1.2, -0.2);
    return { top: H + rise + 1.2, beacon: [W / 2 - 0.2, H + 0.2, fz - 0.6], label: H + rise + 2.8, anchor: [0, H + rise + 3.2, 0],
      proxies: [[W + 1, H + rise + 0.6, D + 1, 0, (H + rise + 0.6) / 2, 0]] };
  }

  /* ---------------- BANK / TREASURY ---------------- */
  function buildBank(g) {
    var A = ACC.bank, W = 13, H = 6.4, D = 9, fz = D / 2;
    var top = shell(g, W, H, D, A, { wall: '#f5f7f4' });
    var wm = mat('#fbfcfa'), am = mat(A);
    // steps (largest at the bottom)
    for (var st = 0; st < 3; st++) bx(g, 9.8 - st * 0.4, 0.2, 3.6 - st * 0.5, mat(P.conc), 0, st * 0.2, fz + 1.9 + st * 0.25 - 0.0);
    // portico columns
    var colMat = mat('#fdfefd');
    for (var c = 0; c < 6; c++) {
      var x = -4.0 + c * 1.6;
      cy(g, 0.42, 0.46, 4.4, 10, colMat, x, 0.8, fz + 2.1);
      bx(g, 1.1, 0.25, 1.1, wm, x, 0.8, fz + 2.1); bx(g, 1.0, 0.25, 1.0, wm, x, 5.1, fz + 2.1);
    }
    bx(g, 9.4, 0.7, 3.4, wm, 0, 5.35, fz + 1.7);
    bx(g, 9.5, 0.14, 3.5, am, 0, 6.05, fz + 1.7);
    bx(g, 9.6, 0.5, 3.6, wm, 0, 0.5, fz + 1.7);
    // pediment
    var pg = new T.Mesh(gableGeo(9.8, 1.9, 3.3), wm); pg.position.set(0, 6.2, fz + 1.7); pg.castShadow = true; pg.receiveShadow = true; g.add(pg);
    var pg2 = new T.Mesh(gableGeo(8.0, 1.4, 3.4), mat('#e7f7ee')); pg2.position.set(0, 6.25, fz + 1.7); g.add(pg2);
    // coin emblem in pediment
    var coin = add(g, new T.CylinderGeometry(0.85, 0.85, 0.2, 20), mat(P.gold, { std: true, r: 0.35, m: 0.1 }), 0, 7.0, fz + 3.5, { rx: Math.PI / 2 });
    add(g, new T.CylinderGeometry(0.55, 0.55, 0.24, 20), mat('#f59e0b', { std: true, r: 0.4 }), 0, 7.0, fz + 3.52, { rx: Math.PI / 2 });
    // doors + windows behind columns
    bx(g, 2.6, 3.4, 0.14, mat('#0e8f66', { std: true, r: 0.4 }), 0, 0.5, fz + 0.03);
    bx(g, 0.1, 3.4, 0.2, wm, 0, 0.5, fz + 0.06);
    [-1, 1].forEach(function (sx) { [1, 2].forEach(function (k) { win(g, 1.2, 2.8, sx * (1.9 + (k - 1) * 1.6 + 0.1), 1.2, fz + 0.02, 0, true); }); });
    [-1, 1].forEach(function (sx) { for (var k = -1; k <= 1; k++) win(g, 1.3, 2.4, sx * (W / 2 + 0.02), 2.2, k * 2.8, Math.PI / 2 * sx, false); });
    // dome
    cy(g, 2.1, 2.2, 0.7, 16, wm, 0, top, -0.5);
    add(g, new T.SphereGeometry(1.9, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#2fcf9a', { std: true, r: 0.35, m: 0.15 }), 0, top + 0.7, -0.5);
    cy(g, 0.12, 0.12, 1.0, 6, wm, 0, top + 2.5, -0.5);
    add(g, new T.SphereGeometry(0.25, 8, 6), mat(P.gold), 0, top + 3.5, -0.5);
    // coin stacks (right yard) + vault bags
    coinStack(g, 7.9, 3.4, 6); coinStack(g, 9.0, 2.4, 9); coinStack(g, 7.7, 1.2, 4); coinStack(g, 9.0, 0.2, 7, 0.85);
    coinStack(g, -7.9, 3.4, 4); coinStack(g, -8.9, 2.3, 8);
    // big floating-ish gold coin sign on roof corner
    var bigc = add(g, new T.CylinderGeometry(1.5, 1.5, 0.3, 24), mat(P.gold, { std: true, r: 0.3, m: 0.2 }), 4.6, top + 1.8, -2.0, { rx: Math.PI / 2 });
    add(g, new T.CylinderGeometry(1.05, 1.05, 0.34, 24), mat('#f59e0b', { std: true, r: 0.4 }), 4.6, top + 1.8, -2.0, { rx: Math.PI / 2 });
    post(g, 4.6, top, -2.0, 0.6);
    // parked armored truck
    var ar = makeArmored(); ar.position.set(-6.4, 0, fz + 4.2); ar.rotation.y = Math.PI / 2 + 0.05; g.add(ar);
    return { top: top + 3.8, beacon: [W / 2 - 0.4, top, fz - 0.8], label: top + 4.6, anchor: [0, top + 5.2, 0],
      proxies: [[W + 1, top + 1, D + 1, 0, (top + 1) / 2, 0], [10, 6.6, 4, 0, 3.4, fz + 1.7], [3.5, 4, 3.5, 0, top + 2, -0.5]] };
  }

  /* ---------------- PAYROLL ---------------- */
  function buildPayroll(g) {
    var A = ACC.payroll, W = 14, H = 7.6, D = 9, fz = D / 2;
    var top = shell(g, W, H, D, A);
    var wm = mat(P.white), am = mat(A);
    // two floors of windows
    for (var f = 0; f < 2; f++) for (var i = -2; i <= 2; i++) {
      if (f === 0 && i === 0) continue;
      win(g, 1.8, 1.7, i * 2.6, 0.95 + f * 3.1, fz + 0.02, 0, f === 1);
    }
    bx(g, 14.2, 0.3, 0.25, wm, 0, 3.0, fz + 0.05);
    // entrance + pink canopy
    bx(g, 2.4, 3.0, 0.14, glassDark(), 0, 0.5, fz + 0.04);
    bx(g, 0.1, 3.0, 0.2, wm, 0, 0.5, fz + 0.08);
    bx(g, 4.2, 0.22, 2.0, am, 0, 3.55, fz + 1.0);
    post(g, -1.9, 0, fz + 1.9, 3.5, wm); post(g, 1.9, 0, fz + 1.9, 3.5, wm);
    [-1, 1].forEach(function (s) { for (var k = -1; k <= 1; k++) for (var f2 = 0; f2 < 2; f2++) win(g, 1.3, 1.5, s * (W / 2 + 0.02), 1.4 + f2 * 3.1, k * 2.8, Math.PI / 2 * s, false); });
    // rooftop parapet + sign
    var par = mat('#fdeaf3');
    bx(g, W + 0.6, 0.5, 0.2, par, 0, top, fz + 0.3); bx(g, W + 0.6, 0.5, 0.2, par, 0, top, -fz - 0.3);
    bx(g, 0.2, 0.5, D + 0.6, par, W / 2 + 0.3, top, 0); bx(g, 0.2, 0.5, D + 0.6, par, -W / 2 - 0.3, top, 0);
    var bb = new T.Group(); bb.position.set(1.2, top, -0.6); g.add(bb);
    post(bb, -1.5, 0, 0, 1.2); post(bb, 1.5, 0, 0, 1.2);
    bx(bb, 4.8, 2.4, 0.3, wm, 0, 1.2, 0);
    bx(bb, 4.8, 0.4, 0.34, am, 0, 3.6, 0);
    var tex = canvasTex(384, 192, function (c, w, h) {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      c.fillStyle = A; c.font = '800 34px ' + FONT; c.textBaseline = 'middle'; c.fillText('PAY STUB', 22, 32);
      c.fillStyle = '#f6c6dc'; c.fillRect(22, 62, 220, 12); c.fillRect(22, 88, 180, 12); c.fillRect(22, 114, 200, 12);
      c.fillStyle = A; rr(c, w - 140, 74, 118, 80, 14); c.fill();
      c.fillStyle = '#fff'; c.font = '800 44px ' + FONT; c.fillText('€', w - 98, 114);
      c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.moveTo(w - 78, 112); c.lineTo(w - 62, 128); c.lineTo(w - 36, 98); c.stroke();
    });
    add(bb, new T.PlaneGeometry(4.5, 2.2), new T.MeshBasicMaterial({ map: tex, toneMapped: false }), 0, 2.4, 0.17, { ns: true });
    // rooftop planters
    [-5, 5].forEach(function (x) { bx(g, 1.6, 0.5, 1.0, wm, x, top + 0.5, 2.5); add(g, new T.IcosahedronGeometry(0.7, 0), mat('#5cc077', { std: true, r: 0.8, flat: true }), x, top + 1.4, 2.5); });
    // flag
    post(g, -6.2, top, fz - 0.6, 3.2, mat('#e9edf5'));
    bx(g, 1.4, 0.8, 0.06, am, -5.5, top + 2.3, fz - 0.6);
    // parking lot east + lines
    bx(g, 5.0, 0.04, 10.6, mat('#d4dbe7'), 10.1, 0.0, 2.6, { nr: false });
    for (var l = 0; l < 3; l++) bx(g, 4.4, 0.02, 0.12, mat('#fff'), 10.1, 0.05, -2.3 + l * 4.4);
    parkedCar(g, 10.3, -0.1, Math.PI / 2 * 2 + 0.0, '#ec4899', 0.85);
    parkedCar(g, 10.1, 4.2, 0, '#e9edf5', 0.85);
    parkedCar(g, -4.6, fz + 2.4, Math.PI / 2, '#fbbf24'); parkedCar(g, 4.8, fz + 2.4, -Math.PI / 2, '#38bdf8');
    return { top: top + 3.6, beacon: [W / 2 - 0.4, top, fz - 0.8], label: top + 4.4, anchor: [0, top + 4.8, 0],
      proxies: [[W + 1, top + 1, D + 1, 0, (top + 1) / 2, 0], [5, 3.6, 0.6, 1.2, top + 2, -0.6]] };
  }

  /* ---------------- LEDGER (central tower) ---------------- */
  function buildLedger(g) {
    var A = ACC.ledger, pW = 14, pD = 12, pH = 3.4;
    var wm = mat(P.white), am = mat(A);
    // podium
    bx(g, pW + 0.6, 0.25, pD + 0.6, mat(P.plinth), 0, 0, 0);
    bx(g, pW, pH - 0.25, pD, mat(P.wall), 0, 0.25, 0);
    bx(g, pW + 1.0, 0.35, pD + 1.0, am, 0, pH, 0);
    bx(g, pW + 0.7, 0.4, pD + 0.7, mat(P.roof), 0, pH + 0.35, 0);
    var pt = pH + 0.75;
    var fz = pD / 2;
    for (var i = -2; i <= 2; i++) bx(g, 2.0, 2.3, 0.14, glassDark(), i * 2.6, 0.55, fz + 0.03);
    for (var j = -3; j <= 3; j++) bx(g, 0.12, 2.4, 0.18, wm, j * 1.9 + 0.0, 0.55, fz + 0.06);
    bx(g, 13.4, 0.26, 0.2, wm, 0, 2.9, fz + 0.04);
    // lobby doors + canopy
    bx(g, 3.6, 0.22, 2.0, am, 0, 3.05, fz + 1.0);
    post(g, -1.6, 0, fz + 1.8, 3.1, wm); post(g, 1.6, 0, fz + 1.8, 3.1, wm);
    // tower
    var tW = 9.0, t0 = pt, t1 = 21.5;
    var tower = glassDark();
    bx(g, tW, t1 - t0, tW, mat('#2f8ee0', { std: true, r: 0.22, m: 0.05, e: '#1a6fc4', ei: 0.5 }), 0, t0, -0.4);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { bx(g, 0.55, t1 - t0, 0.55, wm, c[0] * (tW / 2), t0, c[1] * (tW / 2) - 0.4); });
    for (var m = -3; m <= 3; m++) {
      bx(g, 0.14, t1 - t0, 0.18, wm, m * 1.12, t0, tW / 2 - 0.4 + 0.07);
      bx(g, 0.18, t1 - t0, 0.14, wm, tW / 2 + 0.07, t0, m * 1.12 - 0.4);
    }
    for (var b = 0; b <= 7; b++) bx(g, tW + 0.4, 0.28, tW + 0.4, wm, 0, t0 + b * 2.6 + 1.3, -0.4);
    // upper tiers
    var tW2 = 6.2, t2 = 27.0;
    bx(g, tW + 0.9, 0.5, tW + 0.9, am, 0, t1, -0.4);
    bx(g, tW2, t2 - t1 - 0.5, tW2, mat('#3aa0f0', { std: true, r: 0.22, m: 0.05, e: '#1f7fd6', ei: 0.55 }), 0, t1 + 0.5, -0.4);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { bx(g, 0.45, t2 - t1 - 0.5, 0.45, wm, c[0] * (tW2 / 2), t1 + 0.5, c[1] * (tW2 / 2) - 0.4); });
    for (var b2 = 0; b2 < 3; b2++) bx(g, tW2 + 0.3, 0.24, tW2 + 0.3, wm, 0, t1 + 1.9 + b2 * 1.8, -0.4);
    bx(g, tW2 + 0.8, 0.45, tW2 + 0.8, am, 0, t2, -0.4);
    bx(g, 3.0, 2.2, 3.0, mat('#7cc4ff', { e: '#3fa0f5', ei: 0.6 }), 0, t2 + 0.45, -0.4);
    bx(g, 3.5, 0.3, 3.5, wm, 0, t2 + 2.65, -0.4);
    cy(g, 0.12, 0.18, 3.2, 6, wm, 0, t2 + 2.95, -0.4);
    // glass server wing (west)
    var wx = -9.4, wz = -0.5;
    bx(g, 5.0, 0.2, 6.4, mat(P.plinth), wx, 0, wz);
    bx(g, 5.0, 3.2, 6.4, mat('#a6d5ff', { o: 0.38, std: true, r: 0.1 }), wx, 0.2, wz, { ns: true });
    bx(g, 5.4, 0.35, 6.8, am, wx, 3.4, wz);
    bx(g, 5.2, 0.3, 6.6, mat(P.roof), wx, 3.75, wz);
    var ledA = mat('#34f5a6', { e: '#34f5a6', ei: 1.0 }), ledB = mat('#4cc9ff', { e: '#4cc9ff', ei: 1.0 }), ledC = mat('#ffb340', { e: '#ffb340', ei: 1.0 });
    S.leds = [ledA, ledB, ledC];
    for (var r = 0; r < 3; r++) {
      var rx = wx - 1.4 + r * 1.4;
      bx(g, 1.0, 2.5, 1.1, mat('#2b3550'), rx, 0.25, wz + 1.1);
      bx(g, 1.0, 2.5, 1.1, mat('#2b3550'), rx, 0.25, wz - 1.4);
      for (var u = 0; u < 5; u++) {
        bx(g, 0.84, 0.1, 0.06, mat('#566180'), rx, 0.55 + u * 0.46, wz + 1.67);
        bx(g, 0.1, 0.1, 0.07, u % 2 ? ledA : (u % 3 ? ledB : ledC), rx - 0.3, 0.55 + u * 0.46, wz + 1.69);
        bx(g, 0.1, 0.1, 0.07, (u + r) % 2 ? ledC : ledA, rx - 0.14, 0.55 + u * 0.46, wz + 1.69);
      }
    }
    // rotating emblem
    var em = new T.Group(); em.userData.dyn = true; em.position.set(0, t2 + 7.3, -0.4); g.add(em);
    var core = new T.Mesh(new T.IcosahedronGeometry(1.15, 0), mat(A, { std: true, flat: true, r: 0.3, e: '#22c6ff', ei: 0.9 }));
    core.castShadow = true; em.add(core);
    var ring1 = new T.Mesh(new T.TorusGeometry(2.1, 0.13, 8, 36), mat('#ffffff', { std: true, r: 0.3, e: '#9fe7ff', ei: 0.5 })); em.add(ring1);
    var ring2 = new T.Mesh(new T.TorusGeometry(2.1, 0.13, 8, 36), mat(P.gold, { std: true, r: 0.3, e: '#ffb800', ei: 0.4 })); ring2.rotation.x = Math.PI / 2; em.add(ring2);
    // calm: the emblem stands still (no spin, bob or halo)
    em.rotation.y = 0.6;
    return { top: t2 + 10.2, beacon: [pW / 2 - 0.4, pt, fz - 0.8], label: t2 + 11.6, anchor: [0, 17, fz + 4.5], pitch: 0,
      proxies: [[pW + 1, pt + 0.4, pD + 1, 0, (pt + 0.4) / 2, 0], [tW + 1, t2 - 1, tW + 1, 0, (t2 + 2) / 2 + 0.2, -0.4], [5.4, 3.8, 6.8, wx, 1.9, wz]] };
  }

  /* ---------------- REPORTING & CLOSE ---------------- */
  function buildReporting(g) {
    var A = ACC.reporting, W = 14, H = 6.0, D = 9, fz = D / 2;
    var top = shell(g, W, H, D, A);
    var wm = mat(P.white), am = mat(A);
    // big glass facade
    for (var i = -2; i <= 2; i++) bx(g, 2.2, 3.0, 0.14, glass(), i * 2.55, 0.8, fz + 0.03);
    for (var m = -3; m <= 3; m++) bx(g, 0.14, 3.1, 0.2, wm, m * 1.8 - 0.0, 0.8, fz + 0.06);
    bx(g, 13.2, 0.24, 0.22, wm, 0, 3.75, fz + 0.06);
    bx(g, 2.6, 3.0, 0.16, glassDark(), 0, 0.5, fz + 0.1);
    bx(g, 4.0, 0.2, 1.6, am, 0, 3.55, fz + 0.9);
    [-1, 1].forEach(function (s) { for (var k = -1; k <= 1; k++) win(g, 1.4, 1.8, s * (W / 2 + 0.02), 2.4, k * 2.8, Math.PI / 2 * s, false); });
    for (var q = -2; q <= 2; q++) win(g, 1.6, 1.0, q * 2.9, 4.5, -fz - 0.02, 0, true);
    // billboard bar chart on roof
    var bb = new T.Group(); bb.position.set(0, top, -1.2); g.add(bb);
    post(bb, -4.2, 0, 0, 1.3); post(bb, 4.2, 0, 0, 1.3); post(bb, 0, 0, 0, 1.3);
    bx(bb, 11.4, 5.6, 0.4, wm, 0, 1.3, 0);
    bx(bb, 11.4, 0.45, 0.46, am, 0, 6.9, 0);
    bx(bb, 10.2, 0.1, 0.5, mat('#c9d1e6'), 0, 1.9, 0.02);
    var heights = [0.22, 0.4, 0.34, 0.6, 0.78, 0.94], cols = ['#a5b4fc', '#8b9bf7', '#7a8cf5', '#6a79f0', '#5b67ec', '#4650e0'];
    var bars = [];
    heights.forEach(function (h, k) {
      var gp = new T.Group(); gp.userData.dyn = true; gp.position.set(-4.0 + k * 1.6, 2.0, 0.28); bb.add(gp);
      var mesh = new T.Mesh(boxGeo(1.1, 4.0, 0.5), mat(cols[k])); mesh.position.y = 2.0; mesh.castShadow = true; gp.add(mesh);
      gp.scale.y = h; bars.push({ g: gp, h: h, ph: k * 0.9 });
    });
    // trend arrow
    var tl = new T.Group(); tl.userData.dyn = true; tl.position.set(0, 1.3, 0.3); bb.add(tl);
    // pie chart (roof corner)
    var pieG = new T.Group(); pieG.position.set(-5.2, top + 2.0, 2.4); pieG.rotation.x = 0; g.add(pieG);
    var slices = [[0, 3.4, A], [3.4, 1.7, '#8fa0ff'], [5.1, 1.18, '#fbbf24']];
    slices.forEach(function (s) {
      var geo = new T.CylinderGeometry(1.6, 1.6, 0.4, 20, 1, false, s[0], s[1]); geo.rotateX(Math.PI / 2);
      var m = new T.Mesh(geo, mat(s[2])); m.castShadow = true; pieG.add(m);
    });
    cy(g, 0.12, 0.12, 2.0, 6, mat(P.dark2), -5.2, top, 2.4);
    // data cabinets / folders at front
    paperStack(g, 8.7, 3.0, A, 4); paperStack(g, -8.7, 3.0, A, 5);
    parkedCar(g, -5.0, fz + 2.9, Math.PI / 2, '#f4f6fb', 0.95); parkedCar(g, 5.1, fz + 2.9, -Math.PI / 2, '#6366f1', 0.95);
    return { top: top + 8.0, beacon: [W / 2 - 0.4, top, fz - 0.8], label: top + 9.0, anchor: [0, top + 9.8, 0],
      proxies: [[W + 1, top + 1, D + 1, 0, (top + 1) / 2, 0], [11.6, 6.4, 1.2, 0, top + 4.2, -1.2]] };
  }

  var BUILDERS = { sales: buildSales, procure: buildProcure, warehouse: buildWarehouse, bank: buildBank, payroll: buildPayroll, ledger: buildLedger, reporting: buildReporting };

  /* =====================================================================
   * Vehicles (forward = +z)
   * ===================================================================== */
  var wheelGeos = {};
  function wheelGeo(r) {
    if (wheelGeos[r]) return wheelGeos[r];
    var g = new T.CylinderGeometry(r, r, 0.42, 12); g.rotateZ(Math.PI / 2); return (wheelGeos[r] = g);
  }
  var hubGeos = {};
  function hubGeo(r) {
    if (hubGeos[r]) return hubGeos[r];
    var g = new T.CylinderGeometry(r * 0.5, r * 0.5, 0.46, 10); g.rotateZ(Math.PI / 2); return (hubGeos[r] = g);
  }
  function wheels(g, zs, xw, r) {
    zs.forEach(function (z) {
      [-1, 1].forEach(function (s) {
        add(g, wheelGeo(r), mat(P.tire), s * xw, r, z, { nr: true });
        add(g, hubGeo(r), mat(P.hub), s * xw, r, z, { ns: true, nr: true });
      });
    });
  }
  function lights(g, w, y, zf, zb) {
    [-1, 1].forEach(function (s) {
      bx(g, 0.36, 0.22, 0.08, mat('#fffbe0', { e: '#fff3b0', ei: 0.9 }), s * w, y, zf, { ns: true });
      bx(g, 0.34, 0.2, 0.08, mat('#ff4d4d', { e: '#ff2a2a', ei: 0.6 }), s * w, y, zb, { ns: true });
    });
  }
  function finish(g) { mergeStatic(g); g.traverse(function (o) { if (o.isMesh) o.receiveShadow = false; }); return g; }

  function makeVan(cab, boxc, o) {
    o = o || {};
    var g = new T.Group();
    bx(g, 1.9, 0.5, 4.5, mat(P.dark), 0, 0.3, 0);
    bx(g, 1.9, 1.35, 1.5, mat(cab), 0, 0.7, 1.45);
    bx(g, 1.72, 0.62, 0.07, glassVeh(), 0, 1.22, 2.2);
    [-1, 1].forEach(function (s) { bx(g, 0.07, 0.55, 0.95, glassVeh(), s * 0.95, 1.25, 1.5); });
    bx(g, 2.0, 2.0, 2.8, mat(boxc), 0, 0.75, -0.85);
    bx(g, 1.95, 0.22, 0.2, mat(P.dark2), 0, 0.35, 2.3);
    bx(g, 1.95, 0.22, 0.2, mat(P.dark2), 0, 0.35, -2.3);
    if (o.stripe) bx(g, 2.04, 0.3, 2.84, mat(o.stripe), 0, 1.25, -0.85);
    lights(g, 0.62, 0.75, 2.24, -2.27);
    wheels(g, [1.4, -1.45], 0.98, 0.46);
    if (o.paper) {
      [-1, 1].forEach(function (s) {
        bx(g, 0.05, 1.15, 1.5, mat('#ffffff'), s * 1.02, 1.3, -0.85);
        for (var i = 0; i < 3; i++) bx(g, 0.07, 0.1, 1.0, mat(cab), s * 1.03, 1.55 - i * 0.28, -0.85);
      });
      bx(g, 1.4, 0.2, 1.8, mat('#ffffff'), 0, 2.75, -0.85);
      bx(g, 1.4, 0.07, 1.8, mat(cab), 0, 2.95, -0.85);
      bx(g, 1.42, 0.05, 0.2, mat('#c9d4ee'), 0, 2.97, -0.5);
    }
    return finish(g);
  }
  function makeArmored() {
    var g = new T.Group(), gm = mat(KIND.cash), dm = mat(mixHex(KIND.cash, '#2a3a3a', 0.35));
    bx(g, 1.95, 0.5, 4.7, mat(P.dark), 0, 0.3, 0);
    bx(g, 1.95, 1.3, 1.2, dm, 0, 0.7, 1.75);
    bx(g, 1.75, 0.5, 0.07, glassVeh(), 0, 1.3, 2.36);
    bx(g, 2.05, 2.0, 3.5, gm, 0, 0.75, -0.55);
    bx(g, 2.09, 0.45, 3.52, dm, 0, 0.75, -0.55);
    [-1, 1].forEach(function (s) {
      add(g, cylGeo(0.62, 0.62, 0.08, 16), mat(P.gold, { std: true, r: 0.35 }), s * 1.05, 1.75, -0.6, { rz: Math.PI / 2 });
      bx(g, 0.07, 0.18, 0.7, glassVeh(), s * 1.04, 2.2, 0.7);
    });
    bx(g, 0.6, 0.18, 0.6, mat('#e0c070'), 0, 2.75, 1.5);
    bx(g, 1.95, 0.22, 0.2, mat(P.dark2), 0, 0.35, 2.42);
    lights(g, 0.62, 0.75, 2.38, -2.33);
    wheels(g, [1.6, -1.6], 1.0, 0.5);
    return finish(g);
  }
  function makeFlatbed(cab, loaded) {
    var g = new T.Group();
    bx(g, 1.9, 0.45, 4.8, mat(P.dark), 0, 0.3, 0);
    bx(g, 1.9, 1.4, 1.5, mat(cab), 0, 0.7, 1.6);
    bx(g, 1.72, 0.62, 0.07, glassVeh(), 0, 1.25, 2.36);
    [-1, 1].forEach(function (s) { bx(g, 0.07, 0.55, 0.95, glassVeh(), s * 0.95, 1.28, 1.65); });
    bx(g, 2.0, 0.25, 3.2, mat('#46506b'), 0, 0.75, -1.0);
    [-1, 1].forEach(function (s) { bx(g, 0.08, 0.5, 3.2, mat(cab), s * 1.0, 1.0, -1.0); });
    bx(g, 2.0, 0.5, 0.08, mat(cab), 0, 1.0, -2.6);
    if (loaded !== true) {
      box(g, -0.5, 1.0, -0.2, 0.95, 0.95, 0.95, 0.1); box(g, 0.5, 1.0, -0.2, 0.95, 0.95, 0.95, -0.05);
      box(g, -0.5, 1.0, -1.45, 0.95, 0.95, 0.95, 0.05); box(g, 0.5, 1.0, -1.45, 0.95, 0.95, 0.95, 0);
      box(g, 0.0, 1.95, -0.8, 0.95, 0.9, 0.95, 0.2, '#e8b673');
    } else {
      box(g, -0.5, 1.0, -0.4, 0.95, 0.95, 0.95, 0.1); box(g, 0.5, 1.0, -1.3, 0.95, 0.95, 0.95, -0.05);
    }
    lights(g, 0.62, 0.7, 2.4, -2.62);
    wheels(g, [1.5, -1.6], 0.98, 0.48);
    return finish(g);
  }
  function makeCar(col) {
    var g = new T.Group();
    bx(g, 1.8, 0.55, 3.9, mat(col), 0, 0.35, 0);
    bx(g, 1.74, 0.2, 3.92, mat(P.dark2), 0, 0.35, 0);
    bx(g, 1.62, 0.6, 2.0, glassVeh(), 0, 0.9, -0.15);
    bx(g, 1.7, 0.14, 1.7, mat(col), 0, 1.5, -0.15);
    bx(g, 1.4, 0.07, 0.07, mat(col), 0, 1.0, 0.88);
    lights(g, 0.58, 0.62, 1.96, -1.96);
    wheels(g, [1.25, -1.25], 0.9, 0.4);
    return finish(g);
  }
  function makeForklift() {
    var g = new T.Group(), ym = mat('#f59e0b'), dk = mat(P.dark);
    bx(g, 1.5, 0.8, 2.0, ym, 0, 0.3, -0.2);
    bx(g, 1.5, 0.4, 0.8, dk, 0, 0.3, -1.1);
    [-1, 1].forEach(function (s) {
      bx(g, 0.1, 1.4, 0.1, dk, s * 0.65, 1.1, -0.1); bx(g, 0.1, 1.4, 0.1, dk, s * 0.65, 1.1, -0.9);
      bx(g, 0.12, 2.6, 0.14, mat('#8995ad'), s * 0.45, 0.2, 1.1);
    });
    bx(g, 1.4, 0.1, 1.0, dk, 0, 2.5, -0.5);
    bx(g, 0.9, 0.12, 0.7, mat('#4b5878'), 0, 1.1, -0.5);
    [-1, 1].forEach(function (s) { bx(g, 0.16, 0.1, 1.6, mat('#a2adc2'), s * 0.4, 0.2, 2.0); });
    bx(g, 1.3, 0.1, 1.2, mat('#c89a5a'), 0, 0.35, 2.0);
    box(g, 0, 0.45, 2.0, 1.0, 0.9, 1.0, 0);
    wheels(g, [0.5, -0.9], 0.7, 0.35);
    return finish(g);
  }
  function makeDrone(hex) {
    var g = new T.Group();
    var card = mat('#fbfbf9');
    var inner = g.userData.inner = new T.Group(); g.add(inner);
    bx(inner, 2.2, 0.14, 1.6, card, 0, 0, 0, { ns: true });
    bx(inner, 2.3, 0.1, 0.14, mat('#ffffff'), 0, 0.05, 0.75, { ns: true });
    for (var i = 0; i < 3; i++) bx(inner, 1.4 - i * 0.2, 0.05, 0.1, mat(hex), -0.15, 0.13, -0.35 + i * 0.3, { ns: true });
    bx(inner, 0.35, 0.05, 0.35, mat(hex), 0.65, 0.13, -0.3, { ns: true });
    var rotors = [];
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
      bx(inner, 0.5, 0.06, 0.1, mat('#445070'), c[0] * 0.8, 0.05, c[1] * 0.58, { ns: true, ry: Math.atan2(c[0], c[1]) });
      var r = new T.Mesh(cylGeo(0.5, 0.5, 0.03, 12), mat('#ffffff', { o: 0.5 })); r.position.set(c[0] * 1.05, 0.18, c[1] * 0.78); inner.add(r); rotors.push(r);
    });
    g.userData.rotors = rotors; g.userData.dyn = true;
    return g;
  }

  /* =====================================================================
   * Paths & routing
   * ===================================================================== */
  function buildGraph() {
    Object.keys(NODEDEF).forEach(function (k) { S.nodes[k] = new T.Vector3(NODEDEF[k][0], 0, NODEDEF[k][1]); S.adj[k] = []; });
    CHAINS.forEach(function (ch) {
      for (var i = 0; i < ch.length - 1; i++) {
        var a = ch[i], b = ch[i + 1], d = S.nodes[a].distanceTo(S.nodes[b]);
        S.adj[a].push({ to: b, w: d }); S.adj[b].push({ to: a, w: d });
      }
    });
  }
  function route(a, b) {
    if (!S.nodes[a] || !S.nodes[b]) return null;
    var dist = {}, prev = {}, done = {}, k;
    for (k in S.nodes) dist[k] = Infinity;
    dist[a] = 0;
    for (;;) {
      var u = null, best = Infinity;
      for (k in dist) if (!done[k] && dist[k] < best) { best = dist[k]; u = k; }
      if (u === null) return null;
      if (u === b) break;
      done[u] = true;
      S.adj[u].forEach(function (e) { if (dist[u] + e.w < dist[e.to]) { dist[e.to] = dist[u] + e.w; prev[e.to] = u; } });
    }
    var path = [b], c = b;
    while (c !== a) { c = prev[c]; path.unshift(c); }
    return path;
  }
  function smoothPath(pts, r, closed) {
    var n = pts.length, out = [], i;
    function arc(A, Pt, B) {
      var ab = Pt.clone().sub(A), pb = B.clone().sub(Pt), la = ab.length(), lb = pb.length();
      var rr_ = Math.min(r, la * 0.45, lb * 0.45);
      var E = Pt.clone().sub(ab.normalize().multiplyScalar(rr_)), X = Pt.clone().add(pb.normalize().multiplyScalar(rr_));
      for (var k = 0; k <= 6; k++) {
        var t = k / 6, a1 = 1 - t;
        out.push(new T.Vector3(a1 * a1 * E.x + 2 * a1 * t * Pt.x + t * t * X.x, 0, a1 * a1 * E.z + 2 * a1 * t * Pt.z + t * t * X.z));
      }
    }
    if (closed) { for (i = 0; i < n; i++) arc(pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n]); out.push(out[0].clone()); }
    else {
      out.push(pts[0].clone());
      for (i = 1; i < n - 1; i++) arc(pts[i - 1], pts[i], pts[i + 1]);
      out.push(pts[n - 1].clone());
    }
    // drop zero-length duplicates
    var res = [out[0]];
    for (i = 1; i < out.length; i++) if (out[i].distanceTo(res[res.length - 1]) > 0.01) res.push(out[i]);
    return res;
  }
  function offsetPath(pts, off) {
    if (!off) return pts;
    return pts.map(function (p, i) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      var dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      return new T.Vector3(p.x + (-dz) * off, p.y, p.z + dx * off);
    });
  }
  function makePath(pts) {
    var cum = [0], i;
    for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    return { pts: pts, cum: cum, L: cum[cum.length - 1] };
  }
  var _tmpA = new T.Vector3();
  function sampleAt(path, s, pos, dir) {
    var cum = path.cum, pts = path.pts, lo = 0, hi = cum.length - 1;
    s = clamp(s, 0, path.L);
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    var seg = cum[hi] - cum[lo] || 1, t = (s - cum[lo]) / seg;
    pos.lerpVectors(pts[lo], pts[hi], t);
    if (dir) dir.subVectors(pts[hi], pts[lo]).normalize();
  }

  /* =====================================================================
   * Scene build
   * ===================================================================== */
  function inst(geo, material, n, shadow) {
    var m = new T.InstancedMesh(geo, material, n);
    m.castShadow = shadow !== false; m.receiveShadow = true; m.frustumCulled = false; return m;
  }
  var _m4 = new T.Matrix4(), _q = new T.Quaternion(), _s = new T.Vector3(), _p = new T.Vector3(), _e = new T.Euler();
  function compose(x, y, z, ry, sx, sy, sz) {
    _q.setFromEuler(_e.set(0, ry || 0, 0)); _p.set(x, y, z); _s.set(sx || 1, sy || sx || 1, sz || sx || 1);
    return _m4.compose(_p, _q, _s);
  }
  function distToSeg(px, pz, r) {
    var x1 = r[0], z1 = r[1], x2 = r[2], z2 = r[3];
    var dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz, t = l2 ? clamp(((px - x1) * dx + (pz - z1) * dz) / l2, 0, 1) : 0;
    return Math.hypot(px - (x1 + dx * t), pz - (z1 + dz * t));
  }
  function nearRoad(x, z, d) {
    for (var i = 0; i < ROADS.length; i++) if (distToSeg(x, z, ROADS[i]) < d) return true;
    return false;
  }
  function inPads(x, z, m) {
    for (var k in DEF) { var p = DEF[k].pad; if (x > p[0] - m && x < p[1] + m && z > p[2] - m && z < p[3] + m) return true; }
    return false;
  }

  function buildGround(scene) {
    var cx = (SLAB.x0 + SLAB.x1) / 2, cz = (SLAB.z0 + SLAB.z1) / 2, sw = SLAB.x1 - SLAB.x0, sd = SLAB.z1 - SLAB.z0;
    // soft contact shadow under the slab
    var sTex = canvasTex(128, 128, function (c) {
      var g = c.createRadialGradient(64, 64, 20, 64, 64, 64);
      g.addColorStop(0, 'rgba(70,70,76,.22)'); g.addColorStop(1, 'rgba(70,70,76,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    });
    var sh = new T.Mesh(new T.PlaneGeometry(sw * 1.35, sd * 1.5), new T.MeshBasicMaterial({ map: sTex, transparent: true, depthWrite: false, toneMapped: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.set(cx, -3.6, cz + 3); scene.add(sh);
    // slab
    var slab = new T.Mesh(boxGeo(sw, 3, sd), mat('#c9c5bd')); slab.position.set(cx, -1.5 - 0.0, cz); slab.receiveShadow = true; scene.add(slab);
    var top = new T.Mesh(boxGeo(sw - 0.8, 0.12, sd - 0.8), mat('#e5e1d9')); top.position.set(cx, -0.06 + 0.0, cz); top.receiveShadow = true; scene.add(top);
    slab.position.y = -1.56;
    // lawns (outside the loop)
    var lawn = mat('#c6e0b4');
    function lawnRect(x0, x1, z0, z1) {
      var m = new T.Mesh(boxGeo(x1 - x0, 0.06, z1 - z0), lawn); m.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m);
    }
    lawnRect(-64, 64, -46, -41); lawnRect(-64, 64, 43, 48);
    lawnRect(-64, -47, -44.5, AZ - 3.2); lawnRect(-64, -47, AZ + 3.2, 41.5);
    lawnRect(47, 64, -44.5, AZ - 3.2); lawnRect(47, 64, AZ + 3.2, 41.5);
    // central strips lawn patches between zones
    lawnRect(-11.6, 11.6, 15.6, 18.6); lawnRect(-11.6, 11.6, -7.2, -3.4);
  }

  function buildRoads(scene) {
    var roadM = mat('#6d6e73'), roadM2 = mat('#66676c');
    var grp = new T.Group();
    var curb = mat('#ecebe6');
    ROADS.forEach(function (r) {
      var horiz = r[1] === r[3];
      var x0 = Math.min(r[0], r[2]), x1 = Math.max(r[0], r[2]), z0 = Math.min(r[1], r[3]), z1 = Math.max(r[1], r[3]);
      var ext = RW / 2;
      var gateEnd = (r[4] === 'main' && horiz && r[1] === AZ);
      var ax0 = horiz ? (gateEnd ? x0 : x0 - ext) : x0 - RW / 2, ax1 = horiz ? (gateEnd ? x1 : x1 + ext) : x1 + RW / 2;
      var az0 = horiz ? z0 - RW / 2 : z0 - ext, az1 = horiz ? z1 + RW / 2 : z1 + ext;
      if (r[4] === 'drive') { if (horiz) { ax0 = x0; ax1 = x1; } else { az0 = z0; az1 = z1; } }
      var m = new T.Mesh(boxGeo(ax1 - ax0, ROAD_Y, az1 - az0), r[4] === 'drive' ? roadM2 : roadM);
      m.position.set((ax0 + ax1) / 2, ROAD_Y / 2, (az0 + az1) / 2); m.receiveShadow = true; grp.add(m);
      // light curb lines on main roads
      if (r[4] === 'main') {
        [-1, 1].forEach(function (s) {
          if (horiz) { var c = new T.Mesh(boxGeo(ax1 - ax0, 0.02, 0.16), curb); c.position.set((ax0 + ax1) / 2, ROAD_Y + 0.01, r[1] + s * (RW / 2 - 0.18)); grp.add(c); }
          else { var c2 = new T.Mesh(boxGeo(0.16, 0.02, az1 - az0), curb); c2.position.set(r[0] + s * (RW / 2 - 0.18), ROAD_Y + 0.01, (az0 + az1) / 2); grp.add(c2); }
        });
      }
    });
    scene.add(grp);
    // lane dashes
    var dashes = [];
    ROADS.forEach(function (r) {
      if (r[4] !== 'main') return;
      var horiz = r[1] === r[3], a = horiz ? Math.min(r[0], r[2]) : Math.min(r[1], r[3]), b = horiz ? Math.max(r[0], r[2]) : Math.max(r[1], r[3]);
      var step = 3.4;
      for (var s = a + 1.7; s < b - 1; s += step) {
        var x = horiz ? s : r[0], z = horiz ? r[1] : s;
        var skip = false;
        for (var k = 0; k < ROADS.length; k++) {
          var q = ROADS[k]; if (q === r) continue;
          var qh = q[1] === q[3];
          if (qh === horiz) continue;
          // distance along this road to the crossing / end of perpendicular road
          if (distToSeg(x, z, q) < RW / 2 + 1.0) { skip = true; break; }
        }
        if (!skip) dashes.push([x, z, horiz ? 0 : Math.PI / 2]);
      }
    });
    var dm = inst(boxGeo(1.7, 0.02, 0.24), mat('#f8f6ee'), dashes.length, false);
    dashes.forEach(function (d, i) { dm.setMatrixAt(i, compose(d[0], ROAD_Y + 0.012, d[1], d[2])); });
    scene.add(dm);
    // crosswalks
    var zs = [];
    function zebra(cx, cz, alongZ) {
      for (var i = -3; i <= 3; i++) { var o = i * 0.56; zs.push(alongZ ? [cx + o, cz, Math.PI / 2] : [cx, cz + o, 0]); }
    }
    zebra(-VX, -3, true); zebra(VX, -3, true); zebra(-VX, 26, true); zebra(VX, 26, true);
    zebra(-LX, 6, true); zebra(LX, 6, true);
    zebra(-50, AZ, false); zebra(50, AZ, false);
    // horizontal-stripe crosswalks on avenues (stripes run along road direction)
    var zm = inst(boxGeo(2.2, 0.02, 0.4), mat('#f8f6ee'), zs.length, false);
    zs.forEach(function (d, i) { zm.setMatrixAt(i, compose(d[0], ROAD_Y + 0.012, d[1], d[2])); });
    scene.add(zm);
  }

  function buildPads(scene) {
    for (var k in DEF) {
      var p = DEF[k].pad, col = mixHex(ACC[k], '#ffffff', 0.76);
      var m = new T.Mesh(boxGeo(p[1] - p[0], PAD_Y, p[3] - p[2]), mat(col));
      m.position.set((p[0] + p[1]) / 2, PAD_Y / 2, (p[2] + p[3]) / 2); m.receiveShadow = true; scene.add(m);
      var inner = new T.Mesh(boxGeo(p[1] - p[0] - 1.2, 0.02, p[3] - p[2] - 1.2), mat(mixHex(ACC[k], '#ffffff', 0.86)));
      inner.position.set((p[0] + p[1]) / 2, PAD_Y + 0.01, (p[2] + p[3]) / 2); inner.receiveShadow = true; scene.add(inner);
      DEF[k].padMesh = m;
    }
  }

  function buildDecor(scene) {
    var rand = rng(7), pts = [], tries = 0;
    function okTree(x, z) {
      if (x < SLAB.x0 + 3 || x > SLAB.x1 - 3 || z < SLAB.z0 + 3 || z > SLAB.z1 - 3) return false;
      if (nearRoad(x, z, 4.2) || inPads(x, z, 2.2)) return false;
      if (Math.abs(z - AZ) < 9 && Math.abs(x) > 50) return false;
      if (Math.abs(x) < 11.5 && z > -7.5 && z < 18.5 && !(z > 15.6)) return false; // payroll plaza
      for (var i = 0; i < pts.length; i++) if (Math.hypot(pts[i][0] - x, pts[i][1] - z) < 4.3) return false;
      return true;
    }
    while (pts.length < 70 && tries++ < 2500) {
      var x = lerp(SLAB.x0 + 3, SLAB.x1 - 3, rand()), z = lerp(SLAB.z0 + 3, SLAB.z1 - 3, rand());
      if (okTree(x, z)) pts.push([x, z, rand(), rand() > 0.42]);
    }
    var greens = ['#5cc17a', '#4fb36a', '#7dd08c', '#3fa763', '#6fcf8f'].map(function (h) { return muteHex(h, 0.15); });
    var trunkM = mat('#b98b5e', { std: true, r: 0.9 }), leafM = mat('#ffffff', { std: true, r: 0.85, flat: true });
    var trunkG = new T.CylinderGeometry(0.22, 0.3, 1.5, 6); trunkG.translate(0, 0.75, 0);
    var pineG1 = new T.ConeGeometry(1.7, 2.8, 7); pineG1.translate(0, 2.4, 0);
    var pineG2 = new T.ConeGeometry(1.2, 2.2, 7); pineG2.translate(0, 3.8, 0);
    var roundG = new T.IcosahedronGeometry(1.75, 0); roundG.translate(0, 3.0, 0);
    var pines = pts.filter(function (p) { return p[3]; }), rounds = pts.filter(function (p) { return !p[3]; });
    var tr = inst(trunkG, trunkM, pts.length), p1 = inst(pineG1, leafM, pines.length), p2 = inst(pineG2, leafM, pines.length), rd = inst(roundG, leafM, rounds.length);
    pts.forEach(function (p, i) { tr.setMatrixAt(i, compose(p[0], 0, p[1], p[2] * 6, 0.8 + p[2] * 0.4)); });
    pines.forEach(function (p, i) { var s = 0.85 + p[2] * 0.5; p1.setMatrixAt(i, compose(p[0], 0, p[1], p[2] * 6, s)); p2.setMatrixAt(i, compose(p[0], 0, p[1], p[2] * 6, s)); p1.setColorAt(i, C(greens[(i * 3) % greens.length])); p2.setColorAt(i, C(greens[(i * 3) % greens.length])); });
    rounds.forEach(function (p, i) { rd.setMatrixAt(i, compose(p[0], 0, p[1], p[2] * 6, 0.8 + p[2] * 0.45, 0.8 + p[2] * 0.4, 0.8 + p[2] * 0.45)); rd.setColorAt(i, C(greens[(i * 2 + 1) % greens.length])); });
    [tr, p1, p2, rd].forEach(function (m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; scene.add(m); });
    // trees along the plaza strips (manual, little ones)
    var extra = [[-9, 17], [9, 17], [-9, -5.2], [9, -5.2], [-12, 17.2], [12, 17.2]];
    // bushes
    var bpts = [], bt = 0;
    while (bpts.length < 46 && bt++ < 800) {
      var bx_ = lerp(SLAB.x0 + 4, SLAB.x1 - 4, rand()), bz_ = lerp(SLAB.z0 + 4, SLAB.z1 - 4, rand());
      if (nearRoad(bx_, bz_, 3.6) || inPads(bx_, bz_, 0.6)) continue;
      if (Math.abs(bz_ - AZ) < 8 && Math.abs(bx_) > 50) continue;
      bpts.push([bx_, bz_, rand()]);
    }
    extra.forEach(function (e) { bpts.push([e[0], e[1], 0.5]); });
    var bushG = new T.IcosahedronGeometry(0.9, 0); bushG.translate(0, 0.6, 0);
    var bush = inst(bushG, leafM, bpts.length);
    bpts.forEach(function (p, i) { bush.setMatrixAt(i, compose(p[0], 0, p[1], p[2] * 6, 0.7 + p[2] * 0.7, 0.6 + p[2] * 0.4, 0.7 + p[2] * 0.7)); bush.setColorAt(i, C(greens[(i + 2) % greens.length])); });
    bush.instanceMatrix.needsUpdate = true; bush.instanceColor.needsUpdate = true; scene.add(bush);

    // street lamps
    var lamps = [];
    ROADS.forEach(function (r) {
      if (r[4] !== 'main') return;
      var horiz = r[1] === r[3], a = horiz ? Math.min(r[0], r[2]) : Math.min(r[1], r[3]), b = horiz ? Math.max(r[0], r[2]) : Math.max(r[1], r[3]);
      for (var s = a + 8; s < b - 4; s += 16) {
        var side = lamps.length % 2 ? 1 : -1;
        var x = horiz ? s : r[0] + side * 3.0, z = horiz ? r[1] + side * 3.0 : s;
        if (inPads(x, z, -0.2)) continue;
        // keep clear of other roads
        var clash = false; for (var k = 0; k < ROADS.length; k++) if (ROADS[k] !== r && distToSeg(x, z, ROADS[k]) < RW / 2 + 0.6) { clash = true; break; }
        if (!clash) lamps.push([x, z, horiz]);
      }
    });
    var poleG = new T.CylinderGeometry(0.1, 0.14, 3.6, 6); poleG.translate(0, 1.8, 0);
    var headG = new T.SphereGeometry(0.34, 8, 6); headG.translate(0, 3.7, 0);
    var armG = new T.BoxGeometry(0.9, 0.1, 0.1); armG.translate(0.35, 3.55, 0);
    var pm = inst(poleG, mat('#9aa6bb'), lamps.length), hm = inst(headG, basic('#e9e2c8'), lamps.length, false), am2 = inst(armG, mat('#9aa6bb'), lamps.length, false);
    lamps.forEach(function (l, i) { var m = compose(l[0], 0, l[1], 0); pm.setMatrixAt(i, m); hm.setMatrixAt(i, m); am2.setMatrixAt(i, m); });
    [pm, hm, am2].forEach(function (m) { m.instanceMatrix.needsUpdate = true; scene.add(m); });
    // benches + planter ring in the plaza between payroll and ledger
    var bench = new T.Group();
    bx(bench, 2.0, 0.12, 0.6, mat('#c89a5a'), 0, 0.5, 0); bx(bench, 2.0, 0.5, 0.1, mat('#c89a5a'), 0, 0.6, -0.3);
    bx(bench, 0.12, 0.5, 0.5, mat(P.dark2), -0.8, 0, 0); bx(bench, 0.12, 0.5, 0.5, mat(P.dark2), 0.8, 0, 0);
    [[-8.5, 17.3, 0], [8.5, 17.3, 0]].forEach(function (b) { var c = bench.clone(); c.position.set(b[0], 0.06, b[1]); c.rotation.y = Math.PI; scene.add(c); });
    // fountain in the plaza lawn
    var fnt = new T.Group(); fnt.position.set(0, 0.06, 17.1); scene.add(fnt);
    cy(fnt, 1.6, 1.8, 0.45, 20, mat('#e4e4e1'), 0, 0, 0);
    cy(fnt, 1.35, 1.35, 0.1, 20, mat('#9cc3dc', { std: true, r: 0.2, e: '#6fa0c4', ei: 0.3 }), 0, 0.42, 0);
    cy(fnt, 0.25, 0.3, 1.0, 8, mat('#e8eef8'), 0, 0.4, 0);
    cy(fnt, 0.7, 0.5, 0.2, 14, mat('#e8eef8'), 0, 1.3, 0);
  }

  function buildGate(scene, id, x) {
    var A = ACC[id];
    var g = new T.Group(); g.position.set(x, ROAD_Y, AZ); scene.add(g);
    var wm = mat(P.white), am = mat(A);
    [-1, 1].forEach(function (s) {
      bx(g, 1.1, 8.2, 1.1, wm, 0, 0, s * 4.7); bx(g, 1.3, 0.6, 1.3, am, 0, 0, s * 4.7); bx(g, 1.3, 0.35, 1.3, am, 0, 7.9, s * 4.7);
    });
    bx(g, 1.3, 2.0, 11.2, am, 0, 6.4, 0);
    bx(g, 1.5, 0.3, 11.4, wm, 0, 8.4, 0);
    var tex = canvasTex(640, 160, function () { /* drawn by drawSign below */ });
    function drawSign(txt) {
      var cv = tex.image, c = cv.getContext('2d'), w = cv.width, h = cv.height;
      txt = String(txt || '').toUpperCase();
      c.clearRect(0, 0, w, h);
      c.fillStyle = A; c.fillRect(0, 0, w, h);
      var fs = 78, maxW = w - 80;
      c.font = '800 ' + fs + 'px ' + FONT;
      var tw = c.measureText(txt).width;
      if (tw > maxW) { fs = Math.max(30, Math.floor(fs * maxW / tw)); c.font = '800 ' + fs + 'px ' + FONT; }
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, w / 2 + 6, h / 2 + 4);
      tex.needsUpdate = true;
    }
    drawSign(LABELS[id]);
    var sm = new T.MeshBasicMaterial({ map: tex, toneMapped: false });
    [-1, 1].forEach(function (s) {
      var p = new T.Mesh(new T.PlaneGeometry(10.8, 1.9), sm); p.position.set(s * 0.68, 6.4, 0); p.rotation.y = s * Math.PI / 2; g.add(p);
    });
    // free-standing sign board facing the camera
    var bd = new T.Group(); bd.position.set(0, 0, -9.2); g.add(bd);
    post(bd, -3.2, 0, 0, 3.0, mat(P.dark2)); post(bd, 3.2, 0, 0, 3.0, mat(P.dark2));
    bx(bd, 8.4, 2.6, 0.3, wm, 0, 2.6, 0);
    var sp = new T.Mesh(new T.PlaneGeometry(8.0, 2.2), sm); sp.position.set(0, 3.9, 0.17); bd.add(sp);
    // booth and cones
    bx(g, 2.6, 3.0, 2.4, wm, 0, 0, 6.6); bx(g, 3.0, 0.35, 2.8, am, 0, 3.0, 6.6); bx(g, 2.62, 1.0, 1.4, glass(), 0, 1.2, 6.6);
    var cone = new T.ConeGeometry(0.4, 1.0, 8); cone.translate(0, 0.5, 0);
    [[-2.5, 3.0], [-2.5, -3.0], [2.4, 3.0], [2.4, -3.0]].forEach(function (c) {
      var m = add(g, cone, mat('#ff8a3d'), c[0], 0, c[1], { ns: true }); m.position.y = 0;
    });
    mergeStatic(g);
    // map data
    var b = { id: id, group: g, endpoint: true, drawSign: drawSign, label: null, badge: null, top: 9.2, accent: A, center: new T.Vector3(x, 0, AZ), radius: 8, anchor: new T.Vector3(x, 8, AZ) };
    S.endpoints[id] = b;
    // name pill
    var nm = pillSprite(LABELS[id], { dot: A, fs: 24 }, 1.8); nm.position.set(0, 10.6, 0); g.add(nm); b.label = nm;
    // beacon dot for endpoints not needed
    b.badgeY = 12.8;
  }

  function buildBuildings(scene) {
    IDS.forEach(function (id) {
      var d = DEF[id], g = new T.Group();
      g.position.set(d.pos[0], PAD_Y, d.pos[1]); scene.add(g);
      var info = BUILDERS[id](g);
      // proxies (invisible raycast volumes)
      var proxies = [];
      info.proxies.forEach(function (p) {
        var m = new T.Mesh(boxGeo(p[0], p[1], p[2]), new T.MeshBasicMaterial({ visible: false }));
        m.position.set(p[3], p[4], p[5]); m.userData.proxy = true; m.userData.bid = id; g.add(m);
        proxies.push(m); S.pickables.push(m);
      });
      mergeStatic(g);
      var meshes = [];
      g.traverse(function (o) { if (o.isMesh && !o.userData.proxy) { o.userData.baseMat = o.material; meshes.push(o); } });
      var acc = ACC[id];
      // pad outline
      var pad = d.pad, pw = pad[1] - pad[0], pd = pad[3] - pad[2];
      var otex = canvasTex(256, Math.max(128, Math.round(256 * pd / pw)), function (c, w, h) {
        c.clearRect(0, 0, w, h);
        c.strokeStyle = acc; c.lineWidth = 6; rr(c, 14, 14, w - 28, h - 28, 26); c.stroke();
      });
      var om = new T.MeshBasicMaterial({ map: otex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      var outline = new T.Mesh(new T.PlaneGeometry(pw, pd), om);
      outline.rotation.x = -Math.PI / 2; outline.position.set((pad[0] + pad[1]) / 2, PAD_Y + 0.05, (pad[2] + pad[3]) / 2); scene.add(outline);
      // labels
      var name = pillSprite(LABELS[id], { dot: acc, fs: 24 }, 1.9); name.position.set(0, info.label, 0); g.add(name);
      // beacon
      var bc = new T.Group(); bc.position.set(info.beacon[0], info.beacon[1], info.beacon[2]); g.add(bc);
      var pole = new T.Mesh(cylGeo(0.08, 0.1, 1.1, 6), mat(P.dark2)); pole.position.y = 0.55; bc.add(pole);
      var bulb = new T.Mesh(new T.SphereGeometry(0.32, 12, 8), new T.MeshBasicMaterial({ color: C(STATUS_COL.ok), toneMapped: false })); bulb.position.y = 1.35; bc.add(bulb);
      var halo = { material: { color: new T.Color(), opacity: 0 }, scale: { set: function () {} } }; // legacy handle, no visible halo
      var b = {
        id: id, group: g, meshes: meshes, proxies: proxies, outline: outline, label: name, badge: null, accent: acc,
        top: info.top, center: new T.Vector3(d.pos[0], 0, d.pos[1]), radius: Math.max(d.size[0], d.size[1]) / 2 + 2,
        anchor: new T.Vector3(d.pos[0] + info.anchor[0], PAD_Y + info.anchor[1], d.pos[1] + info.anchor[2]),
        badgeY: info.label + 2.2, status: 'ok', bulb: bulb, halo: halo, hover: 0, sel: 0, flash: 0, hiOn: false
      };
      S.buildings[id] = b;
    });
  }

  /* ---------- ambient life ---------- */
  function addAmbient(scene) {
    function vehicleOnLoop(model, ids, rev, speed, off, startS, delay, period) {
      var pts = ids.map(function (id) { return S.nodes[id].clone(); });
      if (rev) pts.reverse();
      var path = makePath(offsetPath(smoothPath(pts, 4.2, true), off));
      var v = { group: model, path: path, s: startS * path.L, speed: speed, yaw: 0, pos: new T.Vector3(), dir: new T.Vector3(), delay: delay || 0, age: 0, period: period || 40, ph: startS * 9 };
      model.position.y = ROAD_Y; if (v.delay > 0) model.visible = false; scene.add(model); S.ambient.push(v);
    }
    // v2: ~55% of v1 speed, staggered start and slow speed waves so different parts of the map move at different times
    // calm: a few slow background vehicles, constant speed
    var vm = function (h) { return muteHex(h, 0.12); };
    vehicleOnLoop(makeVan('#ffffff', '#f4f6fa', { stripe: vm('#2f6bff') }), ['NW', 'NE', 'CE', 'CW'], false, 2.9, 1.0, 0.1, 0.5, 46);
    vehicleOnLoop(makeCar(vm('#fbbf24')), ['NW', 'NE', 'CE', 'CW'], true, 3.2, 1.0, 0.55, 5.5, 37);
    vehicleOnLoop(makeFlatbed(vm('#3b82f6'), false), ['AP', 'AQ', 'CQ', 'CP'], false, 2.6, 1.0, 0.3, 11, 53);
    vehicleOnLoop(makeVan(vm('#34d399'), '#f4f6fb', { stripe: vm('#10b981') }), ['AP', 'AQ', 'CQ', 'CP'], true, 2.8, 1.0, 0.8, 17, 43);
  }

  function updateAmbient(dt) {
    S.ambient.forEach(function (v) {
      if (v.delay > 0) {
        v.delay -= dt;
        if (v.delay > 0) return;
        v.group.visible = true;
      }
      v.age += dt;
      v.s = (v.s + v.speed * dt) % v.path.L;
      sampleAt(v.path, v.s, v.pos, null);
      sampleAt(v.path, (v.s + 0.8) % v.path.L, _tmpA, null);
      var dx = _tmpA.x - v.pos.x, dz = _tmpA.z - v.pos.z;
      if (dx || dz) { var ty = Math.atan2(dx, dz), d = ty - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.yaw += d * Math.min(1, dt * 10); }
      v.group.position.x = v.pos.x; v.group.position.z = v.pos.z; v.group.rotation.y = v.yaw;
    });
  }

  /* =====================================================================
   * Flow engine
   * ===================================================================== */
  function endpointInfo(id) {
    return S.buildings[id] || S.endpoints[id] || null;
  }
  function makeFlowVehicle(kind) {
    switch (kind) {
      case 'invoice': return makeVan(KIND.invoice, '#f1f2f5', { paper: true });
      case 'bill': return makeVan(KIND.bill, '#f2f0f5', { paper: true });
      case 'cash': return makeArmored();
      case 'goods': return makeFlatbed(KIND.goods);
      case 'payroll': return makeCar(KIND.payroll);
      default: return makeVan('#7c8799', '#e2e5ea');
    }
  }
  var LOOK = 4.0;
  function runRoad(h, opts, done) {
    var a = NODE_OF[h.from], b = NODE_OF[h.to], ids = route(a, b);
    if (!ids || ids.length < 2) { done(); return; }
    var pts = ids.map(function (id) { return S.nodes[id].clone(); });
    var path = makePath(offsetPath(smoothPath(pts, 3.4, false), 1.0));
    var kind = h.kind || 'invoice', model = makeFlowVehicle(kind);
    var group = new T.Group(); group.add(model); group.position.y = ROAD_Y; group.scale.setScalar(0.001);
    var col = KIND[kind] || '#2f6bff';
    var lbl = null;
    if (h.label) { lbl = pillSprite(String(h.label), { dot: col, fs: 24 }, 1.7); lbl.position.set(0, 4.8, 0); group.add(lbl); }
    S.scene.add(group);
    var v = { group: group, label: lbl, path: path, s: 0, t: 0, state: 'in', speed: 5.7 * ((opts && opts.speed) || 1), yaw: 0, pos: new T.Vector3(), kind: kind, done: done, to: h.to };
    sampleAt(path, 0, v.pos, null); sampleAt(path, 1.0, _tmpA, null);
    v.yaw = Math.atan2(_tmpA.x - v.pos.x, _tmpA.z - v.pos.z);
    model.rotation.y = 0; group.rotation.y = v.yaw; group.position.x = v.pos.x; group.position.z = v.pos.z;
    v.update = function (dt) {
      if (v.state === 'in') {
        v.t += dt; var k = clamp(v.t / 0.9, 0, 1); group.scale.setScalar(Math.max(0.001, easeIO(k)));
        if (k >= 1) { v.state = 'drive'; group.scale.setScalar(1); }
      } else if (v.state === 'drive') {
        var sp = v.speed * Math.min(1, 0.3 + v.s / 4, 0.25 + (path.L - v.s) / 5);
        v.s = Math.min(path.L, v.s + sp * dt);
        sampleAt(path, v.s, v.pos, null); sampleAt(path, Math.min(path.L, v.s + LOOK), _tmpA, null);
        var dx = _tmpA.x - v.pos.x, dz = _tmpA.z - v.pos.z;
        if (dx * dx + dz * dz > 0.0004) { var d = Math.atan2(dx, dz) - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.yaw += d * Math.min(1, dt * 9); }
        group.position.x = v.pos.x; group.position.z = v.pos.z; group.rotation.y = v.yaw;
        if (v.s >= path.L) { v.state = 'wait'; v.t = 0; softPulse(v.to, col); }
      } else if (v.state === 'wait') {
        v.t += dt; if (v.t > 0.8) { v.state = 'out'; v.t = 0; }
      } else {
        v.t += dt; var k2 = clamp(v.t / 0.9, 0, 1); group.scale.setScalar(Math.max(0.001, 1 - easeIO(k2)));
        if (k2 >= 1) return true;
      }
      return false;
    };
    v.dispose = function () { if (lbl) disposeSprite(lbl); S.scene.remove(group); };
    S.flows.push(v);
  }
  function runDrone(h, opts, done) {
    var A = endpointInfo(h.from), B = endpointInfo(h.to);
    if (!A || !B) { done(); return; }
    var kind = h.kind || 'entry', col = KIND[kind] || '#22d3ee';
    var p0 = A.anchor.clone(), p3 = B.anchor.clone();
    var dist = p0.distanceTo(p3), lift = clamp(dist * 0.28, 5, 14), dir = p3.clone().sub(p0).setY(0).normalize();
    var p1 = p0.clone().add(new T.Vector3(0, lift, 0)).add(dir.clone().multiplyScalar(dist * 0.12));
    var p2 = p3.clone().add(new T.Vector3(0, lift * 0.7, 0)).sub(dir.clone().multiplyScalar(dist * 0.12));
    var curve = new T.CubicBezierCurve3(p0, p1, p2, p3), pts = curve.getPoints(48);
    var path = makePath(pts);
    var model = makeDrone(col), group = new T.Group(); group.add(model); group.scale.setScalar(0.001);
    var lbl = null;
    if (h.label) { lbl = pillSprite(String(h.label), { dot: col, fs: 24 }, 1.7); lbl.position.set(0, 3.4, 0); group.add(lbl); }
    S.scene.add(group);
    var v = { group: group, state: 'in', t: 0, s: 0, speed: 4.6 * ((opts && opts.speed) || 1), yaw: 0, pos: new T.Vector3(), to: h.to };
    sampleAt(path, 0, v.pos, null); group.position.copy(v.pos);
    v.yaw = Math.atan2(dir.x, dir.z); group.rotation.y = v.yaw;
    v.update = function (dt) {
      model.userData.inner.position.y = Math.sin(S.t * 2.2 + v.s * 0.2) * 0.05;
      if (v.state === 'in') {
        v.t += dt; var k = clamp(v.t / 0.6, 0, 1); group.scale.setScalar(Math.max(0.001, easeIO(k)));
        if (k >= 1) { v.state = 'drive'; group.scale.setScalar(1); }
      } else if (v.state === 'drive') {
        var sp = v.speed * Math.min(1, 0.35 + v.s / 5, 0.3 + (path.L - v.s) / 6);
        v.s = Math.min(path.L, v.s + sp * dt);
        sampleAt(path, v.s, v.pos, null); sampleAt(path, Math.min(path.L, v.s + 2.5), _tmpA, null);
        var dx = _tmpA.x - v.pos.x, dz = _tmpA.z - v.pos.z;
        if (dx * dx + dz * dz > 0.0004) { var d = Math.atan2(dx, dz) - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.yaw += d * Math.min(1, dt * 8); }
        group.position.copy(v.pos); group.rotation.y = v.yaw;
        model.userData.inner.rotation.x = clamp((_tmpA.y - v.pos.y) * -0.05, -0.25, 0.25);
        if (v.s >= path.L) { v.state = 'wait'; v.t = 0; softPulse(v.to, col); }
      } else if (v.state === 'wait') {
        v.t += dt; if (v.t > 0.7) { v.state = 'out'; v.t = 0; }
      } else {
        v.t += dt; var k2 = clamp(v.t / 0.7, 0, 1); group.scale.setScalar(Math.max(0.001, 1 - easeIO(k2)));
        group.position.y -= dt * 0.8;
        if (k2 >= 1) return true;
      }
      return false;
    };
    v.done = done;
    v.dispose = function () { if (lbl) disposeSprite(lbl); S.scene.remove(group); };
    S.flows.push(v);
  }
  var DRONE_KINDS = { entry: 1, report: 1 };
  function runHop(h, opts) {
    return new Promise(function (resolve) {
      try {
        if (!S.ready || !h || !h.from || !h.to) { resolve(); return; }
        var A = endpointInfo(h.from), B = endpointInfo(h.to);
        if (!A || !B) { resolve(); return; }
        if (S.flows.length > 40) { resolve(); return; } // safety valve
        if (h.from === h.to) { softPulse(h.to, KIND[h.kind] || null); setTimeout(resolve, 350); return; }
        if (DRONE_KINDS[h.kind] || !NODE_OF[h.from] || !NODE_OF[h.to]) runDrone(h, opts, resolve);
        else runRoad(h, opts, resolve);
      } catch (e) { console.error('[LW.world] flow error', e); resolve(); }
    });
  }
  function flow(hops, opts) {
    if (!hops) return Promise.resolve();
    if (!Array.isArray(hops)) hops = [hops];
    var p = Promise.resolve();
    hops.forEach(function (h) { p = p.then(function () { return runHop(h, opts); }); });
    return p.then(function () { return undefined; });
  }

  function updateFlows(dt) {
    for (var i = S.flows.length - 1; i >= 0; i--) {
      var v = S.flows[i], fin = false;
      try { fin = v.update(dt); } catch (e) { console.error(e); fin = true; }
      if (fin) { S.flows.splice(i, 1); v.dispose(); try { v.done(); } catch (e2) { console.error(e2); } }
    }
  }

  /* ---------- pulses ---------- */
  // Calm: a pulse is a single, very faint outline fade on the building pad (~1.2s). No rings, columns or glows.
  var PULSE_DUR = 1.2, PULSE_MAX = 0.22;
  function pulse(id, color, soft) {
    var b = endpointInfo(id); if (!b || !S.ready) return;
    if (soft || !b.outline) return;
    b.flash = 1;
  }
  function softPulse(id, color) { pulse(id, color, true); }
  function updatePulses(dt) { /* nothing to animate any more */ }

  /* ---------- hover / selection ---------- */
  var HI = typeof Map !== 'undefined' ? new Map() : null;
  function hiMat(m) {
    if (!m.emissive) return m;
    var h = HI.get(m);
    if (!h) { h = m.clone(); h.emissive = m.emissive.clone().multiplyScalar(m.emissiveIntensity).add(m.color.clone().multiplyScalar(0.1)); h.emissiveIntensity = 1; HI.set(m, h); }
    return h;
  }
  function setHi(b, on) {
    if (!b || b.hiOn === on) return; b.hiOn = on;
    b.meshes.forEach(function (m) { m.material = on ? hiMat(m.userData.baseMat) : m.userData.baseMat; });
  }
  function setHover(id) {
    if (id === S.hovered) return;
    if (S.hovered) setHi(S.buildings[S.hovered], false);
    S.hovered = id;
    if (id) setHi(S.buildings[id], true);
    S.dom.style.cursor = id ? 'pointer' : '';
    emit('hover', id);
  }
  function pick() {
    S.ray.setFromCamera(S.mouse, S.camera);
    var hits = S.ray.intersectObjects(S.pickables, false);
    return hits.length ? hits[0].object.userData.bid : null;
  }
  function select(id, silent) {
    S.selected = id || null;
    if (!silent) emit('select', S.selected);
  }

  /* ---------- status / badge ---------- */
  function setStatus(id, st) {
    var b = S.buildings[id]; if (!b) return;
    st = STATUS_COL[st] ? st : 'ok'; b.status = st;
    var c = C(STATUS_COL[st]);
    b.bulb.material.color.copy(c);
  }
  // Badge pills are no longer rendered in the 3D scene (the UI draws HTML mini-dashboards instead); text is only stored.
  function setBadge(id, text) {
    var b = S.buildings[id] || S.endpoints[id]; if (!b) return;
    if (b.badge) { disposeSprite(b.badge); b.badge = null; }
    b.badgeText = (text == null || text === '') ? '' : String(text);
  }

  /* =====================================================================
   * Labels (i18n): building name sprites + gate signs
   * ===================================================================== */
  function applyLabels() {
    IDS.forEach(function (id) {
      var b = S.buildings[id]; if (b && b.label && b.label.userData.text !== LABELS[id]) b.label.userData.setText(LABELS[id]);
    });
    ENDPOINTS.forEach(function (id) {
      var b = S.endpoints[id]; if (!b) return;
      if (b.label && b.label.userData.text !== LABELS[id]) b.label.userData.setText(LABELS[id]);
      if (b.drawSign) b.drawSign(LABELS[id]);
    });
  }
  function setLabels(map) {
    if (!map || typeof map !== 'object') return;
    Object.keys(map).forEach(function (k) {
      if (NAMES[k] != null && map[k] != null && String(map[k]).trim() !== '') LABELS[k] = String(map[k]);
    });
    if (S.ready) applyLabels();
  }
  // canvas text uses the web font only once it is loaded; redraw labels when fonts arrive
  function refreshAllLabels() {
    S.labels.slice().forEach(function (sp) { if (sp.userData.setText && sp.userData.text != null) sp.userData.setText(sp.userData.text); });
    applyLabels();
  }
  function watchFonts() {
    try {
      if (!document.fonts) return;
      var probe = LABELS.sales + ' Абвгд';
      if (document.fonts.load) {
        Promise.all([document.fonts.load('700 24px Inter', probe), document.fonts.load('800 78px Inter', probe)]).then(refreshAllLabels, function () {});
      }
      if (document.fonts.ready) document.fonts.ready.then(refreshAllLabels);
    } catch (e) { /* ignore */ }
  }

  /* =====================================================================
   * Team: low-poly accountants who walk the sidewalks
   * ===================================================================== */
  S.team = {}; S.spots = {};
  var WALK_SPEED = 2.6, SIDEWALK = 2.7, WORK_TIME = 2.0, PERSON_H = 3.45, MAX_QUEUE = 3;
  var WN = { customers: 'AW', vendors: 'AE' };
  // walker node for each location (gates are reached from the avenue node, then a connector)
  function walkNode(id) { return WN[id] || NODE_OF[id]; }

  // Standing spots, offsets [dx, dz] from the door node (buildings) -> first free spot is the home spot.
  var SPOT_OFF = {
    sales:     [[-2.9, 0.3], [2.9, 0.3], [-2.9, 2.2], [2.9, 2.2], [-9.0, 0.3], [9.0, 0.3]],
    procure:   [[-2.9, 1.4], [2.9, 1.4], [-2.9, 2.6], [2.9, 2.6], [8.8, 1.0], [-9.0, 1.0]],
    warehouse: [[3.0, 0.5], [3.0, 2.3], [7.4, 0.9], [7.4, 2.7], [-9.2, 1.5], [9.2, 1.5]],
    bank:      [[6.4, 0.4], [8.6, 0.4], [6.4, 2.2], [8.6, 2.2], [-9.6, 0.4], [-9.6, 2.2]],
    payroll:   [[-3.2, 1.5], [3.2, 1.5], [-6.4, 1.5], [6.4, 1.5], [-9.0, 0.5], [9.0, 0.5]],
    reporting: [[-2.9, 1.9], [2.9, 1.9], [-5.8, 1.9], [5.8, 1.9], [-8.4, 1.9], [8.4, 1.9]],
    ledger:    [[-2.9, 0.5], [2.9, 0.5], [-5.2, 0.5], [5.2, 0.5], [-7.5, 0.5], [7.5, 0.5], [-9.6, 0.5], [9.6, 0.5]],
    _: [[-3.1, 0.5], [3.1, 0.5], [-5.4, 0.5], [5.4, 0.5], [-3.1, 2.4], [3.1, 2.4]]
  };
  function buildSpots() {
    IDS.forEach(function (id) {
      var d = DEF[id], offs = SPOT_OFF[id] || SPOT_OFF._;
      S.spots[id] = offs.map(function (o) { return { x: d.door[0] + o[0], z: d.door[1] + o[1], yaw: o[2] != null ? o[2] : Math.PI, owner: null }; });
    });
    var gx = 51.0;
    S.spots.customers = [[-gx, AZ + 3.5, -Math.PI / 2], [-gx, AZ - 3.5, -Math.PI / 2], [-gx - 2.0, AZ + 5.8, -Math.PI / 2], [-gx - 2.0, AZ - 5.8, -Math.PI / 2]]
      .map(function (a) { return { x: a[0], z: a[1], yaw: a[2], owner: null }; });
    S.spots.vendors = [[gx, AZ - 3.5, Math.PI / 2], [gx, AZ + 3.5, Math.PI / 2], [gx + 2.0, AZ - 5.8, Math.PI / 2], [gx + 2.0, AZ + 5.8, Math.PI / 2]]
      .map(function (a) { return { x: a[0], z: a[1], yaw: a[2], owner: null }; });
  }
  function claimSpot(loc, m, home) {
    var list = S.spots[loc]; if (!list) return null;
    var i, sp;
    for (i = 0; i < list.length; i++) if (list[i].owner === m.id) { if (home === (list[i] === m.homeSpot)) return list[i]; }
    for (i = 0; i < list.length; i++) { sp = list[i]; if (!sp.owner) { sp.owner = m.id; return sp; } }
    return list[list.length - 1]; // crowded: share the last one
  }
  function releaseSpot(m, sp) { if (sp && sp !== m.homeSpot && sp.owner === m.id) sp.owner = null; }

  var PERSON_STYLE = {
    elena:   { skin: '#f1c9a6', hair: '#5b3a29', style: 'bob' },
    maria:   { skin: '#e8b78f', hair: '#2b1b14', style: 'long' },
    georgi:  { skin: '#f0c4a0', hair: '#3b2a20', style: 'short' },
    ivan:    { skin: '#d9a37a', hair: '#1e1713', style: 'short' },
    ana:     { skin: '#f5d0b0', hair: '#c9822e', style: 'pony' },
    nikolai: { skin: '#e9b88e', hair: '#8a6a3b', style: 'short' },
    desi:    { skin: '#f1c8a6', hair: '#18120f', style: 'bun' }
  };
  var SKINS = ['#f3cfae', '#e8b78f', '#d9a37a', '#c68a62'], HAIRS = ['#2b1b14', '#5b3a29', '#1e1713', '#8a6a3b', '#c9822e'], STYLES = ['short', 'bob', 'long', 'bun', 'pony'];
  function hashStr(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
  function styleFor(id) {
    if (PERSON_STYLE[id]) return PERSON_STYLE[id];
    var h = hashStr(id);
    return { skin: SKINS[h % SKINS.length], hair: HAIRS[(h >> 3) % HAIRS.length], style: STYLES[(h >> 5) % STYLES.length] };
  }
  var _sph = {};
  function sphGeo(r, ws, hs, tl) {
    var k = r + ',' + ws + ',' + hs + ',' + (tl || 0);
    return _sph[k] || (_sph[k] = tl ? new T.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, tl) : new T.SphereGeometry(r, ws, hs));
  }
  function firstName(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }

  function docIconCanvas(col) {
    var cv = document.createElement('canvas'); cv.width = cv.height = 128;
    var c = cv.getContext('2d');
    c.shadowColor = 'rgba(30,38,56,.22)'; c.shadowBlur = 6; c.shadowOffsetY = 2;
    c.fillStyle = col; rr(c, 22, 8, 84, 108, 12); c.fill();
    c.shadowColor = 'transparent';
    c.fillStyle = '#ffffff'; rr(c, 28, 14, 72, 96, 8); c.fill();
    c.fillStyle = col; c.beginPath(); c.moveTo(78, 14); c.lineTo(100, 36); c.lineTo(78, 36); c.closePath(); c.globalAlpha = 0.55; c.fill(); c.globalAlpha = 1;
    c.fillStyle = col; c.fillRect(38, 48, 44, 8); c.globalAlpha = 0.45; c.fillRect(38, 66, 52, 7); c.fillRect(38, 80, 40, 7); c.fillRect(38, 94, 48, 7); c.globalAlpha = 1;
    return cv;
  }
  function docSprite(col) {
    var tex = new T.CanvasTexture(docIconCanvas(col)); tex.encoding = T.sRGBEncoding; tex.generateMipmaps = false; tex.minFilter = T.LinearFilter;
    var spr = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    spr.renderOrder = 31; spr.userData.bw = 2.0; spr.userData.bh = 2.0; spr.scale.set(2.0, 2.0, 1);
    S.labels.push(spr);
    return spr;
  }

  function makePerson(m) {
    var st = styleFor(m.id);
    var root = new T.Group(), body = new T.Group(); root.add(body);
    var colM = mat(m.color), pants = mat('#2e3a56'), skin = mat(st.skin, { raw: true }), hairM = mat(st.hair), shoe = mat('#1d2336'), dark = mat('#1b2236');
    var parts = { root: root, body: body, legs: [], arms: [] };
    // legs (pivot at hip)
    [-1, 1].forEach(function (s) {
      var lg = new T.Group(); lg.position.set(s * 0.27, 1.42, 0); body.add(lg);
      add(lg, cylGeo(0.21, 0.18, 1.2, 8), pants, 0, -0.62, 0, { nr: true });
      add(lg, boxGeo(0.42, 0.24, 0.7), shoe, 0, -1.3, 0.1, { nr: true });
      parts.legs.push(lg);
    });
    // torso, shoulders, belt
    add(body, cylGeo(0.52, 0.44, 1.2, 10), colM, 0, 2.02, 0, { nr: true });
    var sh = add(body, sphGeo(0.52, 10, 6), colM, 0, 2.6, 0, { nr: true }); sh.scale.set(1, 0.5, 0.82);
    add(body, cylGeo(0.5, 0.49, 0.13, 10), dark, 0, 1.46, 0, { nr: true });
    add(body, boxGeo(0.34, 0.2, 0.05), mat('#ffffff'), 0.2, 2.25, 0.46, { ns: true, nr: true }); // name badge
    // head
    var head = new T.Group(); head.position.set(0, 3.0, 0); body.add(head); parts.head = head;
    add(head, sphGeo(0.46, 14, 10), skin, 0, 0, 0, { nr: true });
    add(head, sphGeo(0.065, 6, 5), dark, -0.16, 0.03, 0.42, { ns: true, nr: true });
    add(head, sphGeo(0.065, 6, 5), dark, 0.16, 0.03, 0.42, { ns: true, nr: true });
    var cap = add(head, sphGeo(0.5, 14, 8, Math.PI * 0.56), hairM, 0, 0.04, -0.05, { nr: true });
    cap.rotation.x = -0.18;
    if (st.style === 'long') {
      add(head, boxGeo(0.92, 1.25, 0.34), hairM, 0, -0.42, -0.3, { nr: true });
    } else if (st.style === 'bob') {
      add(head, boxGeo(0.98, 0.75, 0.36), hairM, 0, -0.16, -0.3, { nr: true });
      add(head, boxGeo(0.14, 0.62, 0.6), hairM, -0.46, -0.1, -0.08, { nr: true });
      add(head, boxGeo(0.14, 0.62, 0.6), hairM, 0.46, -0.1, -0.08, { nr: true });
    } else if (st.style === 'bun') {
      add(head, sphGeo(0.24, 8, 6), hairM, 0, 0.5, -0.3, { nr: true });
      add(head, boxGeo(0.9, 0.4, 0.3), hairM, 0, -0.02, -0.34, { nr: true });
    } else if (st.style === 'pony') {
      var pt = add(head, cylGeo(0.12, 0.2, 0.95, 7), hairM, 0, -0.35, -0.55, { nr: true }); pt.rotation.x = -0.35;
      add(head, boxGeo(0.9, 0.4, 0.3), hairM, 0, -0.02, -0.34, { nr: true });
    } else {
      add(head, boxGeo(0.86, 0.3, 0.3), hairM, 0, 0.02, -0.34, { nr: true });
    }
    // arms (pivot at shoulder)
    [-1, 1].forEach(function (s) {
      var arm = new T.Group(); arm.position.set(s * 0.68, 2.55, 0); body.add(arm);
      add(arm, cylGeo(0.16, 0.14, 0.98, 8), colM, 0, -0.5, 0, { nr: true });
      add(arm, sphGeo(0.17, 8, 6), skin, 0, -1.07, 0, { nr: true });
      parts.arms.push(arm);
    });
    // document / clipboard held in the right hand
    var prop = new T.Group(); prop.position.set(0, -1.2, 0.05); parts.arms[1].add(prop); parts.prop = prop;
    add(prop, boxGeo(0.78, 1.02, 0.07), mat('#7b6a58'), 0, 0, 0, { nr: true });
    add(prop, boxGeo(0.66, 0.9, 0.09), mat('#ffffff'), 0, 0, 0.012, { ns: true, nr: true });
    add(prop, boxGeo(0.66, 0.2, 0.11), colM, 0, 0.35, 0.02, { ns: true, nr: true });
    add(prop, boxGeo(0.4, 0.06, 0.12), mat('#c9d4ee'), 0, 0.03, 0.02, { ns: true, nr: true });
    add(prop, boxGeo(0.46, 0.06, 0.12), mat('#c9d4ee'), 0, -0.17, 0.02, { ns: true, nr: true });
    prop.visible = false;
    return parts;
  }

  function createMember(d, home, color) {
    var m = { id: d.id, name: d.name || d.id, role: d.role || '', color: color, home: home, at: home, queue: [], job: null,
      phase: Math.random() * 6, seed: Math.random() * 10, yaw: Math.PI, walkAmp: 0, armR: 0, armL: 0, workK: 0, hl: 0, curSpot: null, homeSpot: null,
      taskSpr: null, taskText: '', speedNow: 0 };
    var parts = makePerson(m);
    m.parts = parts; m.root = parts.root;
    m.first = firstName(m.name);
    m.pill = pillSprite(m.first, { dot: muteHex(color, 0.12), fs: 24, pad: 13 }, 2.3);
    m.root.add(m.pill);
    m.doc = docSprite(muteHex(color, 0.12)); m.doc.visible = false; m.root.add(m.doc);
    // highlight rings
    m.rings = [0].map(function () {
      var r = new T.Mesh(_ringGeo2(), new T.MeshBasicMaterial({ color: C(muteHex(color, 0.12)), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
      r.renderOrder = 6; r.visible = false; r.position.y = 0.05; m.root.add(r); return r;
    });
    S.scene.add(m.root);
    m.homeSpot = claimSpot(home, m, false);
    if (m.homeSpot) { m.homeSpot.owner = m.id; m.curSpot = m.homeSpot; m.root.position.set(m.homeSpot.x, ROAD_Y, m.homeSpot.z); m.yaw = m.homeSpot.yaw; m.root.rotation.y = m.yaw; }
    S.team[m.id] = m;
    return m;
  }
  var _ring2 = null;
  function _ringGeo2() { if (!_ring2) { _ring2 = new T.RingGeometry(0.86, 1, 40); _ring2.rotateX(-Math.PI / 2); } return _ring2; }

  function clearTask(m) { if (m.taskSpr) { disposeSprite(m.taskSpr); m.taskSpr = null; m.taskText = ''; } }
  function showTask(m, text) {
    text = String(text || '');
    if (text.length > 38) text = text.slice(0, 37) + '…';
    if (!text) { clearTask(m); return; }
    if (m.taskSpr && m.taskText === text) return;
    clearTask(m);
    m.taskSpr = pillSprite(text, { dot: muteHex(m.color, 0.12), fs: 22, pad: 13, border: 'rgba(70,82,104,.38)' }, 2.0);
    m.taskText = text; m.root.add(m.taskSpr);
  }
  function removeMember(m) {
    if (m.job) { try { m.job.resolve(); } catch (e) { /* ignore */ } m.job = null; }
    m.queue.splice(0).forEach(function (j) { try { j.resolve(); } catch (e) { /* ignore */ } });
    var list = S.spots[m.at]; if (list) list.forEach(function (sp) { if (sp.owner === m.id) sp.owner = null; });
    Object.keys(S.spots).forEach(function (k) { S.spots[k].forEach(function (sp) { if (sp.owner === m.id) sp.owner = null; }); });
    clearTask(m); disposeSprite(m.pill); disposeSprite(m.doc);
    m.rings.forEach(function (r) { r.material.dispose(); });
    S.scene.remove(m.root);
    delete S.team[m.id];
  }
  function applyTeam(list) {
    var seen = {};
    list.forEach(function (d) {
      if (!d || !d.id) return;
      seen[d.id] = 1;
      var home = S.buildings[d.home] ? d.home : (S.buildings[(S.team[d.id] || {}).home] ? S.team[d.id].home : 'ledger');
      var color = d.color || ACC[home] || '#2f6bff';
      var m = S.team[d.id];
      if (m && (m.color !== color || m.home !== home)) { removeMember(m); m = null; }
      if (!m) m = createMember(d, home, color);
      m.name = d.name || m.name; m.role = d.role || m.role;
      var fn = firstName(m.name);
      if (fn && fn !== m.first) { m.first = fn; m.pill.userData.setText(fn); }
    });
    Object.keys(S.team).forEach(function (id) { if (!seen[id]) removeMember(S.team[id]); });
  }
  function setTeam(list) {
    if (!Array.isArray(list)) return;
    S.teamData = list.map(function (d) { return d && { id: d.id, name: d.name, role: d.role, color: d.color, home: d.home }; }).filter(Boolean);
    if (S.ready) applyTeam(S.teamData);
  }

  /* ---- sidewalk routing ---- */
  function leftOf(dx, dz) { return [-dz, dx]; }
  function sidewalkPoints(ids, off) {
    var P = ids.map(function (id) { return S.nodes[id]; }), n = P.length, dirs = [], out = [], i;
    if (n < 2) return out;
    for (i = 0; i < n - 1; i++) { var dx = P[i + 1].x - P[i].x, dz = P[i + 1].z - P[i].z, l = Math.hypot(dx, dz) || 1; dirs.push([dx / l, dz / l]); }
    for (i = 0; i < n; i++) {
      var lx, lz;
      if (i === 0) { var a = leftOf(dirs[0][0], dirs[0][1]); lx = a[0]; lz = a[1]; }
      else if (i === n - 1) { var b = leftOf(dirs[n - 2][0], dirs[n - 2][1]); lx = b[0]; lz = b[1]; }
      else {
        var d0 = dirs[i - 1], d1 = dirs[i], dot = d0[0] * d1[0] + d0[1] * d1[1];
        var l1 = leftOf(d1[0], d1[1]);
        if (dot > 0.99) { lx = l1[0]; lz = l1[1]; }
        else { var l0 = leftOf(d0[0], d0[1]); lx = l0[0] + l1[0]; lz = l0[1] + l1[1]; }
      }
      out.push(new T.Vector3(P[i].x + lx * off, ROAD_Y, P[i].z + lz * off));
    }
    return out;
  }
  function walkPath(fromLoc, toLoc, fromPos, toSpot) {
    var a = walkNode(fromLoc), b = walkNode(toLoc), ids = (a && b) ? route(a, b) : null;
    var pts = [new T.Vector3(fromPos.x, ROAD_Y, fromPos.z)];
    if (ids && ids.length > 1) sidewalkPoints(ids, SIDEWALK).forEach(function (p) { pts.push(p); });
    pts.push(new T.Vector3(toSpot.x, ROAD_Y, toSpot.z));
    var clean = [pts[0]];
    for (var i = 1; i < pts.length; i++) if (pts[i].distanceTo(clean[clean.length - 1]) > 0.05) clean.push(pts[i]);
    if (clean.length < 2) return null;
    return makePath(smoothPath(clean, 2.4, false));
  }

  /* ---- walk jobs ---- */
  function walk(memberId, toId, opts) {
    return new Promise(function (resolve) {
      var m = S.team[memberId];
      if (!S.ready || !m || !S.spots[toId]) { resolve(); return; }
      if (m.queue.length >= MAX_QUEUE) { resolve(); return; } // backlog guard: drop instead of piling up
      m.queue.push({ to: toId, opts: opts || {}, resolve: resolve, stage: 'new', resolved: false });
    });
  }
  function resolveJob(j) { if (!j.resolved) { j.resolved = true; try { j.resolve(); } catch (e) { console.error(e); } } }
  function beginLeg(m, j, toLoc, spot, carrying) {
    var path = walkPath(m.at, toLoc, m.root.position, spot);
    if (!path) return false;
    j.path = path; j.s = 0; j.spot = spot; j.toLoc = toLoc; j.carry = carrying;
    return true;
  }
  function startJob(m, j) {
    m.job = j; j.t = 0;
    if (j.to === m.at) { j.stage = 'work'; return; }
    var spot = j.to === m.home ? m.homeSpot : claimSpot(j.to, m, false);
    j.visitSpot = spot;
    if (beginLeg(m, j, j.to, spot, true)) j.stage = 'go';
    else { m.curSpot = spot; m.at = j.to; j.stage = 'work'; }
  }
  var _wp = new T.Vector3(), _wp2 = new T.Vector3();
  function legStep(m, j, dt) {
    var boost = 1 + Math.min(0.5, 0.2 * m.queue.length);
    var base = WALK_SPEED * ((j.opts && j.opts.speed) || 1) * boost;
    var sp = base * Math.min(1, 0.3 + j.s / 1.4, 0.3 + (j.path.L - j.s) / 1.6);
    j.s = Math.min(j.path.L, j.s + sp * dt);
    sampleAt(j.path, j.s, _wp, null); sampleAt(j.path, Math.min(j.path.L, j.s + 1.2), _wp2, null);
    m.root.position.set(_wp.x, ROAD_Y, _wp.z);
    var dx = _wp2.x - _wp.x, dz = _wp2.z - _wp.z;
    if (dx * dx + dz * dz > 0.0004) { var d = Math.atan2(dx, dz) - m.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); m.yaw += d * Math.min(1, dt * 9); }
    m.speedNow = sp;
    m.phase += sp * dt * 2.5;
    return j.s >= j.path.L - 0.001;
  }
  function stepJob(m, j, dt) {
    if (j.stage === 'go') {
      if (legStep(m, j, dt)) {
        releaseSpot(m, m.curSpot); m.curSpot = j.spot; m.at = j.toLoc; j.stage = 'work'; j.t = 0; m.speedNow = 0;
        if (j.opts.returnHome === false) resolveJob(j);
      }
    } else if (j.stage === 'work') {
      m.speedNow = 0;
      var dur = (j.opts.workTime != null ? Number(j.opts.workTime) : WORK_TIME);
      if (j.opts.label) dur = Math.max(dur, 2.6); // keep the task label on screen long enough to read
      if (j.t === 0 && j.opts.label) showTask(m, j.opts.label);
      j.t += dt;
      // face the building / gate
      var sp = m.curSpot; if (sp) { var dd = sp.yaw - m.yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); m.yaw += dd * Math.min(1, dt * 6); }
      if (j.t >= dur) {
        clearTask(m);
        if (j.opts.returnHome === false || m.at === m.home || m.queue.length) { finishJob(m, j); }
        else if (beginLeg(m, j, m.home, m.homeSpot, false)) { j.stage = 'back'; }
        else { finishJob(m, j); }
      }
    } else if (j.stage === 'back') {
      if (legStep(m, j, dt)) { releaseSpot(m, m.curSpot); m.curSpot = m.homeSpot; m.at = m.home; m.speedNow = 0; finishJob(m, j); }
    } else finishJob(m, j);
  }
  function finishJob(m, j) { m.job = null; resolveJob(j); }

  var _tv = new T.Vector3();
  function updateMember(m, dt, pf) {
    if (!m.job && m.queue.length) startJob(m, m.queue.shift());
    if (m.job) stepJob(m, m.job, dt);
    var j = m.job, P = m.parts;
    var walking = !!(j && (j.stage === 'go' || j.stage === 'back') && m.speedNow > 0.05);
    var working = !!(j && j.stage === 'work');
    var carrying = !!(j && ((j.stage === 'go' && j.carry) || j.stage === 'work'));
    var k8 = Math.min(1, dt * 8), t = S.t + m.seed;
    m.walkAmp += ((walking ? 1 : 0) - m.walkAmp) * k8;
    m.workK += ((working ? 1 : 0) - m.workK) * Math.min(1, dt * 5);
    // legs
    var sw = Math.sin(m.phase) * 0.8 * m.walkAmp;
    P.legs[0].rotation.x = sw; P.legs[1].rotation.x = -sw;
    // arms
    var tgtR, tgtL;
    if (carrying) { tgtR = -1.15 + Math.sin(m.phase * 2) * 0.04 * m.walkAmp; tgtL = -0.55; if (working) { tgtR = -1.2 + Math.sin(t * 3) * 0.03; tgtL = -1.1 + Math.sin(t * 3 + 1.7) * 0.04; } }
    else { tgtR = -sw * 0.9; tgtL = sw * 0.9; if (walking) { tgtR = Math.sin(m.phase + Math.PI) * 0.7; tgtL = Math.sin(m.phase) * 0.7; } }
    m.armR += (tgtR - m.armR) * k8; m.armL += (tgtL - m.armL) * k8;
    P.arms[0].rotation.x = m.armL; P.arms[1].rotation.x = m.armR;
    P.arms[0].rotation.z = 0.06; P.arms[1].rotation.z = -0.06;
    P.prop.visible = carrying;
    // body bob / head
    var bob = Math.abs(Math.sin(m.phase)) * 0.09 * m.walkAmp;
    P.body.position.y = bob;
    P.head.rotation.x = 0.2 * m.workK;
    P.head.rotation.y = (1 - m.workK) * (1 - m.walkAmp) * Math.sin(t * 0.3) * 0.15;
    P.body.rotation.z = Math.sin(m.phase) * 0.05 * m.walkAmp;
    // heading
    m.root.rotation.y = m.yaw;
    // scale so people stay noticeable when zoomed out
    P.body.scale.setScalar(pf);
    var H = PERSON_H * pf;
    m.pill.position.set(0, H + 1.15, 0);
    if (m.taskSpr) { m.taskSpr.position.set(0, H + 3.5, 0); }
    // carried doc icon floats above the pill while walking
    var showDoc = carrying && !working;
    m.doc.visible = showDoc;
    if (showDoc) m.doc.position.set(0, H + 3.4, 0);
    // highlight rings
    if (m.hl > 0) {
      m.hl = Math.max(0, m.hl - dt / 2.6);
      var kk = 1 - m.hl;
      m.rings.forEach(function (r) {
        var q = clamp(kk, 0, 1);
        r.visible = q > 0 && q < 1; r.scale.setScalar(1.0 + q * 1.8); r.material.opacity = (1 - q) * 0.4;
      });
      m.pill.material.opacity = 1;
    } else if (m.rings[0].visible) m.rings.forEach(function (r) { r.visible = false; });
  }
  function updateTeam(dt) {
    var ids = Object.keys(S.team); if (!ids.length) return;
    var dist = S.camera.position.distanceTo(S.controls ? S.controls.target : S.target);
    var pf = clamp(Math.pow(dist / 120, 0.5), 1.15, 1.8);
    for (var i = 0; i < ids.length; i++) { try { updateMember(S.team[ids[i]], dt, pf); } catch (e) { console.error('[LW.world] team error', e); } }
  }
  function highlightMember(id) { var m = S.team[id]; if (m) m.hl = 1; }

  /* ---------- screen projection (CSS viewport pixels) ---------- */
  function toScreen(v3) {
    S.camera.updateMatrixWorld(); S.camera.updateProjectionMatrix();
    var r = S.dom.getBoundingClientRect(), p = v3.clone().project(S.camera);
    return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (1 - (p.y * 0.5 + 0.5)) * r.height, visible: p.z > -1 && p.z < 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 };
  }
  function screenPos(id) {
    if (!S.ready) return { x: window.innerWidth / 2, y: window.innerHeight / 2, visible: false };
    var m = S.team[id];
    if (m) return toScreen(new T.Vector3(m.root.position.x, 2.4 * clamp(m.parts.body.scale.x, 1, 2), m.root.position.z));
    var b = S.buildings[id];
    if (b) {
      // aim at a point on the building body that actually raycasts to this building (so a click there selects it)
      S.camera.updateMatrixWorld();
      var ys = [0.45, 0.3, 0.6, 0.75, 0.2], k, best = null;
      for (k = 0; k < ys.length; k++) {
        var top = Math.min(b.top, id === 'ledger' ? 16 : b.top), y = Math.max(2, top * ys[k]);
        var v = new T.Vector3(b.center.x, y, b.center.z), s = toScreen(v);
        if (!best) best = s;
        if (!s.visible) continue;
        var r = S.dom.getBoundingClientRect();
        var ndc = new T.Vector2(((s.x - r.left) / r.width) * 2 - 1, -((s.y - r.top) / r.height) * 2 + 1);
        S.ray.setFromCamera(ndc, S.camera);
        var hits = S.ray.intersectObjects(S.pickables, false);
        if (hits.length && hits[0].object.userData.bid === id) return s;
      }
      return best;
    }
    var e = S.endpoints[id];
    if (e) return toScreen(new T.Vector3(e.center.x, 6.2, e.center.z));
    var rc = S.dom.getBoundingClientRect();
    return { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2, visible: false };
  }

  // bottom-centre of a building's name pill, in CSS viewport pixels
  function labelScreenPos(id) {
    var b = S.buildings[id] || S.endpoints[id];
    if (!S.ready || !b || !b.label) {
      var rc = S.dom ? S.dom.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      return { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2, visible: false };
    }
    S.camera.updateMatrixWorld();
    var sp = b.label, u = sp.userData;
    sp.updateMatrixWorld(true);
    var wp = new T.Vector3().setFromMatrixPosition(sp.matrixWorld);
    var up = new T.Vector3().setFromMatrixColumn(S.camera.matrixWorld, 1).normalize();
    var sy = sp.scale.y, drop = sy * (0.5 - (u.padFrac || 0)); // pill body ends padFrac above the canvas edge
    wp.addScaledVector(up, -drop);
    return toScreen(wp);
  }
  var frameCbs = [];
  function onFrame(fn) {
    if (typeof fn !== 'function') return function () {};
    frameCbs.push(fn);
    return function () { var i = frameCbs.indexOf(fn); if (i >= 0) frameCbs.splice(i, 1); };
  }

  /* =====================================================================
   * Camera
   * ===================================================================== */
  var DEF_AZ = 0.5, DEF_POLAR = 0.98, TARGET0 = [0, 5, 4];
  function defaultDist() {
    var asp = S.camera ? S.camera.aspect : 1.6;
    var d = clamp(255 / asp, 125, 300);
    // pull back a little when panels cover part of the view so the whole campus fits
    var I = S.insets, c = S.container;
    if (I && c) {
      var w = c.clientWidth || 1, h = c.clientHeight || 1;
      var free = Math.min((w - I.left - I.right) / w, (h - I.top - I.bottom) / h);
      d *= clamp(1 / Math.max(free, 0.3), 1, S.insetZoomMax || 1.85);
    }
    return d;
  }
  function getSph() {
    var off = new T.Vector3().subVectors(S.camera.position, S.controls ? S.controls.target : S.target);
    return new T.Spherical().setFromVector3(off);
  }
  function applyView(target, sph) {
    var t = S.controls ? S.controls.target : S.target;
    t.copy(target);
    S.camera.position.copy(new T.Vector3().setFromSpherical(sph).add(t));
    S.camera.lookAt(t);
    if (S.controls) S.controls.update();
  }
  function tweenView(target, sph, dur) {
    var s0 = getSph(), t0 = (S.controls ? S.controls.target : S.target).clone();
    var dTheta = sph.theta - s0.theta; dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
    S.tweens = [{ t: 0, dur: dur || 1.0, fn: function (e) {
      var s = new T.Spherical(lerp(s0.radius, sph.radius, e), lerp(s0.phi, sph.phi, e), s0.theta + dTheta * e);
      applyView(t0.clone().lerp(target, e), s);
    } }];
  }
  function clampSph(s) {
    var mn = S.controls ? S.controls.minDistance : 40, mx = S.controls ? S.controls.maxDistance : 300;
    s.radius = clamp(s.radius, mn, mx); s.phi = clamp(s.phi, 0.61, 1.13); return s;
  }
  function zoom(delta) {
    if (!S.ready) return;
    delta = Number(delta) || 0;
    var f = Math.abs(delta) >= 1 ? (delta > 0 ? 0.78 : 1 / 0.78) : (1 - delta);
    var s = getSph(); s.radius *= f; clampSph(s);
    tweenView((S.controls ? S.controls.target : S.target).clone(), s, 0.45);
  }
  function rotate(dir) {
    if (!S.ready) return;
    var s = getSph(); s.theta += Number(dir) || 0;
    tweenView((S.controls ? S.controls.target : S.target).clone(), s, 0.8);
  }
  function resetView() {
    if (!S.ready) return;
    var s = new T.Spherical(defaultDist(), DEF_POLAR, DEF_AZ);
    tweenView(new T.Vector3(TARGET0[0], TARGET0[1], TARGET0[2]), s, 1.1);
  }
  function focus(id, opts) {
    if (!S.ready) return;
    var b = S.buildings[id] || S.endpoints[id];
    if (!b && S.team[id]) { var mp = S.team[id].root.position; b = { center: new T.Vector3(mp.x, 0, mp.z), radius: 6, top: 6 }; }
    if (!b) return;
    var s = getSph(); s.radius = Math.max(60, b.radius * 5.4 + 22, b.top * 2.5); s.phi = clamp(Math.min(s.phi, 1.0), 0.61, 1.13); clampSph(s);
    var tgt = new T.Vector3(b.center.x, Math.min(b.top * 0.4, 14), b.center.z);
    var shift = opts && opts.shift != null ? opts.shift : 0.08;
    // shift target to the right in screen space so the building sits left of centre (clear of a right-hand panel)
    var right = new T.Vector3().setFromMatrixColumn(S.camera.matrixWorld, 0); right.y = 0; right.normalize();
    tgt.add(right.multiplyScalar(s.radius * shift));
    tweenView(tgt, s, 1.1);
  }

  /* =====================================================================
   * init / loop
   * ===================================================================== */
  function resize() {
    if (!S.renderer) return;
    var c = S.container, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return;
    S.renderer.setSize(w, h, true);
    S.camera.aspect = w / h;
    applyInsets(w, h);
    S.camera.updateProjectionMatrix();
  }

  // Shift the projection centre into the part of the screen not covered by UI panels.
  // insets are CSS pixels covered on each side; the 3D view itself still fills the canvas.
  function applyInsets(w, h) {
    var I = S.insets;
    if (!I) { if (S.camera.view) S.camera.clearViewOffset(); return; }
    var cx = I.left + Math.max(40, w - I.left - I.right) / 2;
    var cy = I.top + Math.max(40, h - I.top - I.bottom) / 2;
    S.camera.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h);
  }
  function setInsets(ins) {
    S.insets = ins ? {
      top: Math.max(0, +ins.top || 0), right: Math.max(0, +ins.right || 0),
      bottom: Math.max(0, +ins.bottom || 0), left: Math.max(0, +ins.left || 0)
    } : null;
    if (!S.renderer) return;
    var c = S.container, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    applyInsets(w, h);
    S.camera.updateProjectionMatrix();
  }

  function frame() {
    S.raf = requestAnimationFrame(frame);
    var rawDt = Math.min(0.05, S.clock.getDelta()), dt = rawDt * S.timeScale;
    S.t += rawDt;
    // camera tweens
    if (S.tweens.length) {
      var tw = S.tweens[0]; tw.t += rawDt;
      var k = clamp(tw.t / tw.dur, 0, 1); tw.fn(easeIO(k));
      if (k >= 1) S.tweens.shift();
    } else if (S.controls) S.controls.update();
    // clamp pan to the map
    var tg = S.controls ? S.controls.target : S.target;
    var cx = clamp(tg.x, -46, 46), cz = clamp(tg.z, -30, 36), cyy = clamp(tg.y, 0, 14);
    if (cx !== tg.x || cz !== tg.z || cyy !== tg.y) {
      S.camera.position.add(new T.Vector3(cx - tg.x, cyy - tg.y, cz - tg.z)); tg.set(cx, cyy, cz);
    }
    // hover
    if (S.hoverDirty && !S.dragging) { S.hoverDirty = false; setHover(pick()); }
    // sim
    updateAmbient(dt); updateFlows(dt); updatePulses(rawDt); updateTeam(dt);
    for (var i = 0; i < S.tick.length; i++) S.tick[i](S.t, rawDt);
    // building animation: outline + beacons
    for (var id in S.buildings) {
      var b = S.buildings[id];
      var th = (S.hovered === id ? 0.95 : 0) + (S.selected === id ? 1 : 0);
      b.hover += (Math.min(1, th) - b.hover) * Math.min(1, rawDt * 10);
      b.flash = Math.max(0, b.flash - rawDt / PULSE_DUR);
      var fl = b.flash * b.flash * (3 - 2 * b.flash); // smooth fade
      b.outline.material.opacity = clamp(Math.max(b.hover * 0.5, fl * PULSE_MAX), 0, 1);
      b.bulb.scale.setScalar(b.status === 'ok' ? 0.8 : 1);
    }
    // label scaling vs camera distance
    var dist = S.camera.position.distanceTo(tg), f = Math.pow(dist / 150, 0.55);
    for (var j = 0; j < S.labels.length; j++) {
      var sp = S.labels[j], u = sp.userData;
      if (u.bw) sp.scale.set(u.bw * f, u.bh * f, 1);
    }
    S.renderer.render(S.scene, S.camera);
    for (var q = 0; q < frameCbs.length; q++) { try { frameCbs[q](); } catch (e) { console.error('[LW.world] onFrame error', e); } }
  }

  function init(containerEl) {
    try {
      if (!T) return false;
      if (S.ready) return true;
      if (typeof containerEl === 'string') containerEl = document.getElementById(containerEl) || document.querySelector(containerEl);
      if (!containerEl) containerEl = document.body;
      S.container = containerEl;
      var renderer;
      try {
        renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      } catch (e) { return false; }
      if (!renderer || !renderer.getContext || !renderer.getContext()) return false;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.setClearColor(new T.Color('#e7e6e3'), 1);
      S.renderer = renderer; S.dom = renderer.domElement;
      S.dom.style.display = 'block'; S.dom.style.width = '100%'; S.dom.style.height = '100%'; S.dom.style.touchAction = 'none';
      S.dom.style.outline = 'none';
      if (getComputedStyle(containerEl).position === 'static') containerEl.style.position = 'relative';
      containerEl.insertBefore(S.dom, containerEl.firstChild);

      var scene = (S.scene = new T.Scene());
      scene.background = new T.Color('#e7e6e3');
      S.clock = new T.Clock();
      S.ray = new T.Raycaster();
      S.target = new T.Vector3(TARGET0[0], TARGET0[1], TARGET0[2]);

      var w = containerEl.clientWidth || window.innerWidth, h = containerEl.clientHeight || window.innerHeight;
      var camera = (S.camera = new T.PerspectiveCamera(30, w / h, 10, 1500));
      renderer.setSize(w, h, true);

      // lights
      scene.add(new T.HemisphereLight(0xffffff, 0xcfcdc8, 0.62));
      var sun = new T.DirectionalLight(0xfff4e4, 1.0);
      sun.position.set(-52, 90, 36); sun.target.position.set(0, 0, 0);
      sun.castShadow = true;
      var ms = Math.min(4096, renderer.capabilities.maxTextureSize || 2048);
      sun.shadow.mapSize.set(ms >= 4096 ? 3072 : 2048, ms >= 4096 ? 3072 : 2048);
      var sc = sun.shadow.camera; sc.left = -95; sc.right = 95; sc.top = 78; sc.bottom = -78; sc.near = 10; sc.far = 300;
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06; sun.shadow.radius = 3;
      scene.add(sun); scene.add(sun.target);

      // world
      buildGraph();
      buildGround(scene); buildPads(scene); buildRoads(scene); buildDecor(scene);
      buildBuildings(scene);
      buildGate(scene, 'customers', -56); buildGate(scene, 'vendors', 56);
      addAmbient(scene);
      buildSpots();
      applyLabels();

      // controls
      if (T.OrbitControls) {
        var ctl = (S.controls = new T.OrbitControls(camera, S.dom));
        ctl.enableDamping = true; ctl.dampingFactor = 0.09;
        ctl.minPolarAngle = 35 * Math.PI / 180; ctl.maxPolarAngle = 65 * Math.PI / 180;
        ctl.minDistance = 40; ctl.maxDistance = 300;
        ctl.screenSpacePanning = false; ctl.rotateSpeed = 0.6; ctl.panSpeed = 0.9; ctl.zoomSpeed = 0.9;
        ctl.addEventListener('start', function () { S.tweens = []; S.dragging = true; });
        ctl.addEventListener('end', function () { S.dragging = false; });
      }
      applyView(new T.Vector3(TARGET0[0], TARGET0[1], TARGET0[2]), new T.Spherical(defaultDist(), DEF_POLAR, DEF_AZ));

      // pointer
      var down = null;
      S.dom.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; });
      S.dom.addEventListener('pointermove', function (e) {
        var r = S.dom.getBoundingClientRect();
        S.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        S.hoverDirty = e.buttons === 0;
      });
      S.dom.addEventListener('pointerleave', function () { S.hoverDirty = false; setHover(null); });
      S.dom.addEventListener('click', function (e) {
        if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
        var r = S.dom.getBoundingClientRect();
        S.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        select(pick());
      });

      if (typeof ResizeObserver !== 'undefined') { S.ro = new ResizeObserver(resize); S.ro.observe(containerEl); }
      else window.addEventListener('resize', resize);
      resize();
      applyView(new T.Vector3(TARGET0[0], TARGET0[1], TARGET0[2]), new T.Spherical(defaultDist(), DEF_POLAR, DEF_AZ));

      S.ready = true;
      if (S.teamData) applyTeam(S.teamData);
      watchFonts();
      frame();
      return true;
    } catch (err) {
      console.error('[LW.world] init failed', err);
      try { if (S.dom && S.dom.parentNode) S.dom.parentNode.removeChild(S.dom); } catch (e2) { /* ignore */ }
      S.ready = false;
      return false;
    }
  }

  LW.world = {
    init: init,
    setInsets: setInsets,
    on: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
    off: function (ev, fn) { handlers[ev] = (handlers[ev] || []).filter(function (f) { return f !== fn; }); },
    flow: flow,
    pulse: function (id, color) { pulse(id, color, false); },
    setStatus: setStatus,
    setBadge: setBadge,
    focus: focus,
    zoom: zoom,
    rotate: rotate,
    resetView: resetView,
    getBuildingIds: function () { return IDS.slice(); },
    // v2
    setLabels: setLabels,
    setTeam: setTeam,
    walk: walk,
    screenPos: screenPos,
    labelScreenPos: labelScreenPos,
    onFrame: onFrame,
    highlightMember: highlightMember,
    getMemberIds: function () { return Object.keys(S.team); },
    // extras (not in the contract)
    getEndpointIds: function () { return ENDPOINTS.slice(); },
    select: select,
    setTimeScale: function (m) { S.timeScale = clamp(Number(m) || 1, 0.1, 4); },
    isReady: function () { return S.ready; },
    _state: S
  };
})();
