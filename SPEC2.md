# LedgerWorks v2: bilingual, finance team, slower motion, 3-minute guided demo

This builds on SPEC.md (v1 contracts still hold unless changed here). The v1 app works. Keep it working.

Goals:
1. **Bilingual EN + BG.** Every visible string can switch live: UI, engine texts (accounts, scenarios, memos, alerts), world labels and signs.
2. **Slower and calmer.** Vehicles, drones and simulation run about half speed, staggered so different parts move at different times.
3. **Finance team at work.** Seven named accountants live in the world, walk between buildings carrying documents and show what they're doing. A Team panel lists them with live tasks.
4. **Guided 3-minute demo.** A scripted tour drives the real UI with a visible, high-contrast fake mouse that moves, clicks and types, plus bilingual captions. A control bar has Pause/Resume, Restart, progress and Exit. Pausing lets the user click around freely.

Currency stays `$`. Number format can follow locale (`en-US` / `bg-BG`).

## File ownership (one agent per row; do not edit other rows' files)
| Files | Owner |
|---|---|
| `engine.js` | engine agent |
| `world.js` | world agent |
| `i18n.js` (new), `ui.js`, `index.html`, `styles.css` | ui agent |
| `demo.js` (new), `demo.css` (new) | demo agent |

Script order in index.html (ui agent adds the new tags):
```html
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="demo.css">
... three.min.js, OrbitControls.js
<script src="i18n.js"></script>
<script src="engine.js"></script>
<script src="world.js"></script>
<script src="ui.js"></script>
<script src="demo.js"></script>
```

## Team roster (shared vocabulary; use these exact ids)
| id | EN name / role | BG name / role | home | color |
|---|---|---|---|---|
| `elena` | Elena Petrova, Controller | Елена Петрова, Финансов контрольор | `ledger` | `#0ea5e9` |
| `maria` | Maria Dimitrova, AR Specialist | Мария Димитрова, Специалист вземания | `sales` | `#2f6bff` |
| `georgi` | Georgi Ivanov, AP Specialist | Георги Иванов, Специалист задължения | `procure` | `#8b5cf6` |
| `ivan` | Ivan Georgiev, Inventory Accountant | Иван Георгиев, Счетоводител материални запаси | `warehouse` | `#f59e0b` |
| `ana` | Ana Koleva, Treasury Analyst | Ана Колева, Анализатор парични потоци | `bank` | `#10b981` |
| `nikolai` | Nikolai Stoyanov, Payroll Accountant | Николай Стоянов, Счетоводител ТРЗ | `payroll` | `#ec4899` |
| `desi` | Desislava Todorova, Reporting Analyst | Десислава Тодорова, Анализатор отчетност | `reporting` | `#6366f1` |

BG building names: sales `Продажби и фактуриране`, procure `Доставки`, warehouse `Материални запаси`, bank `Парични средства`, payroll `Заплати (ТРЗ)`, ledger `Главна книга`, reporting `Отчетност и приключване`, customers gate `КЛИЕНТИ`, vendors gate `ДОСТАВЧИЦИ`.

## engine.js changes (`LW.engine`)
- `setLang('en'|'bg')`, `lang`.
  - After switching, `accounts[code].name`, the scenario fields (`title`, `prompt`, `hint`, `explanation`), `closeSteps[].title`, `team[]` name and role, and existing journal `memo`s all return the new language. Store both languages and swap.
  - Grading feedback strings and alert messages come out in the current language.
  - Emit `lang` {lang}, then `metrics`.
  - Use proper Bulgarian accounting terminology, e.g. Разплащателна сметка, Вземания от клиенти, Стоки, Задължения към доставчици, Приходи от продажби, Себестойност на продажбите, Разходи за заплати, Амортизация, Неразпределена печалба.
- `team`: array `[{id, name, role, home, color, status:'idle'|'working'|'walking', task:'' }]` (localized).
- Every auto posting sets `entry.by = memberId`, the owner for that process.
- New event `activity` {memberId, from, to, kind, task, entryId?}:
  - Emit it for each auto posting: the owner walks the document, e.g. maria goes sales→ledger with an invoice.
  - Also emit non-posting work every ~7–12s, e.g. elena reviews the trial balance at reporting, ana reconciles the bank at ledger, desi collects figures from ledger, georgi checks receipts at warehouse.
  - `task` is a short localized phrase, e.g. "Posting vendor bill BILL-7706" / "Осчетоводява фактура BILL-7706".
