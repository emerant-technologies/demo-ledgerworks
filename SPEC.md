# LedgerWorks — 3D Accounting Operations World (spec + contracts)

Interactive, animated isometric 3D "finance campus" in the style of a polished SaaS ops dashboard
(think WareTrack warehouse twin, but for accounting). Buildings = accounting processes. Couriers/vans drive
documents and cash between buildings along roads whenever a transaction posts. Dashboard overlays show live
metrics. User practices accounting by posting journal entries for scenarios; correct entries animate in the world
and move the metrics. Month-end close checklist drives progress.

Static site, no build step, opens from file:// or any static server. Plain `<script>` tags (no ES modules).

## Files and owners
| File | Owner agent | Purpose |
|---|---|---|
| `engine.js` | engine | Chart of accounts, ledger, validation, scenarios, simulation, metrics. No DOM, no THREE. |
| `world.js`  | world  | Three.js scene, buildings, roads, animated vehicles, picking, camera controls. No business logic. |
| `index.html`, `styles.css`, `ui.js` | ui | Dashboard overlay, panels, practice modal, wiring engine <-> world. |

Script order in index.html:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script src="engine.js"></script>
<script src="world.js"></script>
<script src="ui.js"></script>
```
Each file attaches to a shared global: `window.LW = window.LW || {}`.

## Building IDs (shared vocabulary — use exactly)
| id | Name | Process | Accent color |
|---|---|---|---|
| `sales` | Sales & Billing | Revenue, invoices, AR | `#2f6bff` |
| `procure` | Procurement | Vendor bills, AP | `#8b5cf6` |
| `warehouse` | Inventory | Inventory, COGS | `#f59e0b` |
| `bank` | Treasury | Cash, bank rec | `#10b981` |
| `payroll` | Payroll | Wages, accruals | `#ec4899` |
| `ledger` | General Ledger | Central tower, all postings land here | `#0ea5e9` |
| `reporting` | Reporting & Close | Trial balance, statements, close | `#6366f1` |
Plus off-map endpoints: `customers` (road edge left) and `vendors` (road edge right) — world renders them as gates/arrival points.

## engine.js contract — `LW.engine`
```js
LW.engine = {
  on(event, fn), off(event, fn),          // events below
  accounts,                                // { code: {code, name, type:'asset'|'liability'|'equity'|'revenue'|'expense', normal:'dr'|'cr', balance} }  balance signed in normal direction
  journal,                                 // array of entries, newest last
  post(entry) -> {ok:true, entry} | {ok:false, error},
     // entry: {memo, process:'<buildingId>', lines:[{acct:'1000', dr:0, cr:0}], flow?:[{from,to,kind,label}]}
     // validates: >=2 lines, every acct exists, debits==credits (to cent), amounts >=0, no line both dr&cr
     // assigns id 'JE-1001'..., date (simulated business date string), emits 'posted' {entry}
  scenarios,                               // array, see below
  nextScenario(buildingId?) -> scenario,   // random unsolved-or-repeatable scenario, optionally for building
  attempt(scenarioId, lines) -> {correct, feedback, expected, entry?}  // if correct, posts it (emits posted) and awards xp
  metrics() -> { cash, ar, ap, inventory, revenue, cogs, expenses, netIncome, grossMarginPct,
                 currentRatio, dso, dpo, workingCapital, trialBalanceOk, xp, level, streak, accuracyPct },
  arAging() -> [{customer, invoice, amount, daysOut, bucket:'0-30'|'31-60'|'61-90'|'90+'}],
  apDue()   -> [{vendor, bill, amount, dueInDays}],
  trialBalance() -> [{code,name,debit,credit}],
  closeSteps,                              // [{id, title, building, scenarioId, done:false, eta}]
  completeCloseStep(id),                   // marks done, emits 'close'
  start(), stop(),                         // background simulation: every 3-5s posts a realistic auto transaction
                                           // (credit sale, customer payment, vendor bill, vendor payment, inventory receipt, cash sale)
                                           // each with flow hops so world animates it. Keep balances sane (no negative cash spirals).
  setSpeed(mult),
}
```
Events: `posted` {entry, auto:boolean}, `metrics` (metrics obj, emit after every post), `xp` {xp, level, delta}, `close` {steps}, `alert` {building, level:'warn'|'alert', message} (e.g. cash below threshold, AR 90+ high, TB out of balance never happens since post validates).

Each entry may carry `flow`: ordered hops like
`[{from:'customers',to:'sales',kind:'invoice',label:'INV-2041'},{from:'sales',to:'ledger',kind:'entry',label:'JE-1012'}]`.
If missing, ui derives `[{from: entry.process, to:'ledger', kind:'entry'}]`.
Flow `kind` values: `invoice`, `bill`, `cash`, `goods`, `payroll`, `entry`, `report`.

Seed: realistic small company "Northwind Supply Co." ~30 accounts (1000 Cash, 1100 AR, 1150 Allowance, 1200 Inventory, 1300 Prepaid, 1500 Equipment, 1550 Accum Depr, 2000 AP, 2100 Accrued Liab, 2150 Wages Payable, 2200 Sales Tax Payable, 2300 Unearned Revenue, 2500 Loan, 3000 Common Stock, 3100 Retained Earnings, 4000 Sales Revenue, 4100 Service Revenue, 4900 Sales Discounts, 5000 COGS, 6000 Wages Exp, 6100 Rent Exp, 6200 Utilities, 6300 Depreciation Exp, 6400 Bad Debt Exp, 6500 Insurance Exp, 6600 Supplies Exp, 6900 Interest Exp...). Opening balances that balance. Seed ~8 open AR invoices across aging buckets and ~6 AP bills.

