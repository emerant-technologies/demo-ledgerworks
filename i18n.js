/* ==========================================================================
   LedgerWorks - i18n.js
   LW.i18n = { lang, t(key, vars), setLang(lang), on(fn), has(key),
               fmtMoney(n, dec), fmtMoneyK(n), fmtNum(n, d), fmtDate(iso), fmtMonth(iso) }
   Full EN + BG dictionary for every UI string. Engine texts (accounts, scenarios,
   memos, alerts) are localized by LW.engine.setLang; world labels via LW.world.setLabels.
   ========================================================================== */
(function () {
  'use strict';
  const LW = (window.LW = window.LW || {});

  const D = { en: {}, bg: {} };
  // def(key, en, bg)
  function def(key, en, bg) { D.en[key] = en; D.bg[key] = bg; }

  /* ---- app / top bar ---- */
  def('app.title', 'LedgerWorks', 'LedgerWorks');
  def('app.home', 'LedgerWorks home', 'LedgerWorks - начало');
  def('search.ph', 'Search accounts, JEs, scenarios', 'Сметки, записи, сценарии');
  def('search.aria', 'Search accounts, journal entries and scenarios', 'Търсене на сметки, счетоводни записи и сценарии');
  def('search.buildings', 'Buildings', 'Сгради');
  def('search.accounts', 'Accounts', 'Сметки');
  def('search.entries', 'Journal entries', 'Счетоводни записи');
  def('search.scenarios', 'Practice scenarios', 'Практически сценарии');
  def('search.balance', 'balance', 'салдо');
  def('search.none', 'No results for "{q}"', 'Няма резултати за "{q}"');
  def('co.name', 'Northwind Supply Co.', 'Нордуинд Съплай ООД');
  def('co.mark', 'N', 'Н');
  def('co.close', 'Close', 'Приключване');
  def('co.switch', 'Switch company', 'Смяна на фирма');
  def('co.only', 'Only one company is available in this practice world.', 'В този практически свят има само една фирма.');
  def('live.live', 'Live', 'На живо');
  def('live.paused', 'Paused', 'На пауза');
  def('speed.aria', 'Simulation speed', 'Скорост на симулацията');
  def('speed.pause', 'Pause', 'Пауза');
  def('speed.normal', 'Normal speed', 'Нормална скорост');
  def('speed.double', 'Double speed', 'Двойна скорост');
  def('lang.aria', 'Language', 'Език');
  def('xp.unit', 'XP', 'т.');
  def('xp.lv', 'Lv {n}', 'Ниво {n}');
  def('xp.tip', 'Level {level} · {xp} XP · streak {streak} · accuracy {acc}%', 'Ниво {level} · {xp} точки · серия {streak} · точност {acc}%');
  def('xp.levelUp', 'Level up!', 'Ново ниво!');
  def('xp.reached', 'You reached level {n} - {role}', 'Достигнахте ниво {n} - {role}');
  def('me.name', 'You', 'Вие');
  def('me.init', 'YO', 'ВИ');
  def('role.0', 'Staff Accountant', 'Счетоводител');
  def('role.1', 'Senior Accountant', 'Старши счетоводител');
  def('role.2', 'Accounting Manager', 'Счетоводен мениджър');
  def('role.3', 'Controller', 'Финансов контрольор');
  def('role.4', 'CFO', 'Финансов директор');

  /* ---- buildings / gates / status ---- */
  def('b.sales.name', 'Sales & Billing', 'Продажби и фактуриране');
  def('b.sales.proc', 'Revenue, invoices, AR', 'Приходи, фактури, вземания');
  def('b.procure.name', 'Procurement', 'Доставки');
  def('b.procure.proc', 'Vendor bills, AP', 'Фактури от доставчици, задължения');
  def('b.warehouse.name', 'Inventory', 'Материални запаси');
  def('b.warehouse.proc', 'Inventory, COGS', 'Запаси, себестойност');
  def('b.bank.name', 'Treasury', 'Парични средства');
  def('b.bank.proc', 'Cash, bank rec', 'Каса, банково съгласуване');
  def('b.payroll.name', 'Payroll', 'Заплати (ТРЗ)');
  def('b.payroll.proc', 'Wages, accruals', 'Работни заплати, начисления');
  def('b.ledger.name', 'General Ledger', 'Главна книга');
  def('b.ledger.proc', 'Central tower, all postings land here', 'Централна кула, всички записи се събират тук');
  def('b.reporting.name', 'Reporting & Close', 'Отчетност и приключване');
  def('b.reporting.proc', 'Trial balance, statements, close', 'Оборотна ведомост, отчети, приключване');
  def('gate.customers', 'CUSTOMERS', 'КЛИЕНТИ');
  def('gate.vendors', 'VENDORS', 'ДОСТАВЧИЦИ');
  def('status.ok', 'Operational', 'В норма');
  def('status.warn', 'Needs attention', 'Изисква внимание');
  def('status.alert', 'Action required', 'Необходимо действие');
  def('badge.ar', 'AR', 'Вземания');
  def('badge.cash', 'Cash', 'Пари');
  def('badge.ap', 'AP', 'Задълж.');
  def('badge.inv', 'Inv', 'Запаси');
  def('badge.ni', 'NI', 'Печалба');

  /* ---- KPIs ---- */
  def('kpi.aria', 'Key metrics', 'Основни показатели');
  def('kpi.cash', 'Cash', 'Парични средства');
  def('kpi.ar', 'Receivables', 'Вземания');
  def('kpi.ni', 'Net Income MTD', 'Нетна печалба');
  def('kpi.cr', 'Current Ratio', 'Ликвидност');
  def('kpi.sub.wc', 'Working capital {v}', 'Обор. капитал {v}');
  def('kpi.sub.dso', 'DSO {n} days', 'Събиране {n} дни');
  def('kpi.sub.gm', 'Gross margin {v}', 'Брутен марж {v}');
  def('kpi.sub.dpo', 'DPO {n} days', 'Плащане {n} дни');
  def('kpi.nochange', 'No change', 'Без промяна');
  def('kpi.deltaTip', 'Change since you opened the dashboard', 'Промяна от отварянето на таблото');

  /* ---- map ---- */
  def('map.aria', 'Map controls', 'Управление на картата');
  def('map.zoomIn', 'Zoom in', 'Приближи');
  def('map.zoomOut', 'Zoom out', 'Отдалечи');
  def('map.rotL', 'Rotate left', 'Завърти наляво');
  def('map.rotR', 'Rotate right', 'Завърти надясно');
  def('map.home', 'Reset view', 'Начален изглед');

  /* ---- mobile sheet ---- */
  def('sheet.aria', 'Panels', 'Панели');
  def('sheet.handle', 'Expand or collapse panel', 'Разгъване или свиване на панела');
  def('sheet.inspect', 'Inspector', 'Сграда');
  def('sheet.team', 'Team', 'Екип');
  def('sheet.ledger', 'Ledger', 'Книга');
  def('sheet.close', 'Close', 'Приключване');

  /* ---- inspector ---- */
  def('insp.aria', 'Building inspector', 'Информация за сградата');
  def('insp.close', 'Close inspector', 'Затвори панела');
  def('insp.selectTitle', 'Select a building', 'Изберете сграда');
  def('insp.selectBody', 'Tap any building in the campus to inspect its process, metrics and recent entries.', 'Докоснете сграда в кампуса, за да видите процеса, показателите и последните записи.');
  def('insp.nPosted', '{n} entries posted', '{n} осчетоводени записа');
  def('insp.recent', 'Recent entries', 'Последни записи');
  def('insp.noEntries', 'No entries for this process yet.', 'Все още няма записи за този процес.');
  def('insp.practice', 'Practice entry', 'Практически запис');
  def('insp.focus', 'Focus', 'Фокус');
  def('im.revMtd', 'Revenue MTD', 'Приходи (месец)');
  def('im.receivables', 'Receivables', 'Вземания');
  def('im.dso', 'DSO', 'Срок на събиране');
  def('im.openInv', 'Open invoices', 'Отворени фактури');
  def('im.over90', '90+ days', 'Над 90 дни');
  def('im.grossMargin', 'Gross margin', 'Брутен марж');
  def('im.payables', 'Payables', 'Задължения');
  def('im.dpo', 'DPO', 'Срок на плащане');
  def('im.openBills', 'Open bills', 'Неплатени фактури');
  def('im.due7', 'Due in 7 days', 'Падеж до 7 дни');
  def('im.overdue', 'Overdue', 'Просрочени');
  def('im.entries', 'Entries posted', 'Осчетоводени записи');
  def('im.inventory', 'Inventory', 'Материални запаси');
  def('im.cogsMtd', 'COGS MTD', 'Себестойност (месец)');
  def('im.grossProfit', 'Gross profit', 'Брутна печалба');
  def('im.turns', 'Turns (MTD)', 'Оборот на запасите');
  def('im.cashBalance', 'Cash balance', 'Парични средства');
  def('im.workingCap', 'Working capital', 'Оборотен капитал');
  def('im.currentRatio', 'Current ratio', 'Текуща ликвидност');
  def('im.cashApCover', 'Cash / AP cover', 'Покритие на задълженията');
  def('im.arCollect', 'AR to collect', 'Вземания за събиране');
  def('im.wagesExp', 'Wages expense', 'Разходи за заплати');
  def('im.wagesPay', 'Wages payable', 'Задължения за заплати');
  def('im.accrued', 'Accrued liabilities', 'Начислени задължения');
  def('im.totalExp', 'Total expenses', 'Общо разходи');
  def('im.payrollRev', 'Payroll / revenue', 'Заплати / приходи');
  def('im.jeCount', 'Journal entries', 'Счетоводни записи');
  def('im.accounts', 'Accounts', 'Сметки');
  def('im.totDr', 'Total debits', 'Общо дебит');
  def('im.totCr', 'Total credits', 'Общо кредит');
  def('im.tb', 'Trial balance', 'Оборотна ведомост');
  def('im.netIncome', 'Net income', 'Нетна печалба');
  def('im.revenue', 'Revenue', 'Приходи');
  def('im.closeProg', 'Close progress', 'Напредък по приключването');
  def('u.days', '{n} days', '{n} дни');
  def('tb.balancedOk', 'Balanced ✓', 'Балансирана ✓');
  def('tb.off', 'Off', 'Небалансирана');
  def('tb.outOfBalance', 'Out of balance', 'Небалансирана');

  /* ---- team panel ---- */
  def('team.title', 'Finance team', 'Финансов екип');
  def('team.feed', 'Activity', 'Дейност');
  def('team.feedEmpty', 'Waiting for the first task...', 'Изчакване на първата задача...');
  def('team.activeCount', '{n}/{total} active', '{n}/{total} активни');
  def('team.status.idle', 'Idle', 'Свободен');
  def('team.status.working', 'Working', 'Работи');
  def('team.status.walking', 'On the move', 'В движение');
  def('team.elena.name', 'Elena Petrova', 'Елена Петрова');
  def('team.elena.role', 'Controller', 'Финансов контрольор');
  def('team.maria.name', 'Maria Dimitrova', 'Мария Димитрова');
  def('team.maria.role', 'AR Specialist', 'Специалист вземания');
  def('team.georgi.name', 'Georgi Ivanov', 'Георги Иванов');
  def('team.georgi.role', 'AP Specialist', 'Специалист задължения');
  def('team.ivan.name', 'Ivan Georgiev', 'Иван Георгиев');
  def('team.ivan.role', 'Inventory Accountant', 'Счетоводител материални запаси');
  def('team.ana.name', 'Ana Koleva', 'Ана Колева');
  def('team.ana.role', 'Treasury Analyst', 'Анализатор парични потоци');
  def('team.nikolai.name', 'Nikolai Stoyanov', 'Николай Стоянов');
  def('team.nikolai.role', 'Payroll Accountant', 'Счетоводител ТРЗ');
  def('team.desi.name', 'Desislava Todorova', 'Десислава Тодорова');
  def('team.desi.role', 'Reporting Analyst', 'Анализатор отчетност');
  def('kind.invoice', 'Invoice', 'Фактура');
  def('kind.bill', 'Vendor bill', 'Фактура от доставчик');
  def('kind.cash', 'Cash', 'Плащане');
  def('kind.goods', 'Goods', 'Стоки');
  def('kind.payroll', 'Payroll', 'Заплати');
  def('kind.entry', 'Journal entry', 'Счетоводен запис');
  def('kind.report', 'Report', 'Отчет');
  def('kind.other', 'Task', 'Задача');

  /* ---- close tracker ---- */
  def('close.title', 'Month-end Close', 'Приключване на месеца');
  def('close.bank-rec', 'Bank reconciliation', 'Банково съгласуване');
  def('close.ap-cutoff', 'AP cutoff', 'Отсичане на задълженията');
  def('close.accruals', 'Accruals', 'Начисления');
  def('close.depreciation', 'Depreciation', 'Амортизации');
  def('close.revenue-rec', 'Revenue recognition', 'Признаване на приходи');
  def('close.statements', 'Financial statements', 'Финансови отчети');
  def('close.stepAria', 'Step {n}: {title}', 'Стъпка {n}: {title}');
  def('close.done', 'Done', 'Готово');
  def('close.current', 'Current step · {i} of {n}', 'Текуща стъпка · {i} от {n}');
  def('close.fallbackPrompt', 'Complete this step to move the close forward.', 'Изпълнете тази стъпка, за да продължи приключването.');
  def('close.start', 'Start entry', 'Започни записа');
  def('close.allDone', 'All steps complete', 'Всички стъпки са изпълнени');
  def('close.closedTitle', 'Books are closed for the month', 'Книгите са приключени за месеца');
  def('close.closedBody', 'Financial statements are ready in Reporting & Close. Nice work.', 'Финансовите отчети са готови в Отчетност и приключване. Добра работа.');
  def('close.closed', 'Closed', 'Приключен');
  def('close.complete', 'Complete', 'Завършен');
  def('close.inProgress', 'In progress', 'В процес');
  def('close.steps', '{done}/{n} steps', '{done}/{n} стъпки');

  /* ---- tables ---- */
  def('tbl.aria', 'Ledger tables', 'Таблици на книгата');
  def('tab.journal', 'Journal', 'Журнал');
  def('tab.ar', 'AR Aging', 'Вземания по възраст');
  def('tab.ap', 'AP Due', 'Задължения');
  def('tab.tb', 'Trial Balance', 'Оборотна ведомост');
  def('tbl.nEntries', '{n} entries', '{n} записа');
  def('tbl.nInvoices', '{n} open invoices', '{n} отворени фактури');
  def('tbl.nBills', '{n} open bills', '{n} неплатени фактури');
  def('tbl.nAccounts', '{n} accounts', '{n} сметки');
  def('tbl.entry', 'Entry', 'Запис');
  def('tbl.memo', 'Memo', 'Основание');
  def('tbl.process', 'Process', 'Процес');
  def('tbl.amount', 'Amount', 'Сума');
  def('tbl.auto', 'auto', 'авто');
  def('tbl.noEntries', 'No entries yet. Practice an entry or wait for the simulation.', 'Още няма записи. Упражнете запис или изчакайте симулацията.');
  def('tbl.latest6', 'Latest 6 postings', 'Последните 6 записа');
  def('tbl.ledgerBalanced', 'Ledger balanced', 'Книгата е балансирана');
  def('tbl.customer', 'Customer', 'Клиент');
  def('tbl.invoice', 'Invoice', 'Фактура');
  def('tbl.days', 'Days', 'Дни');
  def('tbl.bucket', 'Bucket', 'Група');
  def('tbl.noAr', 'No open receivables.', 'Няма отворени вземания.');
  def('tbl.total', 'Total', 'Общо');
  def('tbl.over90', '90+ days', 'Над 90 дни');
  def('tbl.vendor', 'Vendor', 'Доставчик');
  def('tbl.bill', 'Bill', 'Фактура');
  def('tbl.due', 'Due', 'Падеж');
  def('tbl.noAp', 'No bills outstanding.', 'Няма неплатени фактури.');
  def('tbl.due7', 'Due within 7 days', 'Падеж до 7 дни');
  def('tbl.code', 'Code', 'Код');
  def('tbl.account', 'Account', 'Сметка');
  def('tbl.debit', 'Debit', 'Дебит');
  def('tbl.credit', 'Credit', 'Кредит');
  def('tbl.totals', 'Totals', 'Общо');
  def('ap.overdue', 'Overdue {n}d', 'Просрочена {n} дни');
  def('ap.today', 'Due today', 'Пада днес');
  def('ap.in', 'In {n}d', 'След {n} дни');

  /* ---- account types ---- */
  def('type.asset', 'asset', 'актив');
  def('type.liability', 'liability', 'пасив');
  def('type.equity', 'equity', 'капитал');
  def('type.revenue', 'revenue', 'приход');
  def('type.expense', 'expense', 'разход');

  /* ---- difficulty ---- */
  def('diff.1', 'Easy', 'Лесно');
  def('diff.2', 'Medium', 'Средно');
  def('diff.3', 'Hard', 'Трудно');

  /* ---- practice modal ---- */
  def('pm.eyebrow', 'Practice entry', 'Практически запис');
  def('pm.difficulty', 'Difficulty', 'Трудност');
  def('pm.addLine', 'Add line', 'Добави ред');
  def('pm.debits', 'Debits', 'Дебит');
  def('pm.credits', 'Credits', 'Кредит');
  def('pm.enterAmounts', 'Enter amounts', 'Въведете суми');
  def('pm.balanced', 'Balanced', 'Балансирано');
  def('pm.outBy', 'Out by {v}', 'Разлика {v}');
  def('pm.hint', 'Hint', 'Подсказка');
  def('pm.hintLabel', 'Hint:', 'Подсказка:');
  def('pm.hintFallback', 'Think about which accounts change and whether each normally carries a debit or a credit balance.', 'Помислете кои сметки се променят и дали обичайното им салдо е дебитно или кредитно.');
  def('pm.showAnswer', 'Show answer', 'Покажи отговора');
  def('pm.answer', 'Answer', 'Отговор');
  def('pm.drShort', 'Dr', 'Дт');
  def('pm.crShort', 'Cr', 'Кт');
  def('pm.next', 'Next scenario', 'Следващ сценарий');
  def('pm.check', 'Check entry', 'Провери записа');
  def('pm.accountPh', 'Search account by code or name', 'Търсене на сметка по код или име');
  def('pm.debitAmount', 'Debit amount', 'Сума по дебит');
  def('pm.creditAmount', 'Credit amount', 'Сума по кредит');
  def('pm.removeLine', 'Remove line', 'Премахни реда');
  def('pm.noMatch', 'No matching account', 'Няма съвпадаща сметка');
  def('pm.needTwo', 'Pick an account and an amount on at least two lines.', 'Изберете сметка и сума поне на два реда.');
  def('pm.engineError', 'The engine could not grade this entry: {msg}', 'Системата не успя да оцени записа: {msg}');
  def('pm.correctPosting', 'Correct! Posting to the ledger...', 'Вярно! Осчетоводяване в главната книга...');
  def('pm.correctToast', 'Correct +{n} XP', 'Вярно +{n} т.');
  def('pm.postedToast', 'Entry posted to the General Ledger.', 'Записът е осчетоводен в Главната книга.');
  def('pm.notQuite', 'Not quite - check the accounts and sides.', 'Не съвсем - проверете сметките и страните.');
  def('pm.nudge', 'Need a nudge? Try the hint.', 'Нужна е помощ? Опитайте подсказката.');
  def('pm.noScenario', 'No scenario available', 'Няма наличен сценарий');
  def('pm.noScenarioBody', 'The engine did not return a practice scenario.', 'Системата не върна практически сценарий.');
  def('je.eyebrow', 'Journal entry', 'Счетоводен запис');
  def('je.aria', 'Journal entry {id}', 'Счетоводен запис {id}');
  def('common.close', 'Close', 'Затвори');

  /* ---- toasts / fallback / fatal ---- */
  def('toast.autoPosted', '{id} auto-posted', '{id} е осчетоводен автоматично');
  def('toast.alertTitle', '{b} alert', '{b}: тревога');
  def('toast.warnTitle', '{b} warning', '{b}: предупреждение');
  def('toast.noWebglTitle', '3D view unavailable', '3D изгледът не е наличен');
  def('toast.noWebglBody', 'Showing the dashboard without the animated campus.', 'Таблото се показва без анимирания кампус.');
  def('toast.mapNeedsWebgl', 'Map controls need WebGL.', 'Управлението на картата изисква WebGL.');
  def('toast.focusNeedsWebgl', 'Camera focus needs WebGL.', 'Фокусът на камерата изисква WebGL.');
  def('fb.note', '3D view unavailable on this device. The dashboard still works - pick a building.', '3D изгледът не е наличен на това устройство. Таблото работи - изберете сграда.');
  def('fatal.title', 'LedgerWorks engine did not load', 'Счетоводният двигател не се зареди');
  def('fatal.body', 'The accounting engine (<code>engine.js</code>) is missing or failed to run, so the dashboard has nothing to show. Check that the file sits next to <code>index.html</code> and open the browser console for errors.', 'Счетоводният двигател (<code>engine.js</code>) липсва или не се стартира, затова таблото няма какво да покаже. Проверете дали файлът е до <code>index.html</code> и отворете конзолата на браузъра за грешки.');

  /* ---- months ---- */
  const MEN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const MEN_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MEN_BG = ['ян.', 'фев.', 'мар.', 'апр.', 'май', 'юни', 'юли', 'авг.', 'сеп.', 'окт.', 'ное.', 'дек.'];
  MEN.forEach((k, i) => def('mon.' + k, MEN_EN[i], MEN_BG[i]));

  /* ---- language state ---- */
  const LS = 'lw-lang';
  function norm(l) { l = String(l || '').toLowerCase().slice(0, 2); return l === 'bg' || l === 'en' ? l : null; }
  function initialLang() {
    let l = null;
    try { l = norm(new URLSearchParams(location.search).get('lang')); } catch (e) { /* noop */ }
    if (!l) { try { l = norm(localStorage.getItem(LS)); } catch (e) { /* noop */ } }
    return l || 'bg';
  }

  const listeners = [];
  const I = {
    lang: initialLang(),
    dict: D,
    t: function (key, vars) {
      let s = D[I.lang][key];
      if (s == null) s = D.en[key];
      if (s == null) return key;
      if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
      return s;
    },
    has: function (key) { return D[I.lang][key] != null; },
    setLang: function (l) {
      l = norm(l);
      if (!l) return I.lang;
      const changed = l !== I.lang;
      I.lang = l;
      try { localStorage.setItem(LS, l); } catch (e) { /* noop */ }
      document.documentElement.lang = l;
      if (changed) {
        listeners.slice().forEach((fn) => { try { fn(l); } catch (e) { console.warn('[i18n] listener failed', e); } });
      }
      return l;
    },
    on: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
  };

  /* ---- number / date formats ---- */
  const loc = () => (I.lang === 'bg' ? 'bg-BG' : 'en-US');
  const nfCache = {};
  function nf(d) {
    const key = loc() + d;
    if (!nfCache[key]) {
      const opts = { minimumFractionDigits: d, maximumFractionDigits: d };
      try { nfCache[key] = new Intl.NumberFormat(loc(), Object.assign({ useGrouping: 'always' }, opts)); }
      catch (e) { nfCache[key] = new Intl.NumberFormat(loc(), opts); }
    }
    return nfCache[key];
  }
  const finite = (n) => (typeof n === 'number' && isFinite(n) ? n : 0);
  I.fmtNum = function (n, d) { return nf(d || 0).format(finite(n)); };
  I.fmtMoney = function (n, dec) {
    n = finite(n);
    const body = nf(dec ? 2 : 0).format(Math.abs(n));
    const neg = n < 0 && Math.abs(n) >= (dec ? 0.005 : 0.5) ? '-' : '';
    return I.lang === 'bg' ? neg + body + ' €' : neg + '€' + body;
  };
  I.fmtMoneyK = function (n) {
    n = finite(n);
    const a = Math.abs(n), s = n < 0 ? '-' : '';
    if (I.lang === 'bg') {
      if (a >= 1e6) return s + I.fmtNum(a / 1e6, 2) + ' млн. €';
      if (a >= 1e3) return s + I.fmtNum(a / 1e3, 1) + ' хил. €';
      return s + I.fmtNum(a, 0) + ' €';
    }
    if (a >= 1e6) return s + '€' + (a / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return s + '€' + (a / 1e3).toFixed(1) + 'k';
    return s + '€' + I.fmtNum(a, 0);
  };
  function parseIso(s) {
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(s || ''));
    return m ? { y: +m[1], m: +m[2], d: m[3] ? +m[3] : 0 } : null;
  }
  I.fmtDate = function (iso) {
    const p = parseIso(iso);
    if (!p || p.m < 1 || p.m > 12) return iso == null ? '' : String(iso);
    const mon = I.t('mon.' + MEN[p.m - 1]);
    if (!p.d) return mon + ' ' + p.y;
    return I.lang === 'bg' ? p.d + ' ' + mon + ' ' + p.y : mon + ' ' + p.d + ', ' + p.y;
  };
  I.fmtMonth = function (iso) {
    const p = parseIso(iso);
    if (!p || p.m < 1 || p.m > 12) return '';
    return I.t('mon.' + MEN[p.m - 1]) + ' ' + p.y;
  };

  document.documentElement.lang = I.lang;
  LW.i18n = I;
})();
