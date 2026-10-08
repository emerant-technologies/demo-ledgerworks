/* LedgerWorks guided tour (LW.demo).
 * Async step runner on a pausable virtual clock. Drives the real UI through the
 * data-demo hooks, LW.ui, LW.world and LW.engine. See SPEC2.md "demo.js / demo.css".
 * Plain script, no modules. */
(function () {
  'use strict';
  var LW = window.LW = window.LW || {};

  var TOTAL_MS = 180000;
  var ABORT = { abort: true };
  var REDO = { redo: true };

  // ------------------------------------------------------------------ helpers
  function warn() {
    try { console.warn.apply(console, ['[demo]'].concat([].slice.call(arguments))); } catch (e) { /* ignore */ }
  }
  function L(en, bg) { return { en: en, bg: bg }; }
  function lang() {
    var l = (LW.i18n && LW.i18n.lang) || (LW.ui && LW.ui.getLang && LW.ui.getLang()) || 'en';
    return l === 'bg' ? 'bg' : 'en';
  }
  function tx(o) { return o ? (o[lang()] || o.en || '') : ''; }
  function ui() { return LW.ui || {}; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function mmss(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }

  // ------------------------------------------------------------------ text
  var UI_TXT = {
    label: L('Guided tour', 'Екскурзия'),
    pause: L('Pause', 'Пауза'),
    resume: L('Resume', 'Продължи'),
    restart: L('Restart', 'Отначало'),
    exit: L('Exit tour', 'Изход'),
    exitQ: L('Exit the guided tour?', 'Изход от екскурзията?'),
    exitText: L('The tour stops and you keep exploring on your own. You can start it again from the Guided tour button.',
      'Екскурзията спира и продължавате сами. Можете да я пуснете отново от бутона „Екскурзия“.'),
    exitStay: L('Continue tour', 'Продължи екскурзията'),
    exitYes: L('Exit tour', 'Изход'),
    pauseQ: L('Pause the guided tour?', 'Пауза на екскурзията?'),
    pauseText: L('The tour freezes where it is and you can click around freely. Press Resume in the top bar to continue.',
      'Екскурзията спира на текущото място и можете свободно да разглеждате. Натиснете „Продължи“ в горната лента, за да продължите.'),
    pauseStay: L('Continue tour', 'Продължи екскурзията'),
    pauseYes: L('Pause tour', 'Пауза'),
    done: L('Tour complete', 'Екскурзията приключи'),
    chip: L('Guided tour', 'Екскурзия'),
    pausedTitle: L('Paused', 'На пауза'),
    pausedText: L('Paused — explore freely, press Resume to continue.',
      'На пауза — разгледайте свободно, натиснете „Продължи“.')
  };

  // Scene definitions are filled in below (names + budgets in ms; sum = 180000).
  var CAPS = {
    welcome: [L('Welcome to LedgerWorks', 'Добре дошли в LedgerWorks'),
      L('Every building is a real accounting process. Vans, drones and people carry documents and cash whenever a transaction posts.',
        'Всяка сграда е реален счетоводен процес. Камиони, дронове и хора превозват документи и пари при всяко осчетоводяване.')],
    welcome2: [L('A living finance campus', 'Живо финансово градче'),
      L('The General Ledger tower in the middle receives every posting. Let us look at the numbers first.',
        'Кулата на Главната книга в средата получава всяка операция. Първо да видим числата.')],
    kpi: [L('Live KPIs', 'Показатели на живо'),
      L('Four numbers a controller watches every day. They update with every posting.',
        'Четири числа, които финансовият контрольор следи всеки ден. Обновяват се при всяка операция.')],
    kpiCash: [L('Cash', 'Парични средства'),
      L('What is in the bank right now.', 'Какво има по банковите сметки в момента.')],
    kpiAr: [L('Receivables and DSO', 'Вземания и DSO'),
      L('Money customers owe us, and how many days they take to pay.',
        'Парите, които клиентите ни дължат, и за колко дни плащат.')],
    kpiNi: [L('Net income', 'Нетна печалба'),
      L('Profit for the month so far, with the gross margin underneath.',
        'Печалбата за месеца до момента, с брутния марж отдолу.')],
    kpiCr: [L('Current ratio', 'Текуща ликвидност'),
      L('Can we pay short-term debts? Above 1.5 is comfortable.',
        'Можем ли да покрием краткосрочните задължения? Над 1,5 е комфортно.')],
    team: [L('Meet the finance team', 'Запознайте се с финансовия екип'),
      L('Seven accountants, each owning a process. This panel shows what everyone is doing right now.',
        'Седем счетоводители, всеки отговаря за процес. Панелът показва с какво се занимава всеки в момента.')],
    teamClick: [L('Click a person', 'Щракнете върху човек'),
      L('The camera flies straight to their desk.', 'Камерата ви отвежда право до работното му място.')],
    salesOpen: [L('Post a real entry', 'Осчетоводете реална операция'),
      L('Let us record a credit sale. Start by opening the Sales building.',
        'Нека запишем продажба на изплащане. Започваме с отварянето на сградата Продажби.')],
    salesPractice: [L('Sales and Billing', 'Продажби и фактуриране'),
      L('The inspector shows this process. Practice entry opens a real scenario from the accounting engine.',
        'Инспекторът показва този процес. „Упражнение“ отваря реален казус от счетоводния модул.')],
    salesBuild: [L('Build the entry line by line', 'Съставяне на статията ред по ред'),
      L('Pick each account by its code, then enter the amount as a debit or a credit.',
        'Избирайте всяка сметка по код, после въведете сумата като дебит или кредит.')],
    salesWrong: [L('A deliberate mistake', 'Нарочна грешка'),
      L('First we type a wrong amount, to see how feedback works.',
        'Първо въвеждаме грешна сума, за да видим как работи обратната връзка.')],
    salesFeedback: [L('Feedback, not the answer', 'Подсказка, а не отговор'),
      L('Check tells you which part is off without giving the solution away.',
        'Проверката показва къде е проблемът, без да издава решението.')],
    salesFix: [L('Fix and check again', 'Поправка и нова проверка'),
      L('Now the right amount, so debits equal credits.',
        'Сега е вярната сума, така че дебитът е равен на кредита.')],
    salesDone: [L('Correct, and posted!', 'Вярно и осчетоводено!'),
      L('Watch the invoice van and the entry drone carry it to the General Ledger. Your XP just went up.',
        'Гледайте как камионът с фактурата и дронът със статията я носят до Главната книга. Точките ви се увеличиха.')],
    ar: [L('Receivables aging', 'Възрастов анализ на вземанията'),
      L('Open invoices grouped by age: 0–30, 31–60, 61–90 and 90+ days. The older the bucket, the higher the risk of not being paid.',
        'Неплатените фактури по възраст: 0–30, 31–60, 61–90 и над 90 дни. Колкото по-стара е групата, толкова по-голям е рискът от неплащане.')],
    close: [L('Month-end close', 'Месечно приключване'),
      L('Six steps close the books. Next is Accruals: wages earned in October but not yet paid.',
        'Шест стъпки приключват периода. Следват начисленията: заплати, изработени през октомври, но още неплатени.')],
    closeEntry: [L('Accrue the wages', 'Начисляване на заплатите'),
      L('Debit wages expense, credit wages payable. The cost belongs to the month it was earned.',
        'Дебит разходи за заплати, кредит задължения към персонала. Разходът принадлежи на месеца, в който е възникнал.')],
    closeDone: [L('Step complete', 'Стъпката е завършена'),
      L('The tracker moves on and the entry flows into the ledger.',
        'Проследяването преминава напред, а статията тръгва към Главната книга.')],
    map: [L('Map controls', 'Управление на картата'),
      L('Rotate, zoom and reset the view to inspect any corner of the campus.',
        'Завъртайте, приближавайте и връщайте изгледа, за да разгледате всяко кътче на градчето.')],
    cashOpen: [L('Treasury', 'Парични средства'),
      L('Ana watches the cash. Every customer receipt and vendor payment lands here.',
        'Ана следи паричните средства. Всяко плащане от клиент и към доставчик минава оттук.')],
    cashInspect: [L('Cash position', 'Парична позиция'),
      L('Bank balance, money coming in from customers and bills due soon, in one place.',
        'Салдо по сметката, очаквани постъпления от клиенти и предстоящи плащания на едно място.')],
    depr: [L('Depreciation', 'Амортизация'),
      L('Stuck? Open the depreciation step. Hint nudges you, Show answer reveals the entry.',
        'Затруднение? Отворете стъпката Амортизация. „Подсказка“ ви насочва, а „Покажи отговора“ разкрива статията.')],
    deprHint: [L('Use the hint', 'Използвайте подсказката'),
      L('A gentle nudge in the right direction.', 'Лек тласък в правилната посока.')],
    deprAnswer: [L('Show the answer', 'Покажи отговора'),
      L('Debit depreciation expense, credit accumulated depreciation. Equipment stays at cost.',
        'Дебит разход за амортизация, кредит натрупана амортизация. Оборудването остава по цена на придобиване.')],
    deprCheck: [L('Enter it and check', 'Въведете и проверете'),
      L('The answer is only a guide. We type the entry ourselves, then press Check.',
        'Отговорът е само ориентир. Сами въвеждаме статията и натискаме \u201EПроверка\u201C.')],
    tb: [L('Trial balance', 'Оборотна ведомост'),
      L('Total debits equal total credits. The green tick confirms the books are in balance after every posting.',
        'Общият дебит е равен на общия кредит. Зелената отметка потвърждава, че книгите са балансирани след всяка операция.')],
    work: [L('The team at work', 'Екипът в движение'),
      L('Watch accountants carry invoices, bills and reports between buildings. Every task lands in the activity feed.',
        'Гледайте как счетоводителите носят фактури, документи и отчети между сградите. Всяка задача се появява в хронологията.')],
    finale: [L('Your turn!', 'Вашият ред!'),
      L('That is the tour. Click any building, practice an entry and close the month. LedgerWorks is built by Emerant Technologies.',
        'Това беше всичко. Щракнете върху сграда, упражнете статия и приключете месеца. LedgerWorks е създаден от Emerant Technologies.')]
  };

  // ------------------------------------------------------------------ state
  var S = {
    built: false, running: false, paused: false, userPaused: false, done: false,
    gen: 0, vt: 0, last: 0, raf: 0, waiters: [], resumeQ: [],
    idx: -1, base: 0, budget: 0, sceneT0: 0, redo: false, expect: {},
    cx: -100, cy: -100, startLang: 'en', curCap: null, curCapKey: null,
    shownLang: null, hoverT: 0, sceneName: null, progressMs: 0, startIdx: 0
  };
  var els = {};

  // ------------------------------------------------------------------ DOM
  function build() {
    if (S.built) return;
    S.built = true;
    var b = document.body;

    els.cursor = document.createElement('div');
    els.cursor.id = 'lw-demo-cursor';
    els.cursor.setAttribute('aria-hidden', 'true');
    els.cursor.innerHTML = '<div class="ld-halo"></div><div class="ld-press">' +
      '<svg viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg"><path d="M3 3 L3 31 L10.2 24.6 L15.4 37 L21.2 34.6 L16 22.4 L26 22 Z" fill="#0b1020" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/></svg></div>';
    b.appendChild(els.cursor);

    els.spot = document.createElement('div'); els.spot.id = 'lw-demo-spot'; els.spot.setAttribute('aria-hidden', 'true'); b.appendChild(els.spot);
    els.keys = document.createElement('div'); els.keys.id = 'lw-demo-keys'; els.keys.setAttribute('aria-hidden', 'true'); b.appendChild(els.keys);

    els.cap = document.createElement('div');
    els.cap.id = 'lw-demo-cap';
    els.cap.setAttribute('role', 'status');
    els.cap.innerHTML = '<div class="ld-cap-top"><span class="ld-cap-step"></span><span class="ld-cap-title"></span></div><div class="ld-cap-text"></div>';
    b.appendChild(els.cap);
    els.capStep = els.cap.querySelector('.ld-cap-step');
    els.capTitle = els.cap.querySelector('.ld-cap-title');
    els.capText = els.cap.querySelector('.ld-cap-text');

    els.bar = document.createElement('div');
    els.bar.id = 'lw-demo-bar';
    els.bar.setAttribute('role', 'region');
    els.bar.innerHTML =
      '<span class="ld-badge"><span class="ld-dot"></span><span class="ld-lbl" data-k="label"></span></span>' +
      '<button type="button" data-act="pause"></button>' +
      '<button type="button" data-act="restart"></button>' +
      '<span class="ld-prog"><i></i></span><span class="ld-time">0:00 / 3:00</span>' +
      '<span class="ld-scene"></span>' +
      '<button type="button" data-act="exit"></button>';
    b.appendChild(els.bar);
    els.pauseBtn = els.bar.querySelector('[data-act="pause"]');
    els.restartBtn = els.bar.querySelector('[data-act="restart"]');
    els.exitBtn = els.bar.querySelector('[data-act="exit"]');
    els.lbl = els.bar.querySelector('[data-k="label"]');
    els.progFill = els.bar.querySelector('.ld-prog i');
    els.time = els.bar.querySelector('.ld-time');
    els.sceneEl = els.bar.querySelector('.ld-scene');
    els.bar.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!btn) return;
      var a = btn.getAttribute('data-act');
      if (a === 'pause') { if (S.paused) resume(); else confirmPause(); }
      else if (a === 'restart') restart();
      else if (a === 'exit') confirmExit();
    });

    els.chip = document.createElement('button');
    els.chip.id = 'lw-demo-chip';
    els.chip.type = 'button';
    els.chip.hidden = true;
    els.chip.addEventListener('click', function () { restart(); });
    b.appendChild(els.chip);

    // auto-pause on trusted pointerdown outside the bar
    document.addEventListener('pointerdown', function (e) {
      if (!S.running || S.paused || S.done || !e.isTrusted) return;
      var t = e.target;
      if (t && t.closest && t.closest('#lw-demo-bar, #lw-demo-chip, #lw-demo-confirm, .em-welcome-wrap')) return;
      confirmPause();
    }, true);

    renderBarText();
  }

  function renderBarText() {
    if (!S.built) return;
    els.lbl.textContent = tx(UI_TXT.label);
    els.pauseBtn.textContent = S.paused ? '▶ ' + tx(UI_TXT.resume) : '⏸ ' + tx(UI_TXT.pause);
    els.restartBtn.textContent = '⟲ ' + tx(UI_TXT.restart);
    els.exitBtn.textContent = '✕ ' + tx(UI_TXT.exit);
    els.chip.textContent = '▶ ' + tx(UI_TXT.chip);
    els.bar.setAttribute('aria-label', tx(UI_TXT.label));
    var sn = S.done ? UI_TXT.done : S.sceneName;
    els.sceneEl.textContent = sn ? tx(sn) : '';
  }

  function renderCaption(animate) {
    if (!S.built) return;
    var c = S.curCap;
    if (S.paused && S.userPaused) {
      els.cap.classList.add('paused');
      els.capStep.textContent = '⏸';
      els.capTitle.textContent = tx(UI_TXT.pausedTitle);
      els.capText.textContent = tx(UI_TXT.pausedText);
      els.cap.classList.add('on');
      return;
    }
    els.cap.classList.remove('paused');
    if (!c) { els.cap.classList.remove('on'); return; }
    var apply = function () {
      els.capStep.textContent = (S.idx >= 0 ? (S.idx + 1) + '/' + SCENES.length : '');
      els.capTitle.textContent = tx(c[0]);
      els.capText.textContent = tx(c[1]);
      els.cap.classList.remove('swap');
    };
    els.cap.classList.add('on');
    if (animate && els.cap.classList.contains('on')) {
      els.cap.classList.add('swap');
      setTimeout(apply, 170);
    } else apply();
  }

  // side: 'center' (default) | 'left' | 'right' keeps the caption off the panel the scene is pointing at
  function capSide(side) {
    if (!S.built) return;
    els.cap.classList.toggle('side-left', side === 'left');
    els.cap.classList.toggle('side-right', side === 'right');
  }

  function setCaption(key) {
    var c = CAPS[key];
    if (!c) { warn('unknown caption', key); return; }
    S.curCap = c; S.curCapKey = key;
    renderCaption(true);
  }

  // ------------------------------------------------------------------ clock
  function tick(ts) {
    S.raf = requestAnimationFrame(tick);
    var dt = S.last ? Math.min(ts - S.last, 100) : 16;
    S.last = ts;
    if (S.running && !S.paused) {
      S.vt += dt;
      var ws = S.waiters.slice();
      for (var i = 0; i < ws.length; i++) {
        var w = ws[i];
        var p = w.ms > 0 ? Math.min(1, (S.vt - w.s) / w.ms) : 1;
        if (w.cb) { try { w.cb(p); } catch (e) { warn('tween error', e && e.message); } }
        if (p >= 1) {
          var k = S.waiters.indexOf(w);
          if (k >= 0) S.waiters.splice(k, 1);
          w.res();
        }
      }
    }
    if (S.built && S.running) {
      var cur = lang();
      if (cur !== S.shownLang) { S.shownLang = cur; renderBarText(); renderCaption(false); }
      updateProgress();
      placeCaption();
    }
  }

  // keep the caption clear of an open practice modal (the modal grows with hint/answer panels)
  function placeCaption() {
    var top = null;
    try {
      var m = document.querySelector('[data-demo="modal"]');
      if (m && els.cap.classList.contains('on') && !els.cap.classList.contains('side-left') && !els.cap.classList.contains('side-right')) {
        var r = m.getBoundingClientRect();
        if (r.width > 0) {
          var h = els.cap.offsetHeight || 84;
          if (r.bottom + 14 + h <= window.innerHeight - 6) top = r.bottom + 14;
          else if (r.top - h - 14 >= 104) top = r.top - h - 14;
        }
      }
    } catch (e) { /* ignore */ }
    if (top !== null) { els.cap.style.top = Math.round(top) + 'px'; els.cap.style.bottom = 'auto'; }
    else { els.cap.style.top = ''; els.cap.style.bottom = ''; }
  }

  function updateProgress() {
    var ms;
    if (S.done) ms = TOTAL_MS;
    else ms = S.base + Math.min(Math.max(S.vt - S.sceneT0, 0), S.budget);
    ms = clamp(ms, 0, TOTAL_MS);
    S.progressMs = ms;
    els.progFill.style.width = (ms / TOTAL_MS * 100).toFixed(2) + '%';
    els.time.textContent = mmss(ms) + ' / 3:00';
  }

  function sleep(ms, cb) {
    return new Promise(function (res) {
      if (!S.running) { res(); return; }
      S.waiters.push({ s: S.vt, ms: ms, cb: cb, res: res });
    });
  }
  function flushWaiters() {
    var ws = S.waiters; S.waiters = [];
    ws.forEach(function (w) { try { if (w.cb) w.cb(1); } catch (e) { /* ignore */ } w.res(); });
  }
  function chk(g) {
    if (g !== S.gen || !S.running) throw ABORT;
    if (S.redo) throw REDO;
  }
  function untilResumed() {
    return new Promise(function (res) {
      if (!S.paused) { res(); return; }
      S.resumeQ.push(res);
    });
  }

  // ------------------------------------------------------------------ pause / resume
  function pause(byUser) {
    if (!S.running || S.paused || S.done) return;
    S.paused = true;
    S.userPaused = !!byUser;
    els.cursor.classList.add('dim');
    els.bar.classList.add('paused');
    renderBarText();
    renderCaption(false);
  }

  function resume() {
    if (!S.running || !S.paused) return;
    var redo = false;
    var e = S.expect || {};
    try {
      var u = ui();
      var open = u.isModalOpen ? !!u.isModalOpen() : false;
      if (e.modal) {
        if (!open) redo = true;
      } else if (e.modal === null && open && u.closeModal) {
        u.closeModal();
        open = false;
      }
      if (!redo && !open) {
        if (e.tab && u.setTab) u.setTab(e.tab);
        if (e.sel !== undefined) selectBuilding(e.sel);
      }
    } catch (err) { warn('resume validation failed', err && err.message); }
    S.redo = redo;
    S.paused = false;
    S.userPaused = false;
    els.cursor.classList.remove('dim');
    els.bar.classList.remove('paused');
    renderBarText();
    renderCaption(false);
    var q = S.resumeQ; S.resumeQ = [];
    q.forEach(function (f) { f(); });
    if (redo) flushWaiters();
  }

  // ------------------------------------------------------------------ element / target resolution
  function visible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    var cs = window.getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }
  function findDemo(key) {
    var list = document.querySelectorAll('[data-demo="' + key + '"]');
    for (var i = 0; i < list.length; i++) if (visible(list[i])) return list[i];
    return list.length ? list[0] : null;
  }
  function centerFallback() { return { x: window.innerWidth / 2, y: window.innerHeight / 2, el: null, ok: false }; }

  function worldPos(id) {
    try {
      if (LW.world && LW.world.screenPos) {
        var p = LW.world.screenPos(id);
        if (p && isFinite(p.x) && isFinite(p.y)) return p;
      }
    } catch (e) { warn('screenPos failed for', id, e && e.message); }
    return null;
  }

  // returns {x,y,el,ok,world}
  function resolve(target) {
    if (target && typeof target === 'object' && target.nodeType === 1) return fromEl(target);
    if (target && typeof target === 'object' && isFinite(target.x) && isFinite(target.y)) return { x: target.x, y: target.y, el: null, ok: true };
    if (typeof target === 'string') {
      var el = findDemo(target);
      if (el && visible(el)) return fromEl(el);
      var p = worldPos(target);
      if (p) return { x: p.x, y: p.y, el: null, ok: p.visible !== false, world: target };
      if (el) return fromEl(el);
    }
    return centerFallback();
  }
  function fromEl(el) {
    var r = el.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') x = r.left + Math.min(r.width / 2, 40);
    return { x: clamp(x, 6, window.innerWidth - 6), y: clamp(y, 6, window.innerHeight - 6), el: el, ok: r.width > 0 && r.height > 0 };
  }

  function selectBuilding(id) {
    var u = ui();
    try {
      if (u.selectBuilding) { u.selectBuilding(id); return true; }
      if (u.select) { u.select(id); return true; }
      if (LW.world && LW.world.select) { LW.world.select(id); return true; }
    } catch (e) { warn('selectBuilding failed', e && e.message); }
    return false;
  }

  // ------------------------------------------------------------------ cursor primitives
  function setCursor(x, y) {
    S.cx = x; S.cy = y;
    els.cursor.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    els.keys.style.transform = 'translate(' + (x + 30).toFixed(1) + 'px,' + (y + 38).toFixed(1) + 'px)';
  }

  function hoverCanvas(x, y) {
    // let the 3D world react to a hover under the fake cursor
    var now = S.vt;
    if (now - S.hoverT < 90) return;
    S.hoverT = now;
    try {
      var top = document.elementFromPoint(x, y);
      if (top && top.tagName === 'CANVAS') {
        var o = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
        top.dispatchEvent(new MouseEvent('mousemove', o));
        if (window.PointerEvent) top.dispatchEvent(new PointerEvent('pointermove', Object.assign({ pointerType: 'mouse', isPrimary: true }, o)));
      }
    } catch (e) { /* ignore */ }
  }

  function spot(el) {
    if (!el || !el.getBoundingClientRect) { els.spot.classList.remove('on'); return; }
    var r = el.getBoundingClientRect();
    if (r.width <= 0) { els.spot.classList.remove('on'); return; }
    els.spot.style.left = (r.left - 5) + 'px';
    els.spot.style.top = (r.top - 5) + 'px';
    els.spot.style.width = (r.width + 10) + 'px';
    els.spot.style.height = (r.height + 10) + 'px';
    els.spot.classList.add('on');
  }
  function unspot() { els.spot.classList.remove('on'); }

  async function moveTo(target, o) {
    o = o || {};
    var g = S.gen;
    chk(g);
    unspot();
    var t0 = resolve(target);
    if (!t0.ok && typeof target === 'string' && !t0.world) warn('target not found:', target);
    var fx = S.cx, fy = S.cy;
    if (fx < 0 && fy < 0) { fx = window.innerWidth * .5; fy = window.innerHeight * .86; setCursor(fx, fy); }
    els.cursor.classList.add('on');
    var dx0 = t0.x - fx, dy0 = t0.y - fy;
    var dist = Math.sqrt(dx0 * dx0 + dy0 * dy0);
    var dur = o.ms || clamp(520 + dist * 0.55, 650, 1100) * (0.92 + Math.random() * 0.16);
    var side = Math.random() < .5 ? -1 : 1;
    var bend = o.straight ? 0 : clamp(dist * 0.16, 12, 120) * side;
    await sleep(dur, function (p) {
      var t = resolve(target); // live: the camera may still be moving
      var ex = t.x, ey = t.y;
      var dx = ex - fx, dy = ey - fy;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len, ny = dx / len;
      var c1x = fx + dx * .28 + nx * bend, c1y = fy + dy * .28 + ny * bend;
      var c2x = fx + dx * .72 + nx * bend * .35, c2y = fy + dy * .72 + ny * bend * .35;
      var e = ease(p), u = 1 - e;
      var x = u * u * u * fx + 3 * u * u * e * c1x + 3 * u * e * e * c2x + e * e * e * ex;
      var y = u * u * u * fy + 3 * u * u * e * c1y + 3 * u * e * e * c2y + e * e * e * ey;
      setCursor(x, y);
      hoverCanvas(x, y);
    });
    chk(g);
    var fin = resolve(target);
    setCursor(fin.x, fin.y);
    if (o.spot !== false && fin.el && o.spot) spot(fin.el);
    return fin;
  }

  function ripple(x, y) {
    ['', 'b'].forEach(function (cls) {
      var r = document.createElement('div');
      r.className = 'lw-demo-ripple ' + cls;
      r.style.left = x + 'px'; r.style.top = y + 'px';
      document.body.appendChild(r);
      setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 950);
    });
  }

  function fire(el, type, x, y) {
    var o = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0, buttons: /down$/.test(type) ? 1 : 0 };
    var ev;
    try {
      if (/^pointer/.test(type) && window.PointerEvent) ev = new PointerEvent(type, Object.assign({ pointerType: 'mouse', isPrimary: true, pointerId: 1 }, o));
      else ev = new MouseEvent(type, o);
    } catch (e) { ev = new MouseEvent(type.replace('pointer', 'mouse'), o); }
    el.dispatchEvent(ev);
  }

  function pressAt(el, x, y) {
    var tag = (el.tagName || '').toLowerCase();
    fire(el, 'pointerdown', x, y);
    fire(el, 'mousedown', x, y);
    if ((tag === 'input' || tag === 'textarea' || tag === 'select') && el.focus) { try { el.focus(); } catch (e) { /* ignore */ } }
    fire(el, 'pointerup', x, y);
    fire(el, 'mouseup', x, y);
    fire(el, 'click', x, y);
  }

  // click(target): move there, press, ripple, dispatch. Buildings go through ui.selectBuilding.
  async function click(target, o) {
    o = o || {};
    var g = S.gen;
    var info = await moveTo(target, o);
    chk(g);
    await untilResumed();
    chk(g);
    info = resolve(target);
    setCursor(info.x, info.y);
    els.cursor.classList.add('down');
    ripple(info.x, info.y);
    await sleep(90);
    chk(g);
    var did = false;
    if (info.el) {
      pressAt(info.el, info.x, info.y);
      did = true;
    } else if (info.world && typeof target === 'string') {
      did = selectBuilding(target);
    } else if (info.ok) {
      var top = document.elementFromPoint(info.x, info.y);
      if (top) { pressAt(top, info.x, info.y); did = true; }
    }
    if (!did) warn('click had no effect on', typeof target === 'string' ? target : '(point)');
    await sleep(100);
    els.cursor.classList.remove('down');
    chk(g);
    return did;
  }

  function setNativeValue(el, v) {
    try {
      var proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      var d = Object.getOwnPropertyDescriptor(proto, 'value');
      if (d && d.set) { d.set.call(el, v); return; }
    } catch (e) { /* ignore */ }
    el.value = v;
  }
  function inputOf(el) {
    if (!el) return null;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return el;
    return el.querySelector ? el.querySelector('input,textarea') : null;
  }

  function showKeys(text, on) {
    if (on) {
      els.keys.innerHTML = '<b>⌨</b>' + escapeHtml(text) + '<i></i>';
      els.keys.classList.add('on');
    } else els.keys.classList.remove('on');
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // type(target, text): per char set value and dispatch input.
  async function type(target, text, msPerChar) {
    var g = S.gen;
    msPerChar = msPerChar || 90;
    text = String(text);
    var host = typeof target === 'string' ? findDemo(target) : target;
    var el = inputOf(host);
    if (!el) { warn('type: input not found:', typeof target === 'string' ? target : '(el)'); return false; }
    await untilResumed();
    chk(g);
    try { el.focus(); } catch (e) { /* ignore */ }
    if (el.value) { setNativeValue(el, ''); el.dispatchEvent(new Event('input', { bubbles: true })); }
    showKeys('', true);
    var shown = '';
    for (var i = 0; i < text.length; i++) {
      await sleep(msPerChar * (0.8 + Math.random() * 0.4));
      chk(g);
      await untilResumed();
      chk(g);
      shown += text[i];
      setNativeValue(el, shown);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      showKeys(shown, true);
    }
    await sleep(220);
    chk(g);
    showKeys('', false);
    return true;
  }

  async function wait(ms) {
    var g = S.gen;
    await sleep(ms);
    chk(g);
  }

  async function waitFor(key, timeout) {
    var g = S.gen, t = 0;
    timeout = timeout || 2500;
    for (;;) {
      var el = findDemo(key);
      if (el && visible(el)) return el;
      if (t >= timeout) return null;
      await sleep(100); chk(g); t += 100;
    }
  }

  function call(fn) {
    try { return fn(); } catch (e) { warn('call failed', e && e.message); return undefined; }
  }

  function expect(o) { S.expect = o || {}; }

  // ------------------------------------------------------------------ scenario helpers
  function getScenario(id) {
    try { return LW.engine && LW.engine.getScenario ? LW.engine.getScenario(id) : null; } catch (e) { return null; }
  }
  function rowCount() {
    return document.querySelectorAll('[data-demo^="line-"][data-demo$="-account"]').length;
  }
  function parseAmt(s) {
    s = String(s || '').replace(/[^0-9,.\-]/g, '');
    if (s.indexOf(',') >= 0 && s.indexOf('.') < 0) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
    return parseFloat(s) || 0;
  }
  function fmtAmt(n) {
    var r = Math.round(n * 100) / 100;
    return String(r);
  }
  function rowDone(i, line) {
    var a = inputOf(findDemo('line-' + i + '-account'));
    var f = inputOf(findDemo('line-' + i + '-' + (line.dr ? 'debit' : 'credit')));
    if (!a || !f) return false;
    if (String(a.value).indexOf(line.acct) < 0) return false;
    return Math.abs(parseAmt(f.value) - (line.dr || line.cr)) < 0.005;
  }

  async function fillRow(i, line, wrongValue, fast) {
    var g = S.gen;
    var aKey = 'line-' + i + '-account';
    if (!findDemo(aKey)) { warn('missing row', i); return; }
    var mv = fast ? { ms: 520 } : { ms: 700 };
    var cpc = fast ? 70 : 95;
    if (fast) await moveTo(aKey, mv); else await click(aKey, mv);
    await type(aKey, line.acct, cpc);
    await wait(fast ? 150 : 250);
    var opt = await waitFor('acct-opt-' + line.acct, 1800);
    if (opt) await click(opt, mv);
    else warn('account option not found:', line.acct);
    chk(g);
    var field = 'line-' + i + '-' + (line.dr ? 'debit' : 'credit');
    var amt = wrongValue !== undefined ? wrongValue : (line.dr || line.cr);
    await click(field, mv);
    await type(field, fmtAmt(amt), fast ? 80 : 100);
    await wait(fast ? 100 : 200);
  }

  // Type every line of a scenario. opts.wrong = {rows:[i..], value} types a deliberately wrong (but balanced) amount on those rows.
  async function fillLines(scId, opts) {
    opts = opts || {};
    var g = S.gen;
    var sc = getScenario(scId);
    if (!sc || !sc.lines) { warn('scenario not found:', scId); return null; }
    var lines = sc.lines;
    var guard = 0;
    while (rowCount() < lines.length && guard++ < 10) {
      var ok = await click('add-line');
      await wait(300);
      if (!ok) break;
    }
    for (var i = 0; i < lines.length; i++) {
      var wv = (opts.wrong && opts.wrong.rows.indexOf(i) >= 0) ? opts.wrong.value : undefined;
      await fillRow(i, lines[i], wv, i >= 2 || opts.fast);
      chk(g);
    }
    return lines;
  }

  // After "Show answer": make sure every row holds the right values, typing any that are missing.
  async function ensureFilled(scId) {
    var sc = getScenario(scId);
    if (!sc) return;
    var lines = sc.lines, guard = 0;
    while (rowCount() < lines.length && guard++ < 10) { await click('add-line'); await wait(300); }
    for (var i = 0; i < lines.length; i++) {
      if (!rowDone(i, lines[i])) await fillRow(i, lines[i], undefined, true);
    }
  }

  function resetUI() {
    var u = ui();
    call(function () { if (u.isModalOpen && u.isModalOpen() && u.closeModal) u.closeModal(); });
    call(function () { selectBuilding(null); });
  }

  // ------------------------------------------------------------------ scenes
  var SCENES = [];
  function scene(key, name, budgetMs, run) { SCENES.push({ key: key, name: name, budget: budgetMs, run: run }); }

  scene('welcome', L('Welcome', 'Добре дошли'), 12000, async function () {
    resetUI();
    call(function () { ui().setTab && ui().setTab('journal'); });
    call(function () { LW.world && LW.world.resetView && LW.world.resetView(); });
    expect({ modal: null });
    setCaption('welcome');
    await wait(900);
    await moveTo('ledger');
    await wait(900);
    call(function () { LW.world && LW.world.rotate && LW.world.rotate(0.35); });
    await moveTo('sales');
    await wait(500);
    setCaption('welcome2');
    await moveTo('bank');
    await wait(500);
    await moveTo('reporting');
  });

  scene('kpi', L('Live KPIs', 'Показатели на живо'), 16000, async function () {
    resetUI();
    expect({ modal: null });
    setCaption('kpi');
    await wait(1200);
    var ks = [['kpi-cash', 'kpiCash'], ['kpi-ar', 'kpiAr'], ['kpi-ni', 'kpiNi'], ['kpi-cr', 'kpiCr']];
    for (var i = 0; i < ks.length; i++) {
      var el = findDemo(ks[i][0]);
      if (!el) { warn('missing KPI card', ks[i][0]); continue; }
      setCaption(ks[i][1]);
      await moveTo(ks[i][0], { spot: true });
      await wait(2300);
    }
    unspot();
  });

  scene('team', L('Finance team', 'Финансов екип'), 14000, async function () {
    resetUI();
    call(function () { ui().showTeam && ui().showTeam(); });
    expect({ modal: null });
    await wait(700);
    setCaption('team');
    await moveTo('team-panel', { spot: true });
    await wait(1500);
    await moveTo('team-member-elena', { spot: true });
    await wait(1000);
    await moveTo('team-member-georgi', { spot: true });
    await wait(1000);
    setCaption('teamClick');
    await click('team-member-maria');
    unspot();
    await wait(3500);
  });

  scene('sales', L('Post an entry', 'Осчетоводяване'), 44000, async function () {
    var SC = 'sales-credit-sale';
    resetUI();
    expect({ modal: null });
    setCaption('salesOpen');
    await wait(500);
    await click('sales');
    expect({ sel: 'sales', modal: null });
    await wait(1500);
    setCaption('salesPractice');
    call(function () { ui().queueScenario && ui().queueScenario(SC); });
    var opened = await click('inspector-practice');
    var m = opened ? await waitFor('modal', 3000) : null;
    if (!m) {
      warn('practice modal did not open; opening via LW.ui');
      call(function () { ui().openPractice && ui().openPractice(SC); });
      await wait(700);
    }
    expect({ modal: SC });
    await wait(1800);
    setCaption('salesBuild');
    await wait(900);
    var sc = getScenario(SC);
    var wrongVal = sc && sc.lines && sc.lines[0] ? Math.round((sc.lines[0].dr || sc.lines[0].cr) * 0.875) : 4200;
    setCaption('salesWrong');
    await fillLines(SC, { wrong: { rows: [0, 1], value: wrongVal } });
    await wait(500);
    await click('check');
    await wait(900);
    setCaption('salesFeedback');
    await moveTo('feedback', { spot: true });
    await wait(2800);
    unspot();
    setCaption('salesFix');
    for (var fi = 0; fi < 2; fi++) {
      var fl = sc && sc.lines ? sc.lines[fi] : null;
      if (!fl) continue;
      var fKey = 'line-' + fi + '-' + (fl.dr ? 'debit' : 'credit');
      await click(fKey);
      await type(fKey, fmtAmt(fl.dr || fl.cr), 100);
      await wait(250);
    }
    await click('check');
    await wait(1100);
    setCaption('salesDone');
    expect({});
    await wait(1700);
    if (ui().isModalOpen && ui().isModalOpen()) {
      if (findDemo('modal-close')) await click('modal-close');
      else call(function () { ui().closeModal && ui().closeModal(); });
    }
    expect({ modal: null });
    call(function () { LW.world && LW.world.focus && LW.world.focus('sales'); });
    await wait(1500);
  });

  scene('ar', L('AR aging', 'Възрастов анализ'), 11000, async function () {
    resetUI();
    expect({ modal: null, tab: 'ar' });
    capSide('left');
    setCaption('ar');
    await click('tab-ar');
    await wait(900);
    await moveTo('table', { spot: true });
    await wait(1200);
    // sweep along the table so the buckets are followed
    var tbl = findDemo('table');
    if (tbl) {
      var r = tbl.getBoundingClientRect();
      await moveTo({ x: r.left + r.width * .75, y: r.top + r.height * .6 }, { ms: 1400, straight: true });
    }
    await wait(1000);
    unspot();
  });

  scene('close', L('Month-end close', 'Месечно приключване'), 23000, async function () {
    var SC = 'payroll-accrue-wages';
    resetUI();
    expect({ modal: null });
    capSide('right');
    setCaption('close');
    await moveTo('close-tracker', { spot: true });
    await wait(2200);
    unspot();
    var okc = await click('close-step-accruals');
    var m = okc ? await waitFor('modal', 3000) : null;
    if (!m) {
      warn('close step did not open modal; opening via LW.ui');
      call(function () { ui().openPractice && ui().openPractice(SC); });
      await wait(700);
    }
    expect({ modal: SC });
    setCaption('closeEntry');
    await wait(900);
    await fillLines(SC, { fast: true });
    await wait(300);
    await click('check');
    await wait(1100);
    setCaption('closeDone');
    expect({});
    await wait(1600);
    if (ui().isModalOpen && ui().isModalOpen()) {
      if (findDemo('modal-close')) await click('modal-close');
      else call(function () { ui().closeModal && ui().closeModal(); });
    }
    expect({ modal: null });
    await wait(500);
  });

  scene('map', L('Map controls', 'Управление на картата'), 9000, async function () {
    resetUI();
    expect({ modal: null });
    setCaption('map');
    await click('map-rotate-left');
    await wait(600);
    await click('map-zoom-in');
    await wait(700);
    await click('map-zoom-out');
    await wait(500);
    await click('map-rotate-right');
    await wait(500);
    await click('map-home');
  });

  scene('cash', L('Treasury', 'Парични средства'), 9000, async function () {
    resetUI();
    expect({ modal: null });
    setCaption('cashOpen');
    await wait(400);
    await click('bank');
    expect({ sel: 'bank', modal: null });
    await wait(1600);
    setCaption('cashInspect');
    await moveTo('inspector', { spot: true });
    await wait(3600);
    unspot();
  });

  scene('depr', L('Hint and answer', 'Подсказка и отговор'), 20000, async function () {
    var SC = 'ledger-depreciation';
    resetUI();
    expect({ modal: null });
    setCaption('depr');
    var okc = await click('close-step-depreciation');
    var m = okc ? await waitFor('modal', 3000) : null;
    if (!m) {
      warn('close step did not open modal; opening via LW.ui');
      call(function () { ui().openPractice && ui().openPractice(SC); });
      await wait(700);
    }
    expect({ modal: SC });
    await wait(900);
    setCaption('deprHint');
    await click('hint');
    await wait(1600);
    setCaption('deprAnswer');
    await click('show-answer');
    await wait(1000);
    setCaption('deprCheck');
    await ensureFilled(SC);
    await wait(300);
    await click('check');
    await wait(1400);
    expect({});
    if (ui().isModalOpen && ui().isModalOpen()) {
      if (findDemo('modal-close')) await click('modal-close');
      else call(function () { ui().closeModal && ui().closeModal(); });
    }
    expect({ modal: null });
  });

  scene('tb', L('Trial balance', 'Оборотна ведомост'), 8000, async function () {
    resetUI();
    expect({ modal: null, tab: 'tb' });
    capSide('left');
    setCaption('tb');
    await click('tab-tb');
    await wait(700);
    await moveTo('table', { spot: true });
    await wait(2800);
    unspot();
  });

  scene('work', L('Team at work', 'Екипът в движение'), 8000, async function () {
    resetUI();
    expect({ modal: null });
    call(function () { ui().showTeam && ui().showTeam(); });
    call(function () { LW.world && LW.world.resetView && LW.world.resetView(); });
    setCaption('work');
    await moveTo('team-feed', { spot: true });
    await wait(3500);
    unspot();
    await moveTo({ x: window.innerWidth * .45, y: window.innerHeight * .42 });
  });

  scene('finale', L('Your turn', 'Вашият ред'), 6000, async function () {
    resetUI();
    expect({ modal: null });
    setCaption('finale');
    await wait(4600);
    els.cursor.classList.remove('on');
    await wait(900);
  });

  // ------------------------------------------------------------------ runner
  async function runScene(sc) {
    var g = S.gen;
    capSide('center');
    for (;;) {
      S.redo = false;
      try {
        await sc.run();
        break;
      } catch (e) {
        if (e === REDO) { if (g !== S.gen || !S.running) throw ABORT; warn('re-running scene after resume:', sc.key); resetUIQuiet(); continue; }
        throw e;
      }
    }
    expect({});
    var left = sc.budget - (S.vt - S.sceneT0);
    if (left > 0) await wait(left);
  }
  function resetUIQuiet() { /* scene bodies reset their own state */ }

  async function main(g, from) {
    S.running = true;
    for (var i = from; i < SCENES.length; i++) {
      if (g !== S.gen) return;
      var sc = SCENES[i];
      S.idx = i;
      var base = 0;
      for (var k = 0; k < i; k++) base += SCENES[k].budget;
      S.base = base; S.budget = sc.budget; S.sceneT0 = S.vt;
      S.sceneName = sc.name;
      renderBarText();
      try { await runScene(sc); }
      catch (e) {
        if (e === ABORT) return;
        warn('scene "' + sc.key + '" failed:', e && e.message ? e.message : e);
      }
    }
    if (g !== S.gen) return;
    finish();
  }

  function finish() {
    S.done = true;
    S.paused = false;
    S.sceneName = null;
    S.curCap = null;
    els.bar.classList.add('done');
    els.bar.classList.remove('paused');
    els.cursor.classList.remove('on');
    unspot(); showKeys('', false);
    updateProgress();
    renderBarText();
    // keep the final caption visible for a moment, then let it go
    setTimeout(function () { if (S.done && els.cap) els.cap.classList.remove('on'); }, 6000);
  }

  // ------------------------------------------------------------------ public control
  function start(opts) {
    opts = opts || {};
    build();
    if (S.running) teardownRun();
    S.gen++;
    S.vt = 0; S.waiters = []; S.resumeQ = [];
    S.paused = false; S.userPaused = false; S.done = false; S.redo = false;
    S.expect = {}; S.idx = -1; S.base = 0; S.budget = 0; S.sceneT0 = 0;
    S.startLang = lang();
    S.shownLang = lang();
    els.bar.hidden = false; els.chip.hidden = true;
    els.bar.classList.remove('paused', 'done');
    els.cursor.classList.remove('dim', 'down');
    S.cx = -100; S.cy = -100;
    S.running = true;
    var from = clamp((opts.scene | 0) > 0 ? (opts.scene | 0) - 1 : 0, 0, SCENES.length - 1);
    S.startIdx = from;
    renderBarText();
    if (!S.raf) S.raf = requestAnimationFrame(tick);
    main(S.gen, from);
  }

  function teardownRun() {
    S.gen++;
    S.running = false;
    flushWaiters();
    var q = S.resumeQ; S.resumeQ = []; q.forEach(function (f) { f(); });
  }

  // Shared confirmation dialog. The tour is frozen while it is open.
  function confirmBox(o) {
    var old = document.getElementById('lw-demo-confirm');
    if (old) old.remove();
    var d = document.createElement('div');
    d.id = 'lw-demo-confirm';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.innerHTML =
      '<div class="ldc-card">' +
        '<div class="ldc-title"></div>' +
        '<div class="ldc-text"></div>' +
        '<div class="ldc-actions">' +
          '<button type="button" data-c="stay"></button>' +
          '<button type="button" data-c="go" class="ldc-danger"></button>' +
        '</div>' +
      '</div>';
    d.querySelector('.ldc-title').textContent = tx(o.title);
    d.querySelector('.ldc-text').textContent = tx(o.text);
    d.querySelector('[data-c="stay"]').textContent = tx(o.stay);
    d.querySelector('[data-c="go"]').textContent = tx(o.go);
    function close(go) {
      d.remove();
      document.removeEventListener('keydown', onKey, true);
      if (go) o.onGo(); else o.onStay();
    }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(false); } }
    d.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('[data-c]') : null;
      if (c) close(c.getAttribute('data-c') === 'go');
      else if (e.target === d) close(false);
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(d);
    d.querySelector('[data-c="stay"]').focus();
  }

  function confirmExit() {
    if (!S.running || S.done) { stop(); return; }
    var wasPaused = S.paused;
    if (!wasPaused) pause(true);
    confirmBox({
      title: UI_TXT.exitQ, text: UI_TXT.exitText, stay: UI_TXT.exitStay, go: UI_TXT.exitYes,
      onGo: stop,
      onStay: function () { if (!wasPaused) resume(); }
    });
  }

  // Freeze first so the cursor stops immediately, then ask whether to stay paused.
  function confirmPause() {
    if (!S.running || S.done || S.paused) return;
    pause(true);
    confirmBox({
      title: UI_TXT.pauseQ, text: UI_TXT.pauseText, stay: UI_TXT.pauseStay, go: UI_TXT.pauseYes,
      onGo: function () { /* stay paused */ },
      onStay: resume
    });
  }

  function stop() {
    if (!S.built) return;
    teardownRun();
    S.paused = false; S.done = false;
    S.curCap = null;
    els.cap.classList.remove('on', 'paused');
    els.cursor.classList.remove('on', 'dim', 'down');
    unspot(); showKeys('', false);
    els.bar.hidden = true;
    els.chip.hidden = false;
    renderBarText();
  }

  function restart() {
    var l = S.startLang || lang();
    var url;
    try { url = location.pathname + '?demo=1&lang=' + l; } catch (e) { url = '?demo=1'; }
    try { location.href = url; } catch (e2) { warn('restart failed', e2 && e2.message); }
  }

  LW.demo = {
    start: start,
    stop: stop,
    exit: stop,
    pause: function () { pause(false); },
    resume: resume,
    restart: restart,
    isRunning: function () { return S.running && !S.done; },
    isPaused: function () { return S.paused; },
    state: function () {
      return { running: S.running, paused: S.paused, done: S.done, scene: S.idx, sceneKey: S.idx >= 0 && SCENES[S.idx] ? SCENES[S.idx].key : null,
        progressMs: Math.round(S.progressMs), clockMs: Math.round(S.vt), caption: S.curCapKey };
    },
    scenes: function () { return SCENES.map(function (s) { return { key: s.key, budget: s.budget, name: s.name }; }); },
    totalMs: TOTAL_MS
  };

  // ------------------------------------------------------------------ autostart
  function param(name) {
    try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; }
  }
  function boot() {
    build();
    S.shownLang = lang();
    els.bar.hidden = true;
    if (param('demo') === '0') { els.chip.hidden = false; renderBarText(); return; }
    var waited = 0;
    setTimeout(function go() {
      var loading = document.body.classList.contains('loading');
      if (loading && waited < 8000) { waited += 250; setTimeout(go, 250); return; }
      // hold while the welcome modal is open; respect "explore on my own"
      var br = LW.brand;
      if (br && typeof br.welcomeOpen === 'function' && br.welcomeOpen()) { setTimeout(go, 250); return; }
      if (br && br.choice === 'explore') { els.chip.hidden = false; renderBarText(); return; }
      var sc = parseInt(param('scene'), 10);
      start({ scene: isFinite(sc) ? sc : 0 });
    }, 1500);
  }

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