- Set member `status` and `task` when an activity starts. Return to `idle` after ~8s. Emit `team` {team} on each change.
- Slower: auto posting delay at 1x becomes `(8000 + rand*5000)/speed`, first one after ~2.5s.
- The user's practice postings set `entry.by = 'you'`.
- Keep all v1 smoke tests passing. Add bilingual checks: every scenario and account has non-empty `bg` text, and `setLang` round-trips.

## world.js changes (`LW.world`)
- **Slower:** flow vehicles at about 50% of v1 speed, drones about 45%, ambient loop vehicles about 55%, emblem spin about 50%. Ambient vehicles stagger their start times. Keep `opts.speed`.
- **`setLabels(map)`:** `{sales:'…', …, customers:'…', vendors:'…'}`. Redraws building name sprites and the gate sign textures.
- **`setTeam(members)`:** members are `[{id,name,role,color,home}]`.
  - Creates or updates low-poly people: rounded body (capsule or cylinder) in the member's color, head, simple legs/arms swing while walking.
  - Each person has a small name-pill sprite (first name) and a tiny clipboard or doc they carry while walking.
  - Idle members stand or "work" near the entrance of their home building, with a gentle typing/idle bob and small offsets so they don't overlap.
  - Calling it again with new names (language switch) updates the labels.
- **`walk(memberId, toId, opts?)`** returns a Promise.
  - The person walks from current position along sidewalks or the road graph offset to the side of the lane, to the target building's entrance (or a gate).
  - They show a doc icon above while carrying, work there ~2s (bob plus a small status sprite with `opts.label`), then walk back home if `opts.returnHome !== false`.
  - Resolves when they arrive back, or at the target when not returning.
  - A new walk for the same member queues after the current one. Walking speed about 3.5 units/s.
- **`screenPos(id)`** returns `{x, y, visible}` in CSS pixels relative to the viewport, for any building id, gate, or team member id. The demo cursor uses this to aim.
- **`select(id)`** already exists. Keep it emitting `select`.
- **`highlightMember(id)`** briefly pulses a ring under that person.

## ui.js / i18n.js / index.html / styles.css changes
- **i18n.js** provides `LW.i18n = { lang, t(key, vars), setLang(lang), on(fn), fmtMoney(n), fmtNum(n, d), fmtDate(iso) }`.
  - Holds a full EN + BG dictionary for every UI string.
  - Initial lang comes from `?lang=bg|en`, then localStorage `lw-lang`, then `'en'`. Wrap storage in try/catch.
- **Top bar:** an `EN | BG` segmented switch.
  - On change: `i18n.setLang` → `engine.setLang` → `world.setLabels(...)` + `world.setTeam(engine.team)`, then re-render everything (KPIs, inspector, stepper, tables, team, open modal).
  - Also set `<html lang>`.
- **Team panel** (right side, top, below the top bar; a glass card):
  - Title "Finance team" / "Финансов екип". Seven rows, each with an avatar circle (initials, member color), name, role, a live status dot and a current task line (ellipsis).
  - A mini activity feed of the last 4 activities, with time and text.
  - Clicking a row calls `world.focus(member.home)` + `world.highlightMember(id)`.
  - When a building is selected, the inspector takes this slot; closing the inspector shows the team panel again.
  - On mobile it's one of the bottom-sheet tabs.
- **Wiring:**
  - engine `activity` → `world.walk(memberId, to, {label: task})` (guarded), and add the item to the feed.
  - engine `team` → re-render the team panel.
  - On load, call `world.setTeam(engine.team)` and `world.setLabels(...)` for the current language.
- **Slower UI:** KPI count-up about 900ms. Toasts are limited to one per 10s for auto stuff.
- **`LW.ui` API for the demo:**
  - `selectBuilding(id|null)`, `openPractice(scenarioId)`, `closeModal()`, `isModalOpen()`, `setTab('journal'|'ar'|'ap'|'tb')`, `setLang(lang)`, `getLang()`, `showTeam()`.
  - `queueScenario(id)`: the next "Practice entry" from the inspector opens this scenario instead of a random one.
