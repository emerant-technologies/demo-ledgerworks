/* LedgerWorks engine.js
 * Chart of accounts, double-entry ledger, scenarios + grading, background simulation, metrics.
 * No DOM, no THREE. Attaches to window.LW.engine.
 * All money is stored internally as integer cents.
 */
(function (root) {
  'use strict';
  var LW = root.LW = root.LW || {};

  // ---------------------------------------------------------------- helpers
  var BUILDINGS = ['sales', 'procure', 'warehouse', 'bank', 'payroll', 'ledger', 'reporting'];
  var BSET = {}; BUILDINGS.forEach(function (b) { BSET[b] = true; });

  function toC(x) { return Math.round(Number(x) * 100 + (x >= 0 ? 1e-7 : -1e-7)); }
  function r2(x) { return Math.round(x * 100) / 100; }
  var lang = 'en';
  function fmt(n) {
    var parts = Math.abs(n).toFixed(2).split('.');
    if (lang === 'bg') return (n < 0 ? '-' : '') + parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + ',' + parts[1] + '\u00A0€';
    return (n < 0 ? '-€' : '€') + parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + parts[1];
  }
  // ---- localized messages: key -> [en, bg]; {name} placeholders
  function tpl(str, v) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : ''; }); }
  var MSG = {
    entryObj: ['Entry must be an object.', 'Записът трябва да е обект.'],
    minLines: ['An entry needs at least two lines.', 'Записът изисква поне два реда.'],
    noAcct: ['Line {n}: account "{c}" does not exist.', 'Ред {n}: сметка "{c}" не съществува.'],
    amtNum: ['Line {n}: amounts must be numbers.', 'Ред {n}: сумите трябва да са числа.'],
    amtNeg: ['Line {n}: amounts cannot be negative.', 'Ред {n}: сумите не могат да са отрицателни.'],
    both: ['Line {n}: a line cannot have both a debit and a credit.', 'Ред {n}: един ред не може да има едновременно дебит и кредит.'],
    noAmt: ['Line {n}: enter a debit or a credit amount.', 'Ред {n}: въведете сума по дебита или по кредита.'],
    outBal: ['Entry is out of balance: debits {dr} vs credits {cr}.', 'Записът не е балансиран: дебит {dr} срещу кредит {cr}.'],
    noLines: ['No entry lines were provided.', 'Не са подадени редове на записа.'],
    amtNums: ['Amounts must be numbers.', 'Сумите трябва да са числа.'],
    rowNoAcct: ['A row has an amount but no account selected.', 'Ред има сума, но няма избрана сметка.'],
    notInChart: ['Account "{c}" is not in the chart of accounts.', 'Сметка "{c}" не е в сметкоплана.'],
    negUse: ['Amounts cannot be negative. Use the opposite side instead.', 'Сумите не могат да са отрицателни. Използвайте противоположната страна.'],
    bothSides: ['A single line cannot have both a debit and a credit.', 'Един ред не може да има едновременно дебит и кредит.'],
    unknownSc: ['Unknown scenario.', 'Непознат сценарий.'],
    onceDone: ['This closing entry has already been posted for the period.', 'Този приключващ запис вече е осчетоводен за периода.'],
    needTwo: ['An entry needs at least two lines: at least one debit and one credit.', 'Записът изисква поне два реда: поне един дебит и един кредит.'],
    unbal: ['Debits ({dr}) and credits ({cr}) do not balance. Off by {diff}. Every entry must balance before it can be checked.', 'Дебитът ({dr}) и кредитът ({cr}) не са равни. Разлика: {diff}. Всеки запис трябва да е балансиран, преди да бъде проверен.'],
    notBelong: ['Account {c} ({name}) does not belong in this entry.', 'Сметка {c} ({name}) не принадлежи към този запис.'],
    wrongSide: ['Account {c} is on the wrong side. Check whether it should be a debit or a credit.', 'Сметка {c} е от грешната страна. Проверете дали е дебит или кредит.'],
    amtOff: ['Amount on {c} is off.', 'Сумата по сметка {c} е грешна.'],
    missDr1: ['Check the debit side: one account is missing.', 'Проверете дебитната страна: липсва една сметка.'],
    missDrN: ['Check the debit side: {n} accounts are missing.', 'Проверете дебитната страна: липсват {n} сметки.'],
    missCr1: ['Check the credit side: one account is missing.', 'Проверете кредитната страна: липсва една сметка.'],
    missCrN: ['Check the credit side: {n} accounts are missing.', 'Проверете кредитната страна: липсват {n} сметки.'],
    couldNotPost: ['Could not post: {e}', 'Записът не може да бъде осчетоводен: {e}'],
    correct: ['Correct! +{xp} XP{rep}{streak}.', 'Вярно! +{xp} XP{rep}{streak}.'],
    repeat: [' (reduced for a repeat)', ' (намалено за повторение)'],
    streak: [' - streak x{n}', ' – серия x{n}'],
    cashCrit: ['Cash is critically low at {v}. Collect receivables or delay payments.', 'Паричните средства са критично ниски – {v}. Съберете вземанията или отложете плащания.'],
    cashWarn: ['Cash is {v}, below the €25,000 operating floor.', 'Паричните средства са {v}, под оперативния минимум от 25\u00A0000\u00A0€.'],
    cashOk: ['Cash is back above the operating floor.', 'Паричните средства отново са над оперативния минимум.'],
    ar90Alert: ['AR over 90 days is {v} ({p}% of receivables). Escalate collections.', 'Вземанията над 90 дни са {v} ({p}% от вземанията). Засилете събирането.'],
    ar90Warn: ['AR over 90 days has reached {v} ({p}% of receivables).', 'Вземанията над 90 дни достигат {v} ({p}% от вземанията).'],
    ar90Ok: ['AR over 90 days is back under control.', 'Вземанията над 90 дни отново са под контрол.'],
    apOver: ['{n} vendor bill(s) past due, starting with {vendor} ({bill}).', 'Просрочени фактури от доставчици: {n}, като първата е {vendor} ({bill}).'],
    apOk: ['No vendor bills are past due.', 'Няма просрочени фактури от доставчици.'],
    ratioAlert: ['Current ratio is {v}. Short-term liabilities exceed current assets.', 'Коефициентът на текуща ликвидност е {v}. Краткосрочните задължения надвишават текущите активи.'],
    ratioWarn: ['Current ratio is {v}, below the 1.5 target.', 'Коефициентът на текуща ликвидност е {v}, под целевото ниво 1,5.'],
    ratioOk: ['Current ratio is healthy again.', 'Коефициентът на текуща ликвидност отново е добър.'],
    invWarn: ['Inventory is down to {v}. Reorder soon.', 'Стоките са намалели до {v}. Поръчайте скоро.'],
    invOk: ['Inventory levels are back to normal.', 'Нивата на стоките отново са нормални.'],
    unappliedCredit: ['Unapplied credit', 'Неотнесен кредит'],
    vendorCredit: ['Vendor credit', 'Кредит от доставчик']
  };
  function T(key, v) { var m = MSG[key]; if (!m) return key; return tpl(lang === 'bg' ? m[1] : m[0], v); }
  function nbspBg(s) { return String(s).replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u00A0').replace(/(\d) €/g, '$1\u00A0€'); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // PRNG (mulberry32) so tests can seed it
  var seedState = (Date.now() ^ 0x9e3779b9) >>> 0;
  function rand() {
    seedState = (seedState + 0x6D2B79F5) >>> 0;
    var t = seedState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rint(a, b) { return Math.floor(rand() * (b - a + 1)) + a; }
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
  function money(a, b) { var v = a + rand() * (b - a); return rand() < 0.55 ? Math.round(v / 5) * 5 : r2(v); }

  // ---------------------------------------------------------------- events
  var handlers = {};
  function on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); }
  function off(ev, fn) { if (handlers[ev]) handlers[ev] = handlers[ev].filter(function (f) { return f !== fn; }); }
  function emit(ev, data) {
    (handlers[ev] || []).slice().forEach(function (fn) {
      try { fn(data); } catch (e) { if (root.console) console.error('[LW.engine] handler error for ' + ev, e); }
    });
  }

  // ---------------------------------------------------------------- chart of accounts
  var CHART = [
    ['1000', 'Cash', 'asset', 'dr'], ['1100', 'Accounts Receivable', 'asset', 'dr'],
    ['1150', 'Allowance for Doubtful Accounts', 'asset', 'cr'], ['1200', 'Inventory', 'asset', 'dr'],
    ['1300', 'Prepaid Expenses', 'asset', 'dr'], ['1500', 'Equipment', 'asset', 'dr'],
    ['1550', 'Accumulated Depreciation', 'asset', 'cr'],
    ['2000', 'Accounts Payable', 'liability', 'cr'], ['2100', 'Accrued Liabilities', 'liability', 'cr'],
    ['2150', 'Wages Payable', 'liability', 'cr'], ['2160', 'Payroll Withholdings Payable', 'liability', 'cr'],
    ['2170', 'Employer Payroll Taxes Payable', 'liability', 'cr'], ['2200', 'Sales Tax Payable', 'liability', 'cr'],
    ['2300', 'Unearned Revenue', 'liability', 'cr'], ['2400', 'Interest Payable', 'liability', 'cr'],
    ['2500', 'Bank Loan Payable', 'liability', 'cr'],
    ['3000', 'Common Stock', 'equity', 'cr'], ['3100', 'Retained Earnings', 'equity', 'cr'],
    ['4000', 'Sales Revenue', 'revenue', 'cr'], ['4100', 'Service Revenue', 'revenue', 'cr'],
    ['4900', 'Sales Discounts', 'revenue', 'dr'],
    ['5000', 'Cost of Goods Sold', 'expense', 'dr'], ['5100', 'Inventory Write-downs', 'expense', 'dr'],
    ['6000', 'Wages Expense', 'expense', 'dr'], ['6100', 'Rent Expense', 'expense', 'dr'],
    ['6200', 'Utilities Expense', 'expense', 'dr'], ['6300', 'Depreciation Expense', 'expense', 'dr'],
    ['6400', 'Bad Debt Expense', 'expense', 'dr'], ['6500', 'Insurance Expense', 'expense', 'dr'],
    ['6600', 'Supplies Expense', 'expense', 'dr'], ['6700', 'Bank Charges', 'expense', 'dr'],
    ['6800', 'Payroll Tax Expense', 'expense', 'dr'], ['6900', 'Interest Expense', 'expense', 'dr']
  ];
  var accounts = {};
  var bal = {};      // cents, signed in normal direction
  var closed = {};   // cents moved out of P&L accounts by closing entries (so metrics still show the period)
  CHART.forEach(function (a) {
    accounts[a[0]] = { code: a[0], name: a[1], type: a[2], normal: a[3], balance: 0 };
    bal[a[0]] = 0; closed[a[0]] = 0;
  });
  var ACC_BG = {
    '1000': 'Разплащателна сметка', '1100': 'Вземания от клиенти', '1150': 'Обезценка на съмнителни вземания',
    '1200': 'Стоки', '1300': 'Разходи за бъдещи периоди', '1500': 'Машини и оборудване', '1550': 'Натрупана амортизация',
    '2000': 'Задължения към доставчици', '2100': 'Начислени задължения', '2150': 'Задължения към персонала',
    '2160': 'Задържани данъци и осигуровки от заплати', '2170': 'Осигуровки за сметка на работодателя',
    '2200': 'Задължения за данък върху продажбите', '2300': 'Приходи за бъдещи периоди', '2400': 'Задължения за лихви',
    '2500': 'Банков заем', '3000': 'Основен капитал', '3100': 'Неразпределена печалба',
    '4000': 'Приходи от продажби', '4100': 'Приходи от услуги', '4900': 'Търговски отстъпки',
    '5000': 'Себестойност на продажбите', '5100': 'Обезценка на стоки', '6000': 'Разходи за заплати', '6100': 'Разходи за наем',
    '6200': 'Разходи за комунални услуги', '6300': 'Разходи за амортизация', '6400': 'Разходи за съмнителни вземания',
    '6500': 'Разходи за застраховки', '6600': 'Разходи за консумативи', '6700': 'Банкови такси',
    '6800': 'Разходи за осигуровки', '6900': 'Разходи за лихви'
  };
  var ACC_EN = {};
  CHART.forEach(function (a) { ACC_EN[a[0]] = a[1]; });
  var CURRENT_LIAB = ['2000', '2100', '2150', '2160', '2170', '2200', '2300', '2400'];

  // ---------------------------------------------------------------- team
  var TEAM_DEF = [
    ['elena', 'Elena Petrova', 'Controller', 'Елена Петрова', 'Финансов контрольор', 'ledger', '#0ea5e9'],
    ['maria', 'Maria Dimitrova', 'AR Specialist', 'Мария Димитрова', 'Специалист вземания', 'sales', '#2f6bff'],
    ['georgi', 'Georgi Ivanov', 'AP Specialist', 'Георги Иванов', 'Специалист задължения', 'procure', '#8b5cf6'],
    ['ivan', 'Ivan Georgiev', 'Inventory Accountant', 'Иван Георгиев', 'Счетоводител материални запаси', 'warehouse', '#f59e0b'],
    ['ana', 'Ana Koleva', 'Treasury Analyst', 'Ана Колева', 'Анализатор парични потоци', 'bank', '#10b981'],
    ['nikolai', 'Nikolai Stoyanov', 'Payroll Accountant', 'Николай Стоянов', 'Счетоводител ТРЗ', 'payroll', '#ec4899'],
    ['desi', 'Desislava Todorova', 'Reporting Analyst', 'Десислава Тодорова', 'Анализатор отчетност', 'reporting', '#6366f1']
  ];
  var OWNER = { sales: 'maria', procure: 'georgi', warehouse: 'ivan', bank: 'ana', payroll: 'nikolai', ledger: 'elena', reporting: 'desi' };
  var team = [], teamById = {};
  TEAM_DEF.forEach(function (d) {
    var m = { id: d[0], name: d[1], role: d[2], home: d[5], color: d[6], status: 'idle', task: '' };
    Object.defineProperty(m, '_task', { value: null, writable: true, enumerable: false });
    Object.defineProperty(m, '_timers', { value: [], writable: true, enumerable: false });
    team.push(m); teamById[m.id] = m;
  });

  // ---- journal memo templates (re-rendered on language switch)
  var MEMOS = {
    opening: ['Opening balances (Oct 1-14 activity rolled up)', 'Начални салда (обобщена дейност 1–14 окт.)'],
    sale: ['Credit sale {ref} - {who}', 'Продажба на кредит {ref} – {who}'],
    cashsale: ['Counter sale (6% tax)', 'Продажба в брой (6% данък върху продажбите)'],
    grn: ['Goods received {ref} - {who}', 'Получени стоки {ref} – {who}'],
    bill: ['Vendor bill {ref} - {who}', 'Фактура от доставчик {ref} – {who}'],
    pay: ['Payment {ref} - {who}', 'Плащане {ref} – {who}'],
    paypart: ['Partial payment {ref} - {who}', 'Частично плащане {ref} – {who}'],
    paydisc: ['Payment {ref} - {who} (2% disc)', 'Плащане {ref} – {who} (2% отстъпка)'],
    vpay: ['Paid {ref} - {who}', 'Платена {ref} – {who}'],
    payroll: ['Weekly payroll run', 'Седмично изплащане на заплати']
  };
  function renderMemo(mk) {
    if (!mk) return null;
    if (mk.sc) { var sc = scById[mk.sc]; return sc ? sc.title : mk.sc; }
    var m = MEMOS[mk.k];
    return m ? tpl(lang === 'bg' ? m[1] : m[0], mk.v).slice(0, 140) : null;
  }

  // ---------------------------------------------------------------- state
  var journal = [];
  var jeNo = 1001, invNo = 2037, billNo = 7722, cmNo = 1;
  var DAY0 = Date.UTC(2026, 9, 15);         // Oct 15, 2026 (opening balances roll up Oct 1-14)
  var MAX_OFFSET = 16;                      // business date holds at Oct 31 (period end)
  var dayOffset = 0, tickCount = 0, TICKS_PER_DAY = 4, simDays = 0;
  var PRIOR_REV = 58800, PRIOR_COGS = 36400; // seeded prior-month net revenue / COGS (DSO/DPO basis)
  var stats = { xp: 0, streak: 0, attempts: 0, correct: 0 };
  var solved = {};
  var lastScenarioId = null;
  var ar = [];   // AR subledger {customer, invoice, cents, daysOut}
  var ap = [];   // AP subledger {vendor, bill, cents, dueIn}

  function dateObj() { return new Date(DAY0 + dayOffset * 86400000); }
  function dateStr() { return dateObj().toISOString().slice(0, 10); }
  function dayOfMonth() { return dateObj().getUTCDate(); }

  function nextInv() { return 'INV-' + (invNo++); }
  function nextBill() { return 'BILL-' + (billNo++); }

  var CUSTOMERS = ['Pinecrest Hardware', 'Bluewater Marine', 'Alder & Finch', 'Granite Peak Builders', 'Summit Outfitters',
    'Marlow Retail Group', 'Cobalt Dental', 'Evergreen Cafe Chain', 'Redwood Schools', 'Lakeside Resorts'];
  var VENDORS = {
    'Ridgeline Wholesale': 30, 'Tidewater Packaging': 30, 'Ironbridge Logistics': 15, 'Kestrel Components': 30,
    'Orchard Lane Office': 30, 'Delta Chemical Supply': 30, 'Cascade Utilities': 15
  };
  var INV_VENDORS = ['Ridgeline Wholesale', 'Kestrel Components', 'Delta Chemical Supply', 'Tidewater Packaging'];
  var EXP_VENDORS = ['Cascade Utilities', 'Orchard Lane Office', 'Ironbridge Logistics'];

  // ---------------------------------------------------------------- core posting
  function validate(spec) {
    function err(m) { return { ok: false, error: m }; }
    if (!spec || typeof spec !== 'object') return err(T('entryObj'));
    if (!Array.isArray(spec.lines) || spec.lines.length < 2) return err(T('minLines'));
    var lines = [], dr = 0, cr = 0;
    for (var i = 0; i < spec.lines.length; i++) {
      var l = spec.lines[i] || {}, code = String(l.acct == null ? '' : l.acct).trim();
      if (!accounts[code]) return err(T('noAcct', { n: i + 1, c: code }));
      var d = l.dr == null || l.dr === '' ? 0 : Number(l.dr), c = l.cr == null || l.cr === '' ? 0 : Number(l.cr);
      if (!isFinite(d) || !isFinite(c)) return err(T('amtNum', { n: i + 1 }));
      if (d < 0 || c < 0) return err(T('amtNeg', { n: i + 1 }));
      var dc = toC(d), cc = toC(c);
      if (dc > 0 && cc > 0) return err(T('both', { n: i + 1 }));
      if (dc === 0 && cc === 0) return err(T('noAmt', { n: i + 1 }));
      lines.push({ acct: code, dr: dc / 100, cr: cc / 100, _d: dc, _c: cc });
      dr += dc; cr += cc;
    }
    if (dr !== cr) return err(T('outBal', { dr: fmt(dr / 100), cr: fmt(cr / 100) }));
    return { ok: true, lines: lines, totalC: dr };
  }

  function defaultFlow(process) {
    return process === 'ledger' ? [{ from: 'ledger', to: 'reporting', kind: 'report' }]
      : [{ from: process, to: 'ledger', kind: 'entry' }];
  }

  function netCents(lines, code, normalDirection) {
    var n = 0;
    lines.forEach(function (l) { if (l.acct === code) n += l._d - l._c; });
    return normalDirection ? n : -n; // normalDirection true => debit-positive
  }

  // AR subledger: positive delta = new invoice, negative = payment/credit applied
  function applyAR(deltaC, meta) {
    meta = meta || {};
    if (deltaC > 0) {
      ar.push({ customer: meta.customer || pick(CUSTOMERS), invoice: meta.invoice || nextInv(), cents: deltaC, daysOut: 0 });
      return;
    }
    var rem = -deltaC, i, inv, take;
    if (meta.applyTo) {
      inv = ar.filter(function (x) { return x.invoice === meta.applyTo && x.cents > 0; })[0];
      if (inv) { take = Math.min(rem, inv.cents); inv.cents -= take; rem -= take; }
    }
    if (rem > 0) {
      var cands = ar.filter(function (x) { return x.cents > 0 && (!meta.customer || x.customer === meta.customer); })
        .sort(function (a, b) { return b.daysOut - a.daysOut; });
      var exact = cands.filter(function (x) { return x.cents === rem; })[0];
      if (exact) { exact.cents = 0; rem = 0; }
      else {
        for (i = 0; i < cands.length && rem > 0; i++) { take = Math.min(rem, cands[i].cents); cands[i].cents -= take; rem -= take; }
      }
    }
    ar = ar.filter(function (x) { return x.cents !== 0; });
    if (rem > 0) ar.push({ customer: meta.customer || '', sys: meta.customer ? '' : 'unapplied', invoice: 'CM-' + (cmNo++), cents: -rem, daysOut: 0 });
  }

  // AP subledger: positive delta (credit) = new bill, negative = payment applied
  function applyAP(deltaC, meta) {
    meta = meta || {};
    if (deltaC > 0) {
      var v = meta.vendor || pick(Object.keys(VENDORS));
      ap.push({ vendor: v, bill: meta.bill || nextBill(), cents: deltaC, dueIn: meta.terms != null ? meta.terms : (VENDORS[v] || 30) });
      return;
    }
    var rem = -deltaC, take;
    var cands = ap.filter(function (x) { return x.cents > 0 && (!meta.vendor || x.vendor === meta.vendor); });
    var exact = meta.applyTo ? cands.filter(function (x) { return x.bill === meta.applyTo; })[0] : null;
    exact = exact || cands.filter(function (x) { return x.cents === rem; })[0];
    if (exact && exact.cents <= rem) { rem -= exact.cents; exact.cents = 0; }
    cands.sort(function (a, b) { return a.dueIn - b.dueIn; });
    for (var i = 0; i < cands.length && rem > 0; i++) {
      take = Math.min(rem, cands[i].cents); cands[i].cents -= take; rem -= take;
    }
    ap = ap.filter(function (x) { return x.cents !== 0; });
    if (rem > 0) ap.push({ vendor: meta.vendor || '', sys: meta.vendor ? '' : 'vcredit', bill: 'DM-' + (cmNo++), cents: -rem, dueIn: 0 });
  }

  function _post(spec, auto, seed) {
    var v = validate(spec);
    if (!v.ok) return v;
    var process = BSET[spec.process] ? spec.process : 'ledger';
    var id = seed ? 'JE-1000' : 'JE-' + (jeNo++);
    var closing = !!spec.closing;
    // apply to balances
    v.lines.forEach(function (l) {
      var a = accounts[l.acct];
      var delta = a.normal === 'dr' ? (l._d - l._c) : (l._c - l._d);
      bal[l.acct] += delta;
      if (closing) closed[l.acct] -= delta;
      a.balance = bal[l.acct] / 100;
    });
    if (!seed) {
      var meta = spec.meta || {};
      var arNet = netCents(v.lines, '1100', true);
      if (arNet !== 0) applyAR(arNet, meta);
      var apNet = netCents(v.lines, '2000', false);
      if (apNet !== 0) applyAP(apNet, meta);
    }
    var flow = (Array.isArray(spec.flow) && spec.flow.length ? spec.flow : defaultFlow(process)).map(function (h) {
      var o = { from: h.from, to: h.to, kind: h.kind || 'entry' };
      o.label = h.label || (o.kind === 'entry' ? id : '');
      return o;
    });
    var mk = spec.mk || (spec.scenarioId ? { sc: spec.scenarioId } : null);
    var by = spec.by || (seed ? 'elena' : (auto ? (OWNER[process] || 'elena') : 'you'));
    var entry = {
      id: id, date: dateStr(), memo: (mk && renderMemo(mk)) || String(spec.memo || '').slice(0, 140), process: process, by: by,
      lines: v.lines.map(function (l) { return { acct: l.acct, dr: l.dr, cr: l.cr }; }),
      total: v.totalC / 100, flow: flow, auto: !!auto
    };
    if (spec.scenarioId) entry.scenarioId = spec.scenarioId;
    if (mk) Object.defineProperty(entry, '_mk', { value: mk, writable: true, enumerable: false });
    if (closing) entry.closing = true;
    journal.push(entry);
    if (journal.length > 600) journal.splice(0, journal.length - 600);
    if (!seed) { emit('posted', { entry: entry, auto: !!auto }); emit('metrics', metrics()); }
    return { ok: true, entry: entry };
  }

  function post(entry) { return _post(entry, !!(entry && entry.auto), false); }

  // ---------------------------------------------------------------- opening balances (balanced)
  (function seed() {
    var open = {
      '1000': 58000, '1100': 96400, '1150': 3200, '1200': 64000, '1300': 9600, '1500': 64000, '1550': 21000,
      '2000': 33200, '2100': 6500, '2150': 5200, '2160': 3300, '2200': 6100, '2300': 14000, '2400': 250, '2500': 40000,
      '3000': 80000,
      '4000': 24600, '4100': 3900, '4900': 520, '5000': 17000, '6000': 6400, '6100': 2200, '6200': 520, '6600': 260
    };
    var dr = 0, cr = 0, lines = [];
    Object.keys(open).forEach(function (code) {
      var a = accounts[code], c = toC(open[code]);
      if (a.normal === 'dr') { lines.push({ acct: code, dr: open[code], cr: 0 }); dr += c; }
      else { lines.push({ acct: code, dr: 0, cr: open[code] }); cr += c; }
    });
    lines.push({ acct: '3100', dr: 0, cr: (dr - cr) / 100 }); // retained earnings = balancing equity
    _post({ memo: MEMOS.opening[0], mk: { k: 'opening' }, process: 'ledger', lines: lines }, false, true);
    // AR subledger (sums to 96,400)
    [['Pinecrest Hardware', 'INV-2033', 6000, 12], ['Bluewater Marine', 'INV-2035', 18400, 22], ['Summit Outfitters', 'INV-2036', 11250, 9],
      ['Alder & Finch', 'INV-2028', 14800, 41], ['Granite Peak Builders', 'INV-2025', 22100, 55], ['Marlow Retail Group', 'INV-2019', 9300, 68],
      ['Cobalt Dental', 'INV-2017', 12200, 75], ['Evergreen Cafe Chain', 'INV-2009', 2350, 104]
    ].forEach(function (r) { ar.push({ customer: r[0], invoice: r[1], cents: toC(r[2]), daysOut: r[3] }); });
    // AP subledger (sums to 33,200)
    [['Ridgeline Wholesale', 'BILL-7710', 12400, 12], ['Tidewater Packaging', 'BILL-7714', 2860, 5], ['Ironbridge Logistics', 'BILL-7718', 4320, 18],
      ['Kestrel Components', 'BILL-7702', 8500, 3], ['Orchard Lane Office', 'BILL-7721', 1480, 24], ['Delta Chemical Supply', 'BILL-7706', 3640, -2]
    ].forEach(function (r) { ap.push({ vendor: r[0], bill: r[1], cents: toC(r[2]), dueIn: r[3] }); });
  })();

  // ---------------------------------------------------------------- metrics
  function pl(code) { return (bal[code] + closed[code]) / 100; }
  function b(code) { return bal[code] / 100; }
  function bucketOf(d) { return d <= 30 ? '0-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+'; }
  function ar90() { return ar.reduce(function (s, x) { return s + (x.cents > 0 && x.daysOut > 90 ? x.cents : 0); }, 0) / 100; }
  function elapsedDays() { return 14 + simDays; }   // days since Oct 1 (keeps counting after the date holds at period end)
  function trailing30(prior, mtd) {
    var d = elapsedDays();
    return d < 30 ? prior * (30 - d) / 30 + mtd : mtd * 30 / d;
  }

  function metrics() {
    var cash = b('1000'), arB = b('1100'), apB = b('2000'), inv = b('1200');
    var revenue = r2(pl('4000') + pl('4100') - pl('4900'));
    var cogs = r2(pl('5000') + pl('5100'));
    var expenses = 0;
    Object.keys(accounts).forEach(function (c) { if (c.charAt(0) === '6') expenses += pl(c); });
    expenses = r2(expenses);
    var netIncome = r2(revenue - cogs - expenses);
    var ca = cash + arB - b('1150') + inv + b('1300');
    var cl = 0; CURRENT_LIAB.forEach(function (c) { cl += b(c); });
    var revBasis = trailing30(PRIOR_REV, revenue), cogsBasis = trailing30(PRIOR_COGS, cogs);
    var tdr = 0, tcr = 0;
    Object.keys(accounts).forEach(function (c) {
      var a = accounts[c], dbit = a.normal === 'dr' ? bal[c] : -bal[c]; // debit-positive
      if (dbit >= 0) tdr += dbit; else tcr -= dbit;
    });
    // trial balance: sum(debit-positive) must be 0, i.e. tdr === tcr
    return {
      cash: r2(cash), ar: r2(arB), ap: r2(apB), inventory: r2(inv),
      revenue: revenue, cogs: cogs, expenses: expenses, netIncome: netIncome,
      grossMarginPct: revenue > 0 ? Math.round((revenue - cogs) / revenue * 1000) / 10 : 0,
      currentRatio: cl > 0 ? Math.round(ca / cl * 100) / 100 : 99,
      dso: revBasis > 0 ? Math.round(arB / revBasis * 30 * 10) / 10 : 0,
      dpo: cogsBasis > 0 ? Math.round(apB / cogsBasis * 30 * 10) / 10 : 0,
      workingCapital: r2(ca - cl),
      trialBalanceOk: tdr === tcr,
      xp: stats.xp, level: levelOf(stats.xp), streak: stats.streak,
      accuracyPct: stats.attempts ? Math.round(stats.correct / stats.attempts * 100) : 100,
      // extras
      ar90Plus: r2(ar90()), date: dateStr(), currentAssets: r2(ca), currentLiabilities: r2(cl)
    };
  }
  function levelOf(xp) { return Math.floor(xp / 100) + 1; }

  function trialBalance() {
    var rows = Object.keys(accounts).sort().map(function (c) {
      var a = accounts[c], d = a.normal === 'dr' ? bal[c] : -bal[c];
      return { code: c, name: a.name, debit: d > 0 ? d / 100 : 0, credit: d < 0 ? -d / 100 : 0 };
    });
    rows.totals = {
      debit: r2(rows.reduce(function (s, r) { return s + r.debit; }, 0)),
      credit: r2(rows.reduce(function (s, r) { return s + r.credit; }, 0))
    };
    return rows;
  }
  function arAging() {
    return ar.slice().sort(function (a, b2) { return b2.daysOut - a.daysOut; }).map(function (x) {
      return { customer: x.sys ? T('unappliedCredit') : x.customer, invoice: x.invoice, amount: x.cents / 100, daysOut: x.daysOut, bucket: bucketOf(x.daysOut) };
    });
  }
  function apDue() {
    return ap.slice().sort(function (a, b2) { return a.dueIn - b2.dueIn; }).map(function (x) {
      return { vendor: x.sys ? T('vendorCredit') : x.vendor, bill: x.bill, amount: x.cents / 100, dueInDays: x.dueIn };
    });
  }

  // ---------------------------------------------------------------- flow templates
  function mkFlow(tpl, meta) {
    meta = meta || {};
    var inv = meta.invoice || 'INV', bill = meta.bill || 'BILL';
    switch (tpl) {
      case 'sale': return [{ from: 'customers', to: 'sales', kind: 'invoice', label: inv }, { from: 'warehouse', to: 'customers', kind: 'goods', label: 'SHIP' }, { from: 'sales', to: 'ledger', kind: 'entry' }];
      case 'receipt': return [{ from: 'customers', to: 'bank', kind: 'cash', label: meta.label || 'PMT' }, { from: 'bank', to: 'ledger', kind: 'entry' }];
      case 'cashsale': return [{ from: 'customers', to: 'sales', kind: 'cash', label: 'POS' }, { from: 'warehouse', to: 'customers', kind: 'goods', label: 'SHIP' }, { from: 'sales', to: 'ledger', kind: 'entry' }];
      case 'bill': return [{ from: 'vendors', to: 'procure', kind: 'bill', label: bill }, { from: 'procure', to: 'ledger', kind: 'entry' }];
      case 'grn': return [{ from: 'vendors', to: 'warehouse', kind: 'goods', label: 'GRN' }, { from: 'procure', to: 'ledger', kind: 'entry' }];
      case 'vpay': return [{ from: 'bank', to: 'vendors', kind: 'cash', label: meta.label || 'PAY' }, { from: 'bank', to: 'ledger', kind: 'entry' }];
      case 'payroll': return [{ from: 'bank', to: 'payroll', kind: 'cash', label: 'PAYROLL' }, { from: 'payroll', to: 'ledger', kind: 'entry' }];
      case 'return': return [{ from: 'customers', to: 'warehouse', kind: 'goods', label: 'RMA' }, { from: 'warehouse', to: 'ledger', kind: 'entry' }];
      case 'vreturn': return [{ from: 'warehouse', to: 'vendors', kind: 'goods', label: 'RTV' }, { from: 'procure', to: 'ledger', kind: 'entry' }];
      case 'report': return [{ from: 'ledger', to: 'reporting', kind: 'report', label: 'CLOSE' }, { from: 'reporting', to: 'ledger', kind: 'entry' }];
      case 'bank': return [{ from: 'bank', to: 'ledger', kind: 'entry' }];
      default: return null;
    }
  }

  // ---------------------------------------------------------------- scenarios
  var scenarios = [], scById = {}, SC_EN = {};
  function L(acct, dr, cr) { return { acct: acct, dr: dr || 0, cr: cr || 0 }; }
  function S(o) {
    var sc = { id: o.id, building: o.building, title: o.title, prompt: o.prompt, difficulty: o.d, xp: o.xp,
      hint: o.hint, explanation: o.explanation, flowType: o.flow || null, meta: o.meta || {} };
    if (o.once) sc.once = true;
    if (o.closing) sc.closing = true;
    if (typeof o.lines === 'function') Object.defineProperty(sc, 'lines', { get: o.lines, enumerable: true });
    else sc.lines = o.lines;
    SC_EN[sc.id] = { title: sc.title, prompt: sc.prompt, hint: sc.hint, explanation: sc.explanation };
    scenarios.push(sc); scById[sc.id] = sc;
    return sc;
  }

  // ---- Sales & Billing
  S({ id: 'sales-credit-sale', building: 'sales', d: 1, xp: 15, flow: 'sale', meta: { customer: 'Granite Peak Builders' },
    title: 'Credit sale with cost of goods sold',
    prompt: 'Northwind ships €4,800 of goods to Granite Peak Builders on account (net 30). The goods cost Northwind €2,900 from inventory. Record the sale and the cost of the goods sold.',
    lines: [L('1100', 4800), L('4000', 0, 4800), L('5000', 2900), L('1200', 0, 2900)],
    hint: 'A sale on credit is really two entries in one: revenue earned (who owes us?) and inventory leaving the shelf (where does that expense go?).',
    explanation: 'Under the perpetual inventory method every sale has two halves. First, recognize the revenue and the receivable: Dr Accounts Receivable, Cr Sales Revenue. Second, match the cost: Dr Cost of Goods Sold, Cr Inventory. Revenue and its related cost land in the same period, which is the matching principle.' });
  S({ id: 'sales-discount-receipt', building: 'sales', d: 2, xp: 25, flow: 'receipt', meta: { customer: 'Pinecrest Hardware', label: 'PMT-2033' },
    title: 'Customer payment with 2% early-pay discount',
    prompt: 'Pinecrest Hardware pays invoice INV-2033 (€6,000) within the 2/10, net 30 window and takes the 2% discount. Record the cash receipt.',
    lines: [L('1000', 5880), L('4900', 120), L('1100', 0, 6000)],
    hint: 'The customer pays less cash than the invoice, but the whole receivable must be cleared. The 2% (€120) is a contra-revenue, not an expense.',
    explanation: 'Cash received is €5,880 (98% of €6,000), yet the full €6,000 receivable is cleared. The €120 difference goes to Sales Discounts (4900), a contra-revenue account that reduces net sales while keeping the gross sale visible for analysis.' });
  S({ id: 'sales-writeoff', building: 'sales', d: 2, xp: 25, meta: { customer: 'Evergreen Cafe Chain' },
    title: 'Write off an uncollectible invoice',
    prompt: 'Evergreen Cafe Chain has filed for bankruptcy. Their invoice INV-2009 (€2,350, 104 days old) will never be collected. Write it off using the allowance method.',
    lines: [L('1150', 2350), L('1100', 0, 2350)],
    hint: 'With the allowance method, the expense was already booked when you estimated bad debts. So a write-off must not touch the income statement.',
    explanation: 'Dr Allowance for Doubtful Accounts, Cr Accounts Receivable. Net receivables (AR minus allowance) stay the same and no expense is recognized now, because the bad-debt expense was recorded earlier through the allowance estimate.' });
  S({ id: 'sales-unearned', building: 'sales', d: 2, xp: 25,
    title: 'Recognize earned service revenue',
    prompt: 'Lakeside Resorts prepaid €12,000 for a 3-month service plan in September (recorded as unearned revenue). One month of service, worth €4,000, was delivered in October. Recognize the revenue.',
    lines: [L('2300', 4000), L('4100', 0, 4000)],
    hint: 'Unearned revenue is a liability: we owe service. Delivering the service reduces that obligation.',
    explanation: 'Cash came in earlier, but revenue is only recognized as the performance obligation is satisfied. Dr Unearned Revenue (liability goes down), Cr Service Revenue (income goes up). No cash moves today.' });
  S({ id: 'sales-cash-sale-tax', building: 'sales', d: 2, xp: 30, flow: 'cashsale',
    title: 'Counter sale with sales tax',
    prompt: 'A walk-in customer buys €2,000 of goods and pays €2,120 by card, which includes 6% sales tax. The goods cost €1,200. Record the sale and the cost of sales.',
    lines: [L('1000', 2120), L('4000', 0, 2000), L('2200', 0, 120), L('5000', 1200), L('1200', 0, 1200)],
    hint: 'Sales tax is not our revenue: we collect it for the state. Where do amounts we owe to someone else go?',
    explanation: 'Cash up €2,120. Revenue is only the €2,000 price; the €120 tax is a liability to the state (Sales Tax Payable) until remitted. COGS and inventory record the €1,200 cost of the goods that left.' });

  // ---- Procurement
  S({ id: 'procure-inventory-bill', building: 'procure', d: 1, xp: 15, flow: 'bill', meta: { vendor: 'Ridgeline Wholesale', bill: 'BILL-7730' },
    title: 'Vendor bill for inventory',
    prompt: 'Ridgeline Wholesale invoices Northwind €8,600 for inventory received today, payable net 30. Record the vendor bill.',
    lines: [L('1200', 8600), L('2000', 0, 8600)],
    hint: 'Buying goods on credit: you gain an asset and take on an obligation. No cash yet, and no expense yet either.',
    explanation: 'Inventory is an asset until sold, so the purchase is Dr Inventory, Cr Accounts Payable. It becomes Cost of Goods Sold only when the goods are sold.' });
  S({ id: 'procure-pay-vendor', building: 'procure', d: 1, xp: 15, flow: 'vpay', meta: { vendor: 'Kestrel Components', label: 'ACH-7702' },
    title: 'Pay a vendor bill',
    prompt: 'Pay Kestrel Components bill BILL-7702 (€8,500) in full by bank transfer.',
    lines: [L('2000', 8500), L('1000', 0, 8500)],
    hint: 'Paying a bill removes the liability and spends cash. Expense was recognized earlier.',
    explanation: 'Dr Accounts Payable (the liability shrinks), Cr Cash. Paying a bill never creates an expense; the expense or asset was recorded when the bill was entered.' });
  S({ id: 'procure-ap-cutoff', building: 'procure', d: 2, xp: 25, flow: 'grn', meta: { vendor: 'Tidewater Packaging' },
    title: 'AP cutoff: goods received, invoice not yet',
    prompt: 'On Oct 30 a €5,400 shipment of packaging stock from Tidewater Packaging arrived and was counted into the warehouse. The vendor invoice will not arrive until November. Make sure the October books reflect it.',
    lines: [L('1200', 5400), L('2100', 0, 5400)],
    hint: 'No invoice means nothing in the AP subledger yet, but you still owe the money. Which liability account holds obligations without a bill?',
    explanation: 'Cutoff means recording transactions in the period they occur. Goods we own and owe for belong in October: Dr Inventory, Cr Accrued Liabilities (a "received not invoiced" accrual). When the invoice arrives in November, reclass it from accrued liabilities to AP.' });
  S({ id: 'procure-utility-bill', building: 'procure', d: 1, xp: 15, flow: 'bill', meta: { vendor: 'Cascade Utilities', bill: 'BILL-7731', terms: 15 },
    title: 'Utility bill received',
    prompt: 'Cascade Utilities bills €1,260 for October electricity, due in 15 days. Record the bill.',
    lines: [L('6200', 1260), L('2000', 0, 1260)],
    hint: 'Services are used up as they are consumed, so this is an expense, not an asset. Still unpaid.',
    explanation: 'Dr Utilities Expense, Cr Accounts Payable. The expense belongs to October because that is when the electricity was used, regardless of when it is paid.' });

  // ---- Inventory
  S({ id: 'warehouse-writedown', building: 'warehouse', d: 2, xp: 25,
    title: 'Write down obsolete inventory',
    prompt: 'A cycle count finds €3,100 of discontinued stock that can no longer be sold. Write it down to zero.',
    lines: [L('5100', 3100), L('1200', 0, 3100)],
    hint: 'Inventory must be carried at the lower of cost or net realizable value. The loss hits the income statement immediately.',
    explanation: 'Dr Inventory Write-downs (a cost-of-sales expense), Cr Inventory. Recognize the loss as soon as the impairment is known, not when the goods are eventually thrown out.' });
  S({ id: 'warehouse-customer-return', building: 'warehouse', d: 3, xp: 40, flow: 'return', meta: { customer: 'Bluewater Marine' },
    title: 'Customer return, goods back to stock',
    prompt: 'Bluewater Marine returns goods from an earlier sale: the sale price was €1,500 and the cost was €900. The goods are resalable. Reverse both the sale and the cost, and credit their account.',
    lines: [L('4000', 1500), L('1100', 0, 1500), L('1200', 900), L('5000', 0, 900)],
    hint: 'Undo both halves of the original sale: revenue and receivable on one side, inventory and cost of sales on the other.',
    explanation: 'Reversal of the sale: Dr Sales Revenue (or a Sales Returns account), Cr Accounts Receivable. Reversal of the cost: Dr Inventory, Cr COGS, since the goods are back on the shelf at their original cost.' });
  S({ id: 'warehouse-vendor-return', building: 'warehouse', d: 2, xp: 25, flow: 'vreturn', meta: { vendor: 'Tidewater Packaging' },
    title: 'Return defective stock to vendor',
    prompt: 'Defective inventory worth €2,860 is returned to Tidewater Packaging, and the vendor cancels the matching bill BILL-7714. Record the return.',
    lines: [L('2000', 2860), L('1200', 0, 2860)],
    hint: 'We owe the vendor less, and we hold less stock.',
    explanation: 'Dr Accounts Payable (liability shrinks), Cr Inventory (asset shrinks). The same account pair as a purchase, reversed. Always return at original cost, no profit or loss arises.' });

  // ---- Treasury
  S({ id: 'bank-fee', building: 'bank', d: 1, xp: 15, flow: 'bank',
    title: 'Bank reconciliation: unrecorded service fees',
    prompt: 'While reconciling the October bank statement you find €85 of monthly service fees that are not in the books. Record the adjusting entry.',
    lines: [L('6700', 85), L('1000', 0, 85)],
    hint: 'The bank already took the money. Bring the books in line with the statement.',
    explanation: 'Reconciling items that originate with the bank (fees, interest earned, NSF checks) need journal entries on our side. Dr Bank Charges, Cr Cash brings the book balance to the true bank balance.' });
  S({ id: 'bank-loan-payment', building: 'bank', d: 2, xp: 25, flow: 'bank',
    title: 'Loan installment: principal and interest',
    prompt: 'Make the monthly payment of €1,250 on the bank loan. Of that, €250 is interest and €1,000 reduces the principal. Interest is expensed as paid.',
    lines: [L('2500', 1000), L('6900', 250), L('1000', 0, 1250)],
    hint: 'One cash payment, two destinations: part reduces what you owe, part is the cost of borrowing.',
    explanation: 'Principal repayment reduces the liability (Dr Loan Payable); interest is an expense (Dr Interest Expense). Total cash out is €1,250. Only the interest portion touches net income.' });
  S({ id: 'bank-nsf', building: 'bank', d: 2, xp: 25, flow: 'bank', meta: { customer: 'Summit Outfitters', invoice: 'NSF-1800' },
    title: 'NSF customer check',
    prompt: 'A €1,800 check from Summit Outfitters bounced (NSF) and the bank deducted it from our account. The customer still owes the money. Record it.',
    lines: [L('1100', 1800), L('1000', 0, 1800)],
    hint: 'The earlier deposit is reversed, and the debt is back.',
    explanation: 'Dr Accounts Receivable, Cr Cash. The customer owes us again and the cash we thought we had is gone. Follow up with the customer; this is also a signal to review their credit.' });
  S({ id: 'bank-sales-tax-remit', building: 'bank', d: 1, xp: 15, flow: 'bank',
    title: 'Remit sales tax to the state',
    prompt: 'Pay the state €3,000 of sales tax collected from customers in September.',
    lines: [L('2200', 3000), L('1000', 0, 3000)],
    hint: 'This is not an expense: we are handing over money we collected for someone else.',
    explanation: 'Dr Sales Tax Payable, Cr Cash. Collected tax was never revenue, so paying it over only settles a liability.' });

  // ---- Payroll
  S({ id: 'payroll-accrue-wages', building: 'payroll', d: 2, xp: 25,
    title: 'Accrue unpaid wages at month end',
    prompt: 'October 31 falls mid pay-period. Employees have earned €3,800 that will be paid in November. Accrue the wages.',
    lines: [L('6000', 3800), L('2150', 0, 3800)],
    hint: 'Expenses are recorded when incurred, not when paid. Which liability holds wages owed to employees?',
    explanation: 'Dr Wages Expense, Cr Wages Payable. The work was done in October, so the cost belongs in October. In November the payroll run pays off the payable instead of expensing it again.' });
  S({ id: 'payroll-pay-withholdings', building: 'payroll', d: 2, xp: 25, flow: 'payroll',
    title: 'Pay payroll with withholdings',
    prompt: 'Run payroll: gross wages €6,800. Employee income tax and FICA withholdings total €1,530. Net pay of €5,270 is paid from the bank.',
    lines: [L('6000', 6800), L('2160', 0, 1530), L('1000', 0, 5270)],
    hint: 'The expense is the gross pay, not the net. Withheld amounts are held for the government.',
    explanation: 'Wages Expense is always recorded at gross (€6,800). Employees receive €5,270 in cash and €1,530 is withheld, which Northwind owes to tax authorities (a liability) until remitted.' });
  S({ id: 'payroll-employer-tax', building: 'payroll', d: 1, xp: 15,
    title: 'Employer payroll taxes',
    prompt: 'On the €6,800 gross payroll, Northwind owes its own 7.65% employer payroll tax (FICA match) = €520.20. Record the employer tax.',
    lines: [L('6800', 520.2), L('2170', 0, 520.2)],
    hint: 'This is an extra cost of employing people, on top of wages, and it is not yet paid.',
    explanation: 'Dr Payroll Tax Expense, Cr Employer Payroll Taxes Payable. Unlike withholdings (the employee\'s money), this is a real cost to the company.' });
  S({ id: 'payroll-pay-accrued', building: 'payroll', d: 1, xp: 15, flow: 'payroll',
    title: 'Pay previously accrued wages',
    prompt: 'The €5,200 of wages accrued at the end of last month are paid out today in cash. Record the payment.',
    lines: [L('2150', 5200), L('1000', 0, 5200)],
    hint: 'The expense was already recorded. Do not expense it twice.',
    explanation: 'Dr Wages Payable, Cr Cash. Accrual accounting recognized the expense when the work was done; this entry only settles the liability.' });

  // ---- General Ledger
  S({ id: 'ledger-depreciation', building: 'ledger', d: 1, xp: 15,
    title: 'Monthly depreciation',
    prompt: 'Equipment cost €64,000 with a 5-year life and no salvage value (straight-line). Record one month of depreciation.',
    lines: [L('6300', 1066.67), L('1550', 0, 1066.67)],
    hint: '€64,000 / 60 months. Do not credit Equipment directly; assets keep their original cost.',
    explanation: 'Straight-line: €64,000 / 60 = €1,066.67 per month. Dr Depreciation Expense, Cr Accumulated Depreciation (a contra-asset). Equipment stays at cost, accumulated depreciation grows, and net book value declines.' });
  S({ id: 'ledger-prepaid-insurance', building: 'ledger', d: 1, xp: 15,
    title: 'Prepaid insurance expiring',
    prompt: 'Northwind prepaid a €9,600 annual insurance premium. Record the expense for one month.',
    lines: [L('6500', 800), L('1300', 0, 800)],
    hint: '€9,600 / 12. Part of an asset has been used up.',
    explanation: 'Prepaid Expenses is an asset until the coverage period passes. Each month: Dr Insurance Expense €800, Cr Prepaid Expenses €800.' });
  S({ id: 'ledger-interest-accrual', building: 'ledger', d: 2, xp: 25,
    title: 'Accrue loan interest',
    prompt: 'The €40,000 bank loan carries 7.5% annual interest. Interest for October has accrued but is not yet paid. Record one month.',
    lines: [L('6900', 250), L('2400', 0, 250)],
    hint: '€40,000 x 7.5% / 12. Interest accumulates daily whether or not it is paid.',
    explanation: 'Dr Interest Expense, Cr Interest Payable for €250. The cost of borrowing is an October cost even though the cash goes out later.' });
  S({ id: 'ledger-bad-debt-estimate', building: 'ledger', d: 2, xp: 25,
    title: 'Estimate bad debts (allowance method)',
    prompt: 'Based on the AR aging analysis, management estimates €1,900 of receivables will not be collected. Record bad debt expense for the period.',
    lines: [L('6400', 1900), L('1150', 0, 1900)],
    hint: 'You do not know which customers will default yet, so you cannot credit Accounts Receivable directly.',
    explanation: 'Dr Bad Debt Expense, Cr Allowance for Doubtful Accounts (a contra-asset). The expense matches the period of the credit sales; later write-offs hit the allowance, not the P&L.' });
  S({ id: 'ledger-accrue-utilities', building: 'ledger', d: 2, xp: 25,
    title: 'Accrue an expected bill',
    prompt: 'The water bill for October has not arrived yet. Based on prior months, estimate €430 and accrue it.',
    lines: [L('6200', 430), L('2100', 0, 430)],
    hint: 'No invoice exists yet, so Accounts Payable is not the right home.',
    explanation: 'Dr Utilities Expense, Cr Accrued Liabilities. Estimating is acceptable under accrual accounting; when the actual bill arrives, clear the accrual and true up any difference.' });

  // ---- Reporting & Close (closing entries are built from live balances)
  function closeRevLines() {
    var lines = [], sumRev = 0, contra = 0;
    ['4000', '4100'].forEach(function (c) { if (bal[c] > 0) { lines.push(L(c, bal[c] / 100)); sumRev += bal[c]; } });
    if (bal['4900'] > 0) { lines.push(L('4900', 0, bal['4900'] / 100)); contra = bal['4900']; }
    var net = sumRev - contra;
    lines.push(net >= 0 ? L('3100', 0, net / 100) : L('3100', -net / 100, 0));
    return lines;
  }
  function closeExpLines() {
    var lines = [], tot = 0;
    Object.keys(accounts).sort().forEach(function (c) {
      if ((c.charAt(0) === '5' || c.charAt(0) === '6') && bal[c] > 0) { lines.push(L(c, 0, bal[c] / 100)); tot += bal[c]; }
    });
    lines.push(L('3100', tot / 100, 0));
    return lines;
  }
  S({ id: 'report-close-revenue', building: 'reporting', d: 3, xp: 40, flow: 'report', once: true, closing: true,
    title: 'Closing entry: revenue to retained earnings',
    prompt: 'Period end. Close all revenue accounts (including the Sales Discounts contra account) to Retained Earnings, using the current balances on the trial balance. Debit each revenue account for its balance, credit the contra account, and credit the net to Retained Earnings.',
    lines: closeRevLines,
    hint: 'Revenue accounts have credit balances, so debit them to zero. Sales Discounts has a debit balance, so credit it to zero. The difference is the net credit to Retained Earnings.',
    explanation: 'Temporary (income statement) accounts start every period at zero. Closing sweeps revenue into permanent equity: Dr Sales Revenue, Dr Service Revenue, Cr Sales Discounts, Cr Retained Earnings (net). Many firms route this through an Income Summary account; going straight to Retained Earnings is equivalent.' });
  S({ id: 'report-close-expenses', building: 'reporting', d: 3, xp: 40, flow: 'report', once: true, closing: true,
    title: 'Closing entry: expenses to retained earnings',
    prompt: 'Close all cost-of-sales and expense accounts to Retained Earnings using their current balances. Credit each expense account and debit the total to Retained Earnings.',
    lines: closeExpLines,
    hint: 'Expense accounts carry debit balances, so credit each one. Retained Earnings takes the total debit.',
    explanation: 'Credit every expense and COGS account for its balance, and debit Retained Earnings for the sum. After both closing entries, Retained Earnings has absorbed the period\'s net income (or loss) and all P&L accounts are zero.' });
  S({ id: 'report-reclass', building: 'reporting', d: 1, xp: 15, flow: 'report',
    title: 'Reclassify a misposted expense',
    prompt: 'Reviewing the trial balance, you find €240 of office supplies that was posted to Utilities Expense by mistake. Reclassify it to the right account.',
    lines: [L('6600', 240), L('6200', 0, 240)],
    hint: 'Move the amount, do not change the total expense: debit where it should have gone, credit where it landed.',
    explanation: 'A reclass moves an amount between accounts without changing totals: Dr Supplies Expense, Cr Utilities Expense. Net income is unchanged, but the statement lines become accurate.' });

  // ---------------------------------------------------------------- Bulgarian scenario texts
  var SC_BG = {
    'sales-credit-sale': {
      title: 'Продажба на кредит със себестойност на продадените стоки',
      prompt: 'Northwind изпраща стоки за 4 800 € на Granite Peak Builders с отложено плащане (30 дни). Стоките струват на Northwind 2 900 € по складова наличност. Отчетете продажбата и себестойността на продадените стоки.',
      hint: 'Продажбата на кредит е всъщност два записа в един: признат приход (кой ни дължи?) и стоки, напуснали склада (къде отива този разход?).',
      explanation: 'При перпетуалния метод всяка продажба има две части. Първо се признават приходът и вземането: Дт Вземания от клиенти, Кт Приходи от продажби. Второ се отчита себестойността: Дт Себестойност на продажбите, Кт Стоки. Приходът и свързаният с него разход попадат в един и същ период – това е принципът за съпоставимост.' },
    'sales-discount-receipt': {
      title: 'Плащане от клиент с 2% отстъпка за предсрочно плащане',
      prompt: 'Pinecrest Hardware плаща фактура INV-2033 (6 000 €) в срока по условията 2/10, нето 30 и ползва 2% отстъпка. Отчетете постъпилото плащане.',
      hint: 'Клиентът плаща по-малко от фактурата, но цялото вземане трябва да се закрие. 2% (120 €) са намаление на приходите, а не разход.',
      explanation: 'Получените средства са 5 880 € (98% от 6 000 €), но цялото вземане от 6 000 € се погасява. Разликата от 120 € се отнася към Търговски отстъпки (4900) – контра сметка към приходите, която намалява нетните продажби, но запазва брутната продажба видима за анализ.' },
    'sales-writeoff': {
      title: 'Отписване на несъбираема фактура',
      prompt: 'Evergreen Cafe Chain е обявила несъстоятелност. Фактура INV-2009 (2 350 €, просрочена с 104 дни) никога няма да бъде събрана. Отпишете я по метода на обезценката (провизията).',
      hint: 'При този метод разходът вече е отчетен при оценката на съмнителните вземания. Затова отписването не бива да засяга отчета за доходите.',
      explanation: 'Дт Обезценка на съмнителни вземания, Кт Вземания от клиенти. Нетните вземания (вземания минус обезценка) не се променят и сега не се признава разход, защото разходът за съмнителни вземания е отчетен по-рано чрез оценката.' },
    'sales-unearned': {
      title: 'Признаване на спечелен приход от услуги',
      prompt: 'Lakeside Resorts е платила предварително 12 000 € за тримесечен план за услуги през септември (отчетени като приходи за бъдещи периоди). През октомври е предоставена услугата за един месец на стойност 4 000 €. Признайте прихода.',
      hint: 'Приходите за бъдещи периоди са задължение – дължим услуга. Предоставянето на услугата намалява това задължение.',
      explanation: 'Парите са постъпили по-рано, но приход се признава едва когато задължението за изпълнение е удовлетворено. Дт Приходи за бъдещи периоди (задължението намалява), Кт Приходи от услуги (приходите растат). Днес няма движение на пари.' },
    'sales-cash-sale-tax': {
      title: 'Продажба в брой с данък върху продажбите',
      prompt: 'Клиент купува на място стоки за 2 000 € и плаща 2 120 € с карта, включително 6% данък върху продажбите. Стоките струват 1 200 €. Отчетете продажбата и себестойността.',
      hint: 'Данъкът върху продажбите не е наш приход – събираме го за държавата. Къде отиват сумите, които дължим на друг?',
      explanation: 'Паричните средства нарастват с 2 120 €. Приходът е само цената от 2 000 €; данъкът от 120 € е задължение към държавата (Задължения за данък върху продажбите), докато не бъде внесен. Себестойността и стоките отразяват 1 200 € за излезлите стоки.' },
    'procure-inventory-bill': {
      title: 'Фактура от доставчик за стоки',
      prompt: 'Ridgeline Wholesale фактурира Northwind 8 600 € за стоки, получени днес, с плащане до 30 дни. Отчетете фактурата от доставчика.',
      hint: 'Покупка на кредит: получавате актив и поемате задължение. Все още няма плащане, но и няма разход.',
      explanation: 'Стоките са актив до продажбата им, затова покупката е Дт Стоки, Кт Задължения към доставчици. Те стават Себестойност на продажбите едва когато бъдат продадени.' },
    'procure-pay-vendor': {
      title: 'Плащане на фактура към доставчик',
      prompt: 'Платете изцяло с банков превод фактура BILL-7702 (8 500 €) към Kestrel Components.',
      hint: 'Плащането премахва задължението и изразходва пари. Разходът е признат по-рано.',
      explanation: 'Дт Задължения към доставчици (задължението намалява), Кт Разплащателна сметка. Плащането на фактура никога не създава разход; разходът или активът е отчетен при въвеждането на фактурата.' },
    'procure-ap-cutoff': {
      title: 'Отчитане в правилния период: стоки получени, фактура – не',
      prompt: 'На 30 октомври в склада са приети опаковъчни материали от Tidewater Packaging на стойност 5 400 €. Фактурата на доставчика ще пристигне чак през ноември. Погрижете се октомврийските книги да я отразяват.',
      hint: 'Без фактура няма запис в аналитичната отчетност на доставчиците, но все пак дължим парите. Коя сметка за задължения съдържа ангажименти без фактура?',
      explanation: 'Отчитането в правилния период (cutoff) означава операциите да се записват в периода, в който са настъпили. Стоките, които притежаваме и дължим, принадлежат на октомври: Дт Стоки, Кт Начислени задължения (начисление за „получено, но нефактурирано“). Когато фактурата пристигне през ноември, прекласифицирайте от начислени задължения към задължения към доставчици.' },
    'procure-utility-bill': {
      title: 'Получена фактура за комунални услуги',
      prompt: 'Cascade Utilities фактурира 1 260 € за електроенергия за октомври, дължими до 15 дни. Отчетете фактурата.',
      hint: 'Услугите се потребяват в момента на ползването им, затова това е разход, а не актив. Все още е неплатена.',
      explanation: 'Дт Разходи за комунални услуги, Кт Задължения към доставчици. Разходът принадлежи на октомври, защото тогава е ползвана електроенергията, независимо кога се плаща.' },
    'warehouse-writedown': {
      title: 'Обезценка на излишни стоки',
      prompt: 'При инвентаризация се установяват спрени от продажба стоки за 3 100 €, които вече не могат да се реализират. Обезценете ги до нула.',
      hint: 'Стоките се оценяват по по-ниската от доставната стойност и нетната реализируема стойност. Загубата се отразява веднага в отчета за доходите.',
      explanation: 'Дт Обезценка на стоки (разход, свързан със себестойността), Кт Стоки. Загубата се признава щом обезценката е установена, а не когато стоките бъдат изхвърлени.' },
    'warehouse-customer-return': {
      title: 'Връщане от клиент, стоките се връщат в склада',
      prompt: 'Bluewater Marine връща стоки от по-ранна продажба: продажната цена е била 1 500 €, а себестойността 900 €. Стоките са годни за препродажба. Сторнирайте продажбата и себестойността и кредитирайте сметката на клиента.',
      hint: 'Анулирайте двете части на първоначалната продажба: приход и вземане от едната страна, стоки и себестойност от другата.',
      explanation: 'Сторниране на продажбата: Дт Приходи от продажби (или сметка за върнати продажби), Кт Вземания от клиенти. Сторниране на себестойността: Дт Стоки, Кт Себестойност на продажбите, тъй като стоките са обратно в склада по първоначалната си стойност.' },
    'warehouse-vendor-return': {
      title: 'Връщане на дефектни стоки на доставчик',
      prompt: 'Дефектни стоки на стойност 2 860 € са върнати на Tidewater Packaging, а доставчикът анулира съответната фактура BILL-7714. Отчетете връщането.',
      hint: 'Дължим по-малко на доставчика и държим по-малко стоки.',
      explanation: 'Дт Задължения към доставчици (задължението намалява), Кт Стоки (активът намалява). Същата двойка сметки като при покупката, но в обратна посока. Връщането винаги е по първоначална стойност – не възниква печалба или загуба.' },
    'bank-fee': {
      title: 'Банково съпоставяне: неотчетени банкови такси',
      prompt: 'При съпоставянето на банковото извлечение за октомври откривате 85 € месечни такси за обслужване, които не са отразени в книгите. Отчетете коригиращия запис.',
      hint: 'Банката вече е взела парите. Приведете книгите в съответствие с извлечението.',
      explanation: 'Позициите в съпоставянето, възникващи от банката (такси, начислени лихви, чекове без покритие), изискват счетоводни записи при нас. Дт Банкови такси, Кт Разплащателна сметка довежда счетоводното салдо до действителното банково салдо.' },
    'bank-loan-payment': {
      title: 'Вноска по заем: главница и лихва',
      prompt: 'Направете месечната вноска от 1 250 € по банковия заем. От нея 250 € са лихва, а 1 000 € намаляват главницата. Лихвата се признава като разход при плащането.',
      hint: 'Едно плащане с две предназначения: част намалява дълга, част е цената на заема.',
      explanation: 'Погасяването на главницата намалява задължението (Дт Банков заем); лихвата е разход (Дт Разходи за лихви). Общото плащане е 1 250 €. Само лихвата засяга финансовия резултат.' },
    'bank-nsf': {
      title: 'Чек на клиент без покритие',
      prompt: 'Чек за 1 800 € от Summit Outfitters е върнат без покритие и банката го е удържала от сметката ни. Клиентът все още дължи сумата. Отчетете го.',
      hint: 'Предишният депозит се сторнира и дългът се възстановява.',
      explanation: 'Дт Вземания от клиенти, Кт Разплащателна сметка. Клиентът ни дължи отново, а парите, които смятахме за налични, ги няма. Свържете се с клиента; това е и сигнал да преразгледате кредитния му лимит.' },
    'bank-sales-tax-remit': {
      title: 'Внасяне на данък върху продажбите в държавата',
      prompt: 'Платете на държавата 3 000 € данък върху продажбите, събран от клиентите през септември.',
      hint: 'Това не е разход: предаваме пари, които сме събрали за някой друг.',
      explanation: 'Дт Задължения за данък върху продажбите, Кт Разплащателна сметка. Събраният данък никога не е бил приход, затова внасянето му само погасява задължение.' },
    'payroll-accrue-wages': {
      title: 'Начисляване на неизплатени заплати в края на месеца',
      prompt: '31 октомври е по средата на периода за заплати. Служителите са спечелили 3 800 €, които ще бъдат изплатени през ноември. Начислете заплатите.',
      hint: 'Разходите се отчитат, когато възникнат, а не когато се платят. Коя сметка за задължения съдържа заплати, дължими на служителите?',
      explanation: 'Дт Разходи за заплати, Кт Задължения към персонала. Трудът е положен през октомври, затова разходът принадлежи на октомври. През ноември изплащането на заплатите погасява задължението, вместо да се отчита отново разход.' },
    'payroll-pay-withholdings': {
      title: 'Изплащане на заплати със задържани данъци и осигуровки',
      prompt: 'Изплащане на заплати: брутни заплати 6 800 €. Удържаните от служителите данък върху доходите и осигуровки са общо 1 530 €. Нетното възнаграждение от 5 270 € се изплаща от банковата сметка.',
      hint: 'Разходът е брутната заплата, не нетната. Удържаните суми се държат за държавата.',
      explanation: 'Разходите за заплати винаги се отчитат по брутна стойност (6 800 €). Служителите получават 5 270 €, а 1 530 € са удържани – Northwind ги дължи на данъчните и осигурителните институции (задължение), докато не бъдат внесени.' },
    'payroll-employer-tax': {
      title: 'Осигуровки за сметка на работодателя',
      prompt: 'Върху брутните заплати от 6 800 € Northwind дължи собствени осигуровки за сметка на работодателя от 7,65% (съответстваща вноска) = 520,20 €. Отчетете осигуровките на работодателя.',
      hint: 'Това е допълнителен разход за наемането на хора, освен заплатите, и още не е платен.',
      explanation: 'Дт Разходи за осигуровки, Кт Осигуровки за сметка на работодателя. За разлика от удръжките (парите на служителя), това е реален разход за дружеството.' },
    'payroll-pay-accrued': {
      title: 'Изплащане на предварително начислени заплати',
      prompt: 'Заплатите от 5 200 €, начислени в края на миналия месец, се изплащат днес от банковата сметка. Отчетете плащането.',
      hint: 'Разходът вече е отчетен. Не го отчитайте два пъти.',
      explanation: 'Дт Задължения към персонала, Кт Разплащателна сметка. Начисленият метод е признал разхода при полагането на труда; този запис само погасява задължението.' },
    'ledger-depreciation': {
      title: 'Месечна амортизация',
      prompt: 'Оборудване на стойност 64 000 € със срок на годност 5 години и без остатъчна стойност (линеен метод). Отчетете амортизацията за един месец.',
      hint: '64 000 € / 60 месеца. Не кредитирайте оборудването директно; активите запазват първоначалната си стойност.',
      explanation: 'Линеен метод: 64 000 € / 60 = 1 066,67 € на месец. Дт Разходи за амортизация, Кт Натрупана амортизация (контра актив). Оборудването остава по историческа цена, натрупаната амортизация расте, а балансовата стойност намалява.' },
    'ledger-prepaid-insurance': {
      title: 'Изтичане на предплатена застраховка',
      prompt: 'Northwind е предплатила годишна застрахователна премия от 9 600 €. Отчетете разхода за един месец.',
      hint: '9 600 € / 12. Част от актива е използвана.',
      explanation: 'Разходите за бъдещи периоди са актив, докато периодът на покритие не измине. Всеки месец: Дт Разходи за застраховки 800 €, Кт Разходи за бъдещи периоди 800 €.' },
    'ledger-interest-accrual': {
      title: 'Начисляване на лихва по заем',
      prompt: 'Банковият заем от 40 000 € е с годишна лихва 7,5%. Лихвата за октомври е начислена, но още не е платена. Отчетете един месец.',
      hint: '40 000 € x 7,5% / 12. Лихвата се натрупва ежедневно, независимо дали е платена.',
      explanation: 'Дт Разходи за лихви, Кт Задължения за лихви – 250 €. Цената на заема е разход за октомври, дори парите да излязат по-късно.' },
    'ledger-bad-debt-estimate': {
      title: 'Оценка на съмнителни вземания (метод на обезценката)',
      prompt: 'Въз основа на анализа на възрастта на вземанията ръководството оценява, че 1 900 € от вземанията няма да бъдат събрани. Отчетете разхода за съмнителни вземания за периода.',
      hint: 'Още не знаете кои клиенти няма да платят, затова не можете да кредитирате Вземания от клиенти директно.',
      explanation: 'Дт Разходи за съмнителни вземания, Кт Обезценка на съмнителни вземания (контра актив). Разходът се съпоставя с периода на продажбите на кредит; по-късните отписвания засягат обезценката, а не отчета за доходите.' },
    'ledger-accrue-utilities': {
      title: 'Начисляване на очаквана фактура',
      prompt: 'Сметката за вода за октомври още не е пристигнала. Въз основа на предишни месеци я оценете на 430 € и я начислете.',
      hint: 'Още няма фактура, затова Задължения към доставчици не е подходящата сметка.',
      explanation: 'Дт Разходи за комунални услуги, Кт Начислени задължения. Приблизителните оценки са допустими при принципа на начисляването; когато пристигне действителната фактура, закрийте начислението и коригирайте разликата.' },
    'report-close-revenue': {
      title: 'Приключващ запис: приходи към неразпределена печалба',
      prompt: 'Край на периода. Приключете всички сметки за приходи (включително контра сметката Търговски отстъпки) към Неразпределена печалба, като използвате текущите салда от оборотната ведомост. Дебитирайте всяка сметка за приходи със салдото ѝ, кредитирайте контра сметката и кредитирайте нетната сума в Неразпределена печалба.',
      hint: 'Сметките за приходи имат кредитно салдо, затова ги дебитирайте до нула. Търговски отстъпки има дебитно салдо, затова го кредитирайте до нула. Разликата е нетният кредит към Неразпределена печалба.',
      explanation: 'Временните сметки (от отчета за доходите) започват всеки период от нула. Приключването пренася приходите в постоянния собствен капитал: Дт Приходи от продажби, Дт Приходи от услуги, Кт Търговски отстъпки, Кт Неразпределена печалба (нето). Много предприятия минават през сметка „Печалби и загуби“; директното приключване към Неразпределена печалба е равностойно.' },
    'report-close-expenses': {
      title: 'Приключващ запис: разходи към неразпределена печалба',
      prompt: 'Приключете всички сметки за себестойност и разходи към Неразпределена печалба с текущите им салда. Кредитирайте всяка сметка за разходи и дебитирайте общата сума в Неразпределена печалба.',
      hint: 'Сметките за разходи имат дебитни салда, затова кредитирайте всяка от тях. Неразпределена печалба получава общия дебит.',
      explanation: 'Кредитирайте всяка сметка за разходи и за себестойност със салдото ѝ и дебитирайте Неразпределена печалба със сбора. След двата приключващи записа Неразпределена печалба е поела финансовия резултат (печалба или загуба) за периода, а всички сметки от отчета за доходите са нулирани.' },
    'report-reclass': {
      title: 'Прекласифициране на погрешно осчетен разход',
      prompt: 'При преглед на оборотната ведомост откривате, че 240 € канцеларски консумативи са осчетени погрешно като Разходи за комунални услуги. Прекласифицирайте ги в правилната сметка.',
      hint: 'Преместете сумата, без да променяте общия разход: дебитирайте там, където е трябвало да отиде, кредитирайте там, където е попаднала.',
      explanation: 'Прекласификацията премества сума между сметки, без да променя общите суми: Дт Разходи за консумативи, Кт Разходи за комунални услуги. Финансовият резултат не се променя, но редовете в отчетите стават точни.' }
  };
  var CLOSE_BG = {
    'bank-rec': ['Банково съпоставяне', '27 окт.'], 'ap-cutoff': ['Приключване на задълженията', '28 окт.'],
    'accruals': ['Начисления', '29 окт.'], 'depreciation': ['Амортизация', '30 окт.'],
    'revenue-rec': ['Признаване на приходи', '30 окт.'], 'statements': ['Финансови отчети', '31 окт.']
  };

  // ---------------------------------------------------------------- close steps
  var closeSteps = [
    { id: 'bank-rec', title: 'Bank reconciliation', building: 'bank', scenarioId: 'bank-fee', done: true, eta: 'Oct 27' },
    { id: 'ap-cutoff', title: 'AP cutoff', building: 'procure', scenarioId: 'procure-ap-cutoff', done: true, eta: 'Oct 28' },
    { id: 'accruals', title: 'Accruals', building: 'payroll', scenarioId: 'payroll-accrue-wages', done: false, eta: 'Oct 29' },
    { id: 'depreciation', title: 'Depreciation', building: 'ledger', scenarioId: 'ledger-depreciation', done: false, eta: 'Oct 30' },
    { id: 'revenue-rec', title: 'Revenue recognition', building: 'sales', scenarioId: 'sales-unearned', done: false, eta: 'Oct 30' },
    { id: 'statements', title: 'Financial statements', building: 'reporting', scenarioId: 'report-close-revenue', done: false, eta: 'Oct 31' }
  ];
  var CLOSE_EN = {};
  closeSteps.forEach(function (c) { CLOSE_EN[c.id] = [c.title, c.eta]; });
  function completeCloseStep(id) {
    var s = closeSteps.filter(function (x) { return x.id === id; })[0];
    if (!s) return null;
    if (!s.done) { s.done = true; emit('close', { steps: closeSteps }); }
    return s;
  }

  // ---------------------------------------------------------------- grading
  function num(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    return Number(String(v).replace(/[$€,\s]/g, ''));
  }
  function parseLines(lines) {
    if (!Array.isArray(lines)) return { error: T('noLines') };
    var rows = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i] || {}, code = String(l.acct == null ? '' : l.acct).trim();
      var d = num(l.dr), c = num(l.cr);
      if (!isFinite(d) || !isFinite(c)) return { error: T('amtNums') };
      if (!code && d === 0 && c === 0) continue;
      if (!code) return { error: T('rowNoAcct') };
      if (!accounts[code]) return { error: T('notInChart', { c: code }) };
      if (d < 0 || c < 0) return { error: T('negUse') };
      if (toC(d) > 0 && toC(c) > 0) return { error: T('bothSides') };
      if (toC(d) === 0 && toC(c) === 0) continue;
      rows.push({ acct: code, d: toC(d), c: toC(c) });
    }
    return { rows: rows };
  }
  function netMap(rows) {
    var m = {};
    rows.forEach(function (r) { m[r.acct] = (m[r.acct] || 0) + r.d - r.c; });
    return m;
  }

  function attempt(scenarioId, lines, opts) {
    opts = opts || {};
    var sc = scById[scenarioId];
    if (!sc) return { correct: false, feedback: T('unknownSc'), expected: [] };
    var expected = clone(sc.lines);
    if (sc.once && solved[sc.id]) {
      return { correct: false, feedback: T('onceDone'), expected: expected };
    }
    stats.attempts++;
    function fail(msg) {
      stats.streak = 0;
      emit('xp', { xp: stats.xp, level: levelOf(stats.xp), delta: 0, streak: 0, accuracyPct: metrics().accuracyPct });
      return { correct: false, feedback: msg, expected: expected, explanation: sc.explanation, streak: 0 };
    }
    var p = parseLines(lines);
    if (p.error) return fail(p.error);
    var rows = p.rows;
    if (rows.length < 2) return fail(T('needTwo'));
    var dr = 0, cr = 0;
    rows.forEach(function (r) { dr += r.d; cr += r.c; });
    if (dr !== cr) {
      return fail(T('unbal', { dr: fmt(dr / 100), cr: fmt(cr / 100), diff: fmt(Math.abs(dr - cr) / 100) }));
    }
    var expRows = expected.map(function (e) { return { acct: e.acct, d: toC(e.dr), c: toC(e.cr) }; });
    var exp = netMap(expRows), usr = netMap(rows), codes = {};
    Object.keys(exp).concat(Object.keys(usr)).forEach(function (c) { codes[c] = true; });
    var missDr = 0, missCr = 0, msgs = [];
    Object.keys(codes).sort().forEach(function (c) {
      var e = exp[c] || 0, u = usr[c] || 0;
      if (e === u) return;
      if (e !== 0 && u === 0) { if (e > 0) missDr++; else missCr++; }
      else if (e === 0) msgs.push(T('notBelong', { c: c, name: accounts[c].name }));
      else if ((e > 0) !== (u > 0)) msgs.push(T('wrongSide', { c: c }));
      else msgs.push(T('amtOff', { c: c }));
    });
    var head = [];
    if (missDr) head.push(missDr === 1 ? T('missDr1') : T('missDrN', { n: missDr }));
    if (missCr) head.push(missCr === 1 ? T('missCr1') : T('missCrN', { n: missCr }));
    var all = head.concat(msgs);
    if (all.length) return fail(all.slice(0, 3).join(' '));

    // correct: post canonical entry
    var meta = clone(sc.meta || {});
    var res = _post({
      memo: sc.title, mk: { sc: sc.id }, by: 'you', process: sc.building, lines: expected, scenarioId: sc.id, closing: !!sc.closing,
      meta: meta, flow: sc.flowType ? mkFlow(sc.flowType, meta) : null
    }, false, false);
    if (!res.ok) return fail(T('couldNotPost', { e: res.error }));
    var repeat = (solved[sc.id] || 0) > 0;
    solved[sc.id] = (solved[sc.id] || 0) + 1;
    stats.correct++; stats.streak++;
    var base = sc.xp;
    if (repeat) base = Math.round(base * 0.4);
    if (opts.hint) base = Math.round(base * 0.75);
    var bonus = stats.streak >= 3 ? Math.min(stats.streak - 2, 5) * 2 : 0;
    var delta = Math.max(1, base + bonus), oldLevel = levelOf(stats.xp);
    stats.xp += delta;
    var level = levelOf(stats.xp);
    var step = closeSteps.filter(function (s) { return s.scenarioId === sc.id; })[0];
    if (step) completeCloseStep(step.id);
    emit('xp', { xp: stats.xp, level: level, delta: delta, levelUp: level > oldLevel, streak: stats.streak, accuracyPct: metrics().accuracyPct });
    emit('metrics', metrics());
    return {
      correct: true, entry: res.entry, expected: expected, explanation: sc.explanation, xp: delta, level: level, levelUp: level > oldLevel,
      streak: stats.streak, closeStep: step ? step.id : null,
      feedback: T('correct', { xp: delta, rep: repeat ? T('repeat') : '', streak: stats.streak >= 3 ? T('streak', { n: stats.streak }) : '' })
    };
  }

  function nextScenario(buildingId) {
    var pool = scenarios.filter(function (s) { return (!buildingId || s.building === buildingId) && !(s.once && solved[s.id]); });
    if (!pool.length) pool = scenarios.filter(function (s) { return !buildingId || s.building === buildingId; });
    if (pool.length > 1) pool = pool.filter(function (s) { return s.id !== lastScenarioId; });
    var weighted = [];
    pool.forEach(function (s) { var w = solved[s.id] ? 1 : 3; for (var i = 0; i < w; i++) weighted.push(s); });
    var sc = pick(weighted);
    lastScenarioId = sc.id;
    return sc;
  }

  // ---------------------------------------------------------------- simulation
  function autoEntry(spec) {
    var r = _post(spec, true, false);
    if (!r.ok) { if (root.console) console.error('[LW.engine] auto entry rejected: ' + r.error, spec); return null; }
    if (spec.act) {
      var who = r.entry.by, a = spec.act, m = teamById[who];
      if (m) startActivity(who, m.home, a.to || (r.entry.process === 'ledger' ? 'reporting' : 'ledger'), a.kind, a.tk, { ref: a.ref || '' }, r.entry.id);
    }
    return r.entry;
  }
  function simCreditSale() {
    var cust = pick(CUSTOMERS), amt = money(1400, 5200), cost = r2(amt * (0.55 + rand() * 0.13));
    if (bal['1200'] < toC(cost) + toC(15000)) return simReceipt();
    var inv = nextInv(), meta = { customer: cust, invoice: inv };
    return autoEntry({ mk: { k: 'sale', v: { ref: inv, who: cust } }, act: { tk: 'sale', kind: 'invoice', ref: inv }, process: 'sales', meta: meta, flow: mkFlow('sale', meta),
      lines: [L('1100', amt), L('4000', 0, amt), L('5000', cost), L('1200', 0, cost)] });
  }
  function simCashSale() {
    var amt = money(350, 2400), tax = r2(amt * 0.06), cost = r2(amt * (0.55 + rand() * 0.13));
    if (bal['1200'] < toC(cost) + toC(15000)) return simReceipt();
    return autoEntry({ mk: { k: 'cashsale' }, act: { tk: 'cashsale', kind: 'invoice' }, process: 'sales', flow: mkFlow('cashsale'),
      lines: [L('1000', r2(amt + tax)), L('4000', 0, amt), L('2200', 0, tax), L('5000', cost), L('1200', 0, cost)] });
  }
  function simReceipt() {
    var v = pick(INV_VENDORS), amt = money(1800, 5200), bill = nextBill(), meta = { vendor: v, bill: bill };
    return autoEntry({ mk: { k: 'grn', v: { ref: bill, who: v } }, act: { tk: 'grn', kind: 'goods', ref: bill }, process: 'warehouse', meta: meta, flow: mkFlow('grn', meta),
      lines: [L('1200', amt), L('2000', 0, amt)] });
  }
  function simExpenseBill() {
    var v = pick(EXP_VENDORS), bill = nextBill(), meta = { vendor: v, bill: bill };
    var acct = v === 'Cascade Utilities' ? '6200' : '6600';
    var amt = money(180, 1400);
    return autoEntry({ mk: { k: 'bill', v: { ref: bill, who: v } }, act: { tk: 'bill', kind: 'bill', ref: bill }, process: 'procure', meta: meta, flow: mkFlow('bill', meta),
      lines: [L(acct, amt), L('2000', 0, amt)] });
  }
  function simCustomerPayment(force) {
    if (!force && bal['1100'] < toC(65000)) return simCreditSale();   // keep receivables realistic
    var pos = ar.filter(function (x) { return x.cents > 0; });
    var pool = pos.filter(function (x) { return x.daysOut >= 8 && x.daysOut <= 60; });
    if (!pool.length || rand() < 0.06) pool = pos.filter(function (x) { return x.daysOut > 60 && x.daysOut <= 85; }).concat(pool);
    if (rand() < 0.03) { var late = pos.filter(function (x) { return x.daysOut > 90; }); if (late.length) pool = late; }   // occasional collections win
    if (!pool.length) pool = pos.filter(function (x) { return x.daysOut <= 90; });
    if (!pool.length) return simCreditSale();
    var inv = pick(pool), full = inv.cents / 100, amt = full, disc = 0;
    if (full >= 4000 && rand() < 0.14) amt = r2(Math.round(full * (0.5 + rand() * 0.25) / 5) * 5);      // partial payment
    else if (inv.daysOut <= 15 && full >= 2000 && rand() < 0.35) disc = r2(full * 0.02);
    var meta = { customer: inv.customer, applyTo: inv.invoice, label: 'PMT-' + inv.invoice.slice(4) };
    var lines = [L('1000', r2(amt - disc))];
    if (disc) lines.push(L('4900', disc));
    lines.push(L('1100', 0, amt));
    return autoEntry({ mk: { k: amt < full ? 'paypart' : (disc ? 'paydisc' : 'pay'), v: { ref: inv.invoice, who: inv.customer } },
      act: { tk: 'receipt', kind: 'cash', ref: inv.invoice }, process: 'bank', meta: meta, flow: mkFlow('receipt', meta), lines: lines });
  }
  function simVendorPayment() {
    var due = ap.filter(function (x) { return x.cents > 0; }).sort(function (a, b2) { return a.dueIn - b2.dueIn; });
    var pool = due.filter(function (x) { return x.dueIn <= 5; });
    if (!pool.length && rand() < 0.25) pool = due.slice(0, 2);
    if (!pool.length) return simCustomerPayment(true);
    var bill = pool[0], amt = bill.cents / 100;
    if (bal['1000'] - bill.cents < toC(30000)) return simCustomerPayment(true);  // keep cash healthy
    var meta = { vendor: bill.vendor, applyTo: bill.bill, label: 'ACH-' + bill.bill.slice(5) };
    return autoEntry({ mk: { k: 'vpay', v: { ref: bill.bill, who: bill.vendor } }, act: { tk: 'vpay', kind: 'cash', ref: bill.bill }, process: 'bank', meta: meta, flow: mkFlow('vpay', meta),
      lines: [L('2000', amt), L('1000', 0, amt)] });
  }
  function simPayroll() {
    if (bal['1000'] < toC(25000)) return simCustomerPayment(true);
    return autoEntry({ mk: { k: 'payroll' }, act: { tk: 'payroll', kind: 'payroll' }, process: 'payroll', flow: mkFlow('payroll'),
      lines: [L('6000', 3200), L('6800', 244.8), L('2160', 0, 720), L('2170', 0, 244.8), L('1000', 0, 2480)] });
  }

  var ACTIONS = [[simCreditSale, 22], [simCustomerPayment, 24], [simExpenseBill, 8], [simReceipt, 16], [simVendorPayment, 16], [simCashSale, 8]];
  function weightedAction() {
    var total = ACTIONS.reduce(function (s, a) { return s + a[1]; }, 0), r = rand() * total;
    for (var i = 0; i < ACTIONS.length; i++) { r -= ACTIONS[i][1]; if (r < 0) return ACTIONS[i][0]; }
    return ACTIONS[0][0];
  }

  // ---- alerts
  var active = {};  // key -> {building, level, tick}
  function raise(key, building, level, message, repeatEvery) {
    var cur = active[key];
    if (!cur || cur.level !== level || tickCount - cur.tick >= repeatEvery) {
      active[key] = { building: building, level: level, tick: tickCount };
      emit('alert', { building: building, level: level, message: message });
    }
  }
  function clear(key, message) {
    var cur = active[key];
    if (!cur) return;
    delete active[key];
    var still = Object.keys(active).some(function (k) { return active[k].building === cur.building; });
    if (!still) emit('alert', { building: cur.building, level: 'ok', message: message });
  }
  function checkAlerts() {
    var m = metrics();
    if (m.cash < 12000) raise('cash', 'bank', 'alert', T('cashCrit', { v: fmt(m.cash) }), 40);
    else if (m.cash < 25000 || (active.cash && m.cash < 28000)) raise('cash', 'bank', 'warn', T('cashWarn', { v: fmt(m.cash) }), 60);
    else clear('cash', T('cashOk'));

    var o90 = m.ar90Plus, pct = m.ar > 0 ? o90 / m.ar : 0, p100 = Math.round(pct * 100);
    if (o90 >= 25000 || pct >= 0.2 || (active.ar90 && active.ar90.level === 'alert' && pct >= 0.16)) raise('ar90', 'sales', 'alert', T('ar90Alert', { v: fmt(o90), p: p100 }), 60);
    else if (o90 >= 10000 || pct >= 0.1) raise('ar90', 'sales', 'warn', T('ar90Warn', { v: fmt(o90), p: p100 }), 90);
    else clear('ar90', T('ar90Ok'));

    var overdue = ap.filter(function (x) { return x.cents > 0 && x.dueIn < 0; });
    if (overdue.length) raise('apOverdue', 'procure', 'warn', T('apOver', { n: overdue.length, vendor: overdue[0].vendor, bill: overdue[0].bill }), 80);
    else clear('apOverdue', T('apOk'));

    var cr = lang === 'bg' ? m.currentRatio.toFixed(2).replace('.', ',') : m.currentRatio.toFixed(2);
    if (m.currentRatio < 1) raise('ratio', 'ledger', 'alert', T('ratioAlert', { v: cr }), 60);
    else if (m.currentRatio < 1.5) raise('ratio', 'ledger', 'warn', T('ratioWarn', { v: cr }), 80);
    else clear('ratio', T('ratioOk'));

    if (m.inventory < 20000 || (active.inv && m.inventory < 27000)) raise('inv', 'warehouse', 'warn', T('invWarn', { v: fmt(m.inventory) }), 80);
    else clear('inv', T('invOk'));
  }

  function advanceDay() {
    simDays++;
    if (dayOffset < MAX_OFFSET) dayOffset++;   // business date holds at period end (Oct 31); aging keeps moving
    ar.forEach(function (x) { x.daysOut++; });
    ap.forEach(function (x) { x.dueIn--; });
  }

  function _tick() {
    tickCount++;
    if (tickCount % TICKS_PER_DAY === 0) advanceDay();
    var e;
    if (tickCount % 28 === 14) e = simPayroll();
    else if (bal['1200'] < toC(32000)) e = simReceipt();
    else if (bal['1100'] > toC(130000)) e = simCustomerPayment(true);
    else if (bal['2000'] > toC(90000)) e = simVendorPayment();
    else e = weightedAction()();
    checkAlerts();
    return e;
  }

  // ---- team activity
  var TASKS = {
    sale: ['Posting credit sale {ref}', 'Осчетоводява продажба на кредит {ref}'],
    cashsale: ['Posting counter sale', 'Осчетоводява продажба в брой'],
    receipt: ['Applying customer payment {ref}', 'Отнася плащане от клиент {ref}'],
    grn: ['Posting goods receipt {ref}', 'Осчетоводява приемане на стоки {ref}'],
    bill: ['Posting vendor bill {ref}', 'Осчетоводява фактура {ref}'],
    vpay: ['Paying vendor bill {ref}', 'Плаща фактура {ref}'],
    payroll: ['Running payroll', 'Обработва и изплаща заплати'],
    tb: ['Reviewing the trial balance', 'Преглежда оборотната ведомост'],
    bankrec: ['Reconciling the bank statement', 'Съпоставя банковото извлечение'],
    figures: ['Collecting figures for the report', 'Събира данни за отчета'],
    receipts: ['Checking goods receipts', 'Проверява приемателни протоколи'],
    chase: ['Following up on overdue invoice {ref}', 'Проследява просрочена фактура {ref}'],
    slips: ['Matching packing slips with orders', 'Сверява приемни бележки с поръчки'],
    funding: ['Confirming payroll funding', 'Потвърждава осигуряването на средства за заплати'],
    approve: ['Approving sales entries', 'Одобрява записи за продажби'],
    schedule: ['Scheduling vendor payments', 'Планира плащания към доставчици'],
    deposits: ['Checking customer deposits', 'Проверява постъпления от клиенти'],
    inbound: ['Inspecting an inbound shipment', 'Проверява входяща доставка'],
    accruals: ['Submitting payroll accruals', 'Подава начисления за заплати']
  };
  // member, destination, kind, task key
  var WORK = [
    ['elena', 'reporting', 'report', 'tb'], ['elena', 'sales', 'entry', 'approve'],
    ['ana', 'ledger', 'report', 'bankrec'], ['ana', 'customers', 'cash', 'deposits'],
    ['desi', 'ledger', 'report', 'figures'],
    ['georgi', 'warehouse', 'goods', 'receipts'], ['georgi', 'bank', 'bill', 'schedule'],
    ['maria', 'customers', 'invoice', 'chase'],
    ['ivan', 'procure', 'goods', 'slips'], ['ivan', 'vendors', 'goods', 'inbound'],
    ['nikolai', 'bank', 'payroll', 'funding'], ['nikolai', 'ledger', 'entry', 'accruals']
  ];
  function renderTask(m) { var t = m._task; if (!t) return ''; var d = TASKS[t.k]; return d ? tpl(lang === 'bg' ? d[1] : d[0], t.v) : ''; }
  function emitTeam() { emit('team', { team: team }); }
  function startActivity(memberId, from, to, kind, tk, vars, entryId) {
    var m = teamById[memberId];
    if (!m) return null;
    m._timers.forEach(clearTimeout); m._timers = [];
    m._task = { k: tk, v: vars || {} };
    m.task = renderTask(m); m.status = 'walking';
    var t1 = setTimeout(function () { if (m.status === 'walking') { m.status = 'working'; emitTeam(); } }, 3000);
    var t2 = setTimeout(function () { m.status = 'idle'; m.task = ''; m._task = null; m._timers = []; emitTeam(); }, 8000);
    [t1, t2].forEach(function (t) { if (t && t.unref && typeof process !== 'undefined') t.unref(); });
    m._timers = [t1, t2];
    var ev = { memberId: memberId, from: from, to: to, kind: kind, task: m.task };
    if (entryId) ev.entryId = entryId;
    emitTeam();
    emit('activity', ev);
    return ev;
  }
  function _activityTick() {
    var idle = WORK.filter(function (w) { return teamById[w[0]].status === 'idle'; });
    if (!idle.length) return null;
    var w = pick(idle), vars = {};
    if (w[3] === 'chase') {
      var late = ar.filter(function (x) { return x.cents > 0; }).sort(function (a, b2) { return b2.daysOut - a.daysOut; })[0];
      vars.ref = late ? late.invoice : '';
    }
    return startActivity(w[0], teamById[w[0]].home, w[1], w[2], w[3], vars);
  }

  // ---- loop control
  var timer = null, atimer = null, running = false, speed = 1;
  function unref(t) { if (t && t.unref && typeof process !== 'undefined') t.unref(); }
  function schedule(first) {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!running || speed <= 0) return;
    var delay = first ? 2500 : (8000 + rand() * 5000) / speed;
    timer = setTimeout(function () {
      timer = null;
      try { _tick(); } catch (err) { if (root.console) console.error('[LW.engine] tick error', err); }
      schedule(false);
    }, delay);
    unref(timer);
  }
  function scheduleAct(first) {
    if (atimer) { clearTimeout(atimer); atimer = null; }
    if (!running || speed <= 0) return;
    var delay = first ? 5500 : (7000 + rand() * 5000) / speed;
    atimer = setTimeout(function () {
      atimer = null;
      try { _activityTick(); } catch (err) { if (root.console) console.error('[LW.engine] activity error', err); }
      scheduleAct(false);
    }, delay);
    unref(atimer);
  }
  function start() { if (running) return; running = true; schedule(true); scheduleAct(true); }
  function stop() { running = false; if (timer) { clearTimeout(timer); timer = null; } if (atimer) { clearTimeout(atimer); atimer = null; } }
  function setSpeed(mult) { speed = Math.max(0, Number(mult) || 0); if (running) { schedule(false); scheduleAct(false); } }

  // ---- language
  function applyLang() {
    var bg = lang === 'bg';
    Object.keys(accounts).forEach(function (c) { accounts[c].name = bg ? (ACC_BG[c] || ACC_EN[c]) : ACC_EN[c]; });
    scenarios.forEach(function (sc) {
      var src = bg ? (SC_BG[sc.id] || SC_EN[sc.id]) : SC_EN[sc.id];
      ['title', 'prompt', 'hint', 'explanation'].forEach(function (k) { sc[k] = bg ? nbspBg(src[k]) : src[k]; });
    });
    closeSteps.forEach(function (c) {
      var v = bg ? (CLOSE_BG[c.id] || CLOSE_EN[c.id]) : CLOSE_EN[c.id];
      c.title = v[0]; c.eta = v[1];
    });
    TEAM_DEF.forEach(function (d) {
      var m = teamById[d[0]];
      m.name = bg ? d[3] : d[1]; m.role = bg ? d[4] : d[2];
      if (m._task) m.task = renderTask(m);
    });
    journal.forEach(function (e) { if (e._mk) { var t = renderMemo(e._mk); if (t) e.memo = t; } });
    // active alerts keep their key; messages are generated fresh at the next raise
  }
  function setLang(l) {
    l = (l === 'bg') ? 'bg' : 'en';
    lang = l;
    LW.engine.lang = l;
    applyLang();
    emit('lang', { lang: l });
    emit('metrics', metrics());
    emit('team', { team: team });
    return l;
  }

  // ---------------------------------------------------------------- public API
  LW.engine = {
    on: on, off: off,
    accounts: accounts, journal: journal, scenarios: scenarios, closeSteps: closeSteps,
    team: team, lang: 'en', setLang: setLang,
    post: post, attempt: attempt, nextScenario: nextScenario,
    metrics: metrics, arAging: arAging, apDue: apDue, trialBalance: trialBalance,
    completeCloseStep: completeCloseStep,
    start: start, stop: stop, setSpeed: setSpeed,
    // extras
    getScenario: function (id) { return scById[id] || null; },
    isSolved: function (id) { return !!solved[id]; },
    date: dateStr,
    fmt: fmt,
    _tick: _tick, _activityTick: _activityTick,
    _seed: function (n) { seedState = n >>> 0; },
    _subledgerCheck: function () {
      return { arSum: r2(ar.reduce(function (s, x) { return s + x.cents; }, 0) / 100), arControl: b('1100'),
        apSum: r2(ap.reduce(function (s, x) { return s + x.cents; }, 0) / 100), apControl: b('2000') };
    }
  };

  // adopt the language already chosen by i18n.js (if loaded first); the UI also calls setLang explicitly
  (function initLang() {
    var il = LW.i18n && LW.i18n.lang;
    if (il === 'bg') setLang('bg'); else applyLang();
  })();

  // ---------------------------------------------------------------- load-time self checks
  (function selfCheck() {
    var log = function (m) { if (root.console) console.error('[LW.engine self-check] ' + m); };
    var seen = {}, perB = {};
    scenarios.forEach(function (sc) {
      if (seen[sc.id]) log('duplicate scenario id ' + sc.id); seen[sc.id] = true;
      if (!BSET[sc.building]) log(sc.id + ': bad building ' + sc.building);
      perB[sc.building] = (perB[sc.building] || 0) + 1;
      var lines = sc.lines, d = 0, c = 0;
      if (!lines || lines.length < 2) log(sc.id + ': fewer than 2 lines');
      (lines || []).forEach(function (l) {
        if (!accounts[l.acct]) log(sc.id + ': unknown account ' + l.acct);
        d += toC(l.dr); c += toC(l.cr);
      });
      if (d !== c) log('UNBALANCED scenario ' + sc.id + ': debits ' + d / 100 + ' credits ' + c / 100);
    });
    BUILDINGS.forEach(function (bd) { if ((perB[bd] || 0) < 2) log('building ' + bd + ' has fewer than 2 scenarios'); });
    closeSteps.forEach(function (s) { if (!scById[s.scenarioId]) log('close step ' + s.id + ' links unknown scenario'); });
    var sl = LW.engine._subledgerCheck();
    if (sl.arSum !== sl.arControl) log('AR subledger ' + sl.arSum + ' != control ' + sl.arControl);
    if (sl.apSum !== sl.apControl) log('AP subledger ' + sl.apSum + ' != control ' + sl.apControl);
    if (!metrics().trialBalanceOk) log('opening trial balance does not balance');
    if (bal['3100'] < 0) log('opening retained earnings is negative');
  })();
})(typeof window !== 'undefined' ? window : globalThis);