Scenarios (>=16, at least 2 per building), each:
`{id, building, title, prompt, difficulty:1-3, lines:[{acct,dr,cr}], hint, explanation, xp}`
Examples: credit sale + COGS (4 lines), customer payment w/ 2% discount, vendor bill for inventory, pay vendor, accrue wages, pay payroll w/ withholdings, prepaid insurance expiring, depreciation, bad debt allowance, unearned revenue recognition, bank fee from bank rec, interest accrual, sales tax collected, inventory write-down, closing revenue to RE.
`attempt` grading: order-independent, merge same-account lines, compare amounts to the cent; feedback says which account/side is wrong without dumping the answer unless asked (expected returned for "show answer").

closeSteps (6): Bank reconciliation (bank) → AP cutoff (procure) → Accruals (payroll) → Depreciation (ledger) → Revenue recognition (sales) → Financial statements (reporting). Each linked to a scenario; completing scenario completes step.

## world.js contract — `LW.world`
```js
LW.world = {
  init(containerEl),            // creates renderer filling container, resize-aware, starts RAF loop
  on(event, fn),                // 'select' (buildingId|null), 'hover' (buildingId|null)
  flow(hops, opts?) -> Promise, // animate each hop sequentially: vehicle/courier drives along road graph from->to,
                                // kind sets model+color: invoice=blue van w/ paper, bill=purple van, cash=green armored truck,
                                // goods=orange forklift/box truck, payroll=pink car, entry=small glowing cyan document drone flying to ledger tower,
                                // report=indigo drone. Floating label tag above vehicle (CSS2D-free: use canvas sprite).
  pulse(buildingId, color?),    // ring/glow burst at building
  setStatus(buildingId, 'ok'|'warn'|'alert'),  // small status beacon above building
  setBadge(buildingId, text),   // floating pill label above building (canvas sprite), e.g. "AR $48.2k"
  focus(buildingId),            // smooth camera tween to building
  zoom(delta), rotate(dirRadians), resetView(),
  getBuildingIds(),
}
```
Visual target: bright, clean isometric toy-world. Light grey-white ground, soft shadows (PCFSoft), hemisphere + directional light,
blue/white palette with per-building accent color, rounded-ish low-poly geometry (boxes with bevel-ish trims, roofs with ridges),
low-poly trees, road loop with lane dashes connecting all buildings, parking spots, small details (pallets of "paper stacks",
coin stacks at bank, server racks at ledger, chart billboard at reporting, cubes at warehouse). Ledger tower tallest in center.
Ambient idle life: a few vehicles always circulating, gentle bob on drones, rotating logo on ledger tower.
OrbitControls constrained (polar angle 35°–65°, zoom limits, damping, no going under ground). Orthographic-like feel acceptable
via PerspectiveCamera fov 30 from far away. Hover = outline/brighten + cursor pointer; click = select + emit.
Performance: share geometries/materials, cap pixelRatio at 2, <= ~300 meshes.

## ui.js / index.html / styles.css contract
Layout (fullscreen, world canvas behind, glass panels floating over it — mirror the WareTrack reference):
- Top bar: logo "LedgerWorks", search (accounts / JE ids / scenarios; Enter opens result), company switcher pill
  "Northwind Supply Co. · Oct 2026 · Close 2/6", live clock + "Live" dot + speed toggle (1x/2x/pause), XP/level pill, avatar "You · Staff Accountant".
- KPI cards row top-left (3–4): Cash, AR (DSO), Net Income MTD (gross margin %), Current ratio. Animated count-up, delta arrows.
- Map controls vertical stack (zoom +/−, rotate ↺ ↻, home).
- Right inspector panel when a building is selected: icon, name, accent; status chip; 5–6 key metrics for that process;
  recent entries for that process; buttons "Practice entry" (opens modal with nextScenario(building)), "Focus".
- Bottom-left "Month-end Close" tracker: horizontal stepper of the 6 close steps (like shipment tracking), current step highlighted,
  click step → opens its scenario. Side card summarizing current step.
- Bottom-right tabbed table: Journal (latest 6, auto rows flagged "auto"), AR Aging, AP Due, Trial Balance (with balanced ✓).
- Practice modal: scenario prompt, difficulty, xp; entry grid with rows (account dropdown with search by code/name, Debit, Credit),
  add/remove row, running totals with balance indicator, Check, Hint, Show answer, Next. On correct: confetti-lite, toast,
  close modal, world.flow animates the entry. On wrong: shake + feedback line.
- Toasts (bottom-center) for alerts and auto postings (throttled).
- Wiring: engine 'posted' → world.flow(entry.flow) + world.pulse(entry.process); metrics → KPIs, badges (setBadge on sales/bank/procure/warehouse/ledger),
  statuses from alerts; world 'select' → inspector. engine.start() on load.
- Style: Inter (Google Fonts), white glass cards (rgba(255,255,255,.88) + backdrop-blur + soft shadow + 16px radius), blue primary #2f6bff,
  small caps labels, tabular numbers. Responsive: on narrow widths panels collapse into bottom sheet; no horizontal scroll.
- Defensive: if LW.world failed (no WebGL), UI still works over a gradient background.