- **Demo hooks:** put these exact `data-demo` attributes on the real elements. The demo depends on them.
  - Top bar: `lang-en`, `lang-bg`, `speed-pause`, `speed-1x`, `speed-2x`, `search`, `xp`.
  - KPI cards: `kpi-cash`, `kpi-ar`, `kpi-ni`, `kpi-cr`.
  - Map controls: `map-zoom-in`, `map-zoom-out`, `map-rotate-left`, `map-rotate-right`, `map-home`.
  - Inspector: `inspector`, `inspector-practice`, `inspector-focus`, `inspector-close`.
  - Team panel: `team-panel`, `team-member-<id>`, `team-feed`.
  - Close tracker: `close-tracker`, `close-step-<stepId>` (step ids: bank-rec, ap-cutoff, accruals, depreciation, revenue-rec, statements), `close-start`.
  - Table tabs: `tab-journal`, `tab-ar`, `tab-ap`, `tab-tb`, `table`.
  - Practice modal:
    - Containers and buttons: `modal`, `add-line`, `hint`, `show-answer`, `check`, `next`, `modal-close`, `feedback`.
    - Line fields: `line-<i>-account` (the account search input, i = 0-based row), `line-<i>-debit`, `line-<i>-credit`.
    - Account picker options: `acct-opt-<code>` (rendered while the dropdown for a row is open).
- **Programmatic input must work:**
  - Amount and account inputs react to `input` events (the demo sets `.value` and dispatches `new Event('input',{bubbles:true})` per character).
  - Focusing or typing into an account input opens the dropdown and filters it. Clicking an `acct-opt-*` element selects it, via a `click` handler, not only `mousedown`.
  - Check reads the current DOM/state.

## demo.js / demo.css (`LW.demo`)
- **Autostarts** about 1.5s after load, unless `?demo=0`.
- **Fake cursor:** a large, high-contrast arrow (black fill, thick white outline, soft drop shadow) with a yellow halo ring, `z-index` above everything, `pointer-events:none`.
  - Moves along eased bezier paths (about 600–1100ms per move, varied).
  - Click shows a press-scale plus an expanding ripple.
  - Typing shows a small floating "keystroke" chip next to the cursor.
- **Caption bar:** bottom-center, above toasts. Shows a scene title and a narration line in the current language (EN + BG text for every caption). Fades between captions.
- **Control bar:** small glass pill, top-center under the top bar.
  - "Guided tour" label, `⏸ Pause` / `▶ Resume`, `⟲ Restart` (reloads with `?demo=1`), a progress bar with `m:ss / 3:00`, the current scene name, and `✕ Exit tour`.
  - Labels are bilingual and follow `LW.i18n`.
- **Pause** freezes the script at the current step (timers paused, cursor dimmed). The user can then click anything.
  - Also auto-pause when a trusted (`isTrusted`) pointerdown happens outside the demo bar, with a caption: "Paused — explore freely, press Resume to continue."
  - Resume re-validates preconditions (e.g. modal closed by the user → reopen it).
- **Script** is about 180s total, built from helper primitives: `moveTo(target)`, `click(target)`, `type(target, text, msPerChar≈90)`, `wait(ms)`, `caption(sceneKey)`, `call(fn)`.
  - A target is a `data-demo` key, a building/team id (via `world.screenPos`, then `ui.selectBuilding` on click), or `{x,y}`.
  - Suggested scenes:
    1. **Welcome:** camera overview, cursor glides over the campus.
    2. **KPI tour:** hover each KPI card.
    3. **Finance team:** hover rows, click Maria → camera focuses her.
    4. **Sales:** click the Sales building → inspector → Practice entry with queued `sales-credit-sale` → type accounts and amounts line by line. Try one wrong amount first → Check → feedback → fix → Check → correct, then watch the flow.
    5. **AR Aging tab:** explain the buckets.
    6. **Close tracker:** click the Accruals step → type `payroll-accrue-wages` (6000 Dr 3800 / 2150 Cr 3800) → correct.
    7. **Map controls:** rotate and zoom.
    8. **Language:** switch to BG and say so in the caption (in BG). The rest continues in BG.
    9. **Depreciation step:** use Hint then Show answer → Check.
    10. **Trial Balance tab:** balanced ✓.
    11. **Team at work:** watch people walk.
    12. **Finale:** caption invites the user to explore, and the tour ends with the cursor fading out.
  - Read the exact scenario lines from `LW.engine.getScenario(id).lines` rather than hardcoding amounts.
- **Robustness:**
  - Every step is guarded: if an element is missing, skip it with `console.warn`, never throw.
  - Works without the world (positions fall back to screen center).
  - The cursor never blocks user clicks.
