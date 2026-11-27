# Planner
Campaign planner for the user's girlfriend (marketing project manager, uses it on a Mac in a browser tab). UI in English; the user writes in Russian. Single-file HTML/CSS/JS (`index.html`), no build, no backend. Git repo `Doppelgvnger/Planner`, branch `main`, lives in `H:\GIT\Planner` (`H:\Claude Code\Projects\Planner` is a junction to it).

## Run / deploy
- Live: https://doppelgvnger.github.io/Planner/ — GitHub Pages from `main` root; `git push` deploys in ~1 min.
- Local: open `index.html` (works from `file://`). Test in headless Firefox with a temp profile: `firefox -headless -no-remote -profile <tmp> --window-size=W,H --screenshot out.png <url>`; seed data by injecting a `<script>` that writes localStorage into a scratch copy.

## Workflow
- Bigger features: propose a plan in Russian, wait for the user's "green light", then build. Small fixes: just do them.
- One commit per change, then push; verify in Firefox (light + dark, 375/1280/1920 when layout changes).
- Never commit `planner-backup-*.json` (her real data; gitignored).
- **Every new or changed animation gets a stutter check before shipping** (she notices 1px jumps): run `dev/probe.js` on it — it pauses the animation at each 10ms step and compares every nearby element with the state just before and just after. Nothing may step >1px on the first or last frame, no spike mid-way. Usual culprits: a folding box's padding/borders (use `foldTo`), grid gaps (negative margins clamp in grids), size changes outside the FLIP (column heights, row heights), layer promotion during transform transitions (keep `will-change`), measuring after a parent already started moving.
- Move things with `transform` on an element that has its own layer (`will-change: transform`), never by animating `left`/`top`: a layout-animated box re-snaps its text to whole pixels every frame, so the text shivers 1px while the box glides. Moves that carry text go in whole pixels: `pixelPath(dx, dy, duration)` (glide curve sampled per frame, rounded, held with `steps(1)`), and short lifts use `steps(n, jump-none)` so each step is 1px; a layer drawn between pixels resamples its text (soft, bolder letters that sharpen as it lands). Animate width/height only when the size really changes. Measure start positions exactly (inline style values or `getBoundingClientRect`, not `offsetLeft`, which rounds). Anything that disappears in a change fades out where it was (a stand-in), never vanishes in one frame; anything new fades in. No scale on those fades (text that scales re-rasterises and looks like it shrinks/bolds). Sticky children (`.bar-text`) get their own compositor layer that lags a moving parent: pin them (`position: relative` at their current offset) for the move, then hand them back.

## Layout
- `dev/probe.js` — stutter detector for animations (dev only, not loaded by the app).
- `index.html` — everything. Tabs: Calendar, Campaigns, Timeline, Tasks, Notes (`showView`, open tab in URL hash). They share `campaigns`, the dialogs and the DTC/Sephora filter; `renderAll()` redraws only the visible tab (`showView` redraws a tab when shown).
- Calendar tab: open dated tasks (shown campaigns + General, done hidden, no campaign bars) in Month (6-week grid, ≤3 chips then "+N more" → day popover with an add field) or Week (7 columns of cards, "+ Add"); click = task dialog, drag = new due date, added tasks go to General. `renderCalendar`, `calFlip` (= flipRows), `calState.mode` in `planner.calendar.v1`.
- Notes tab: list (search, new, drag to reorder) + page (title + `richField(..., { fixedBar: true })`). `notes` in `planner.notes.v1` `[{id,title,body,createdAt,updatedAt}]` in list order; search highlight via `CSS.highlights` ('nt-find').
- Campaigns tab: Current | Past switch (`#camp-mode`, `campMode`). Board = running/upcoming; Past (`renderPast`) = every ended campaign (parked too; parked ones also stay in the Parked rail) by year (fold via `foldTo`, open years in `planner.past.v1`) and quarter of `timing(c).last`, with a search.
- First visit (`FIRST_VISIT`: no setup/campaigns/General/notes in this browser): `#onb-dlg` steps markets → destinations (+ what to call them) → example or blank (`onbFinish`). `seedExample()` adds campaigns / General tasks / a "Start here" note marked `example: true`; the yellow `#ex-banner` clears them. Existing planners never see it.
- Pet (Mochi): face button `#open-pet` right of Settings + house dialog `#pet-dlg`. `save()` calls `afterSave` = `petSync`: every task done once becomes a snack in `pet.pantry` (flies from the last click to the face); fed by drag / click / Feed until full. Belly/mood decay on weekdays only (`petDecay`, pure function of time), never dies; starts as an egg the first snack hatches; levels unlock hats. `planner.pet.v1` `{name,born,xp,belly,mood,at,seen[],pantry[],eaten,hat}`, in Backup.
- Tasks tab: sidebar (All / Urgent / This week = next 7 days incl. overdue / running campaigns, plus parked or ended ones with open tasks) + list + General panel; the seam button merges General into the list (gooey SVG filter `#tk-goo` on `.tk-bg`, panel shapes synced by `syncTkBg`). Right-hand editor autosaves; Cmd/Shift-click picks several → bulk bar.
- `favicon.svg` (also the header mark), `favicon-32.png`, `apple-touch-icon.png` (PNG fallbacks drawn with PowerShell System.Drawing): dark square, three phase circles in `#18c2b4`.

## Data (localStorage, per browser + address; moved between them via Backup → Export/Import)
- `planner.setup.v1` (Settings): `{segments[{id,code,flag,name}], dests[{id,name,color}], destLabel, pet}`; defaults = the original US/CA·EN/CA·FR/BR/MX + DTC/Sephora. `SEGMENTS` / `DESTS` are those arrays, edited in place (never reassign); after a change call `applySetup()` (chips, filters, labels `.dest-word`, General's markets, redraw). Removing one strips it from campaigns (`stripFromCampaigns`). In Backup.
- `planner.timeline.v1` campaigns: `{id,name,segments[],destinations[],start,end,color,overrides{seg:{start,end}},leadgen?,subs[],tasks[],parked?,compact?}`. Markets order = `SEGMENTS`. Color = preset name or hex (`paint`/`customVars`, theme-aware).
- `leadgen {segments,start,end,overrides}`; `subs[{id,name,segments,start,end,overrides,parked?,compact?}]`; dates per market via `datesIn` / `lgIn` / `subIn`.
- `tasks[{id,text,done,doneAt,urgent,archived,due,desc,rich?,segments,showSegs,subtasks,createdAt,sub?}]`; `t.sub` puts it in a sub-campaign's section (`secOf`). `desc` is cleaned HTML when `rich` is true (else legacy plain text): show via `descHTML(t)`, read via `rtGet(el)`, clean with `cleanRich` (only b/i/u/s/br/div, `span.tc-*`, `mark.hl-*`, http(s) links). Fields: `richField(el, onChange)`.
- `planner.general.v1`: tasks with no campaign. In code `general` is a campaign-shaped object (all markets, no subs) kept out of `campaigns`; use `lists()` / `listById()` wherever General counts too (trash, archive, backup `general`, Move to).
- Trash items: campaign (no type), `type:'task'`, `type:'note'` (`trashKind`).
- Also `planner.tasksview.v1` (`{sel,sort,merged,addTo}`), `planner.trash.v1`, `planner.colorder.v1`, `planner.dense.v1`, `planner.theme.v1`. Old records are filled in on load (`normCampaign`, `normTask`, `normTrashItem`); first visit starts empty.

## Key helpers
- `timing(c)` → spans `sp`, `lg`, `subs`, `first`, `last` (`last` incl. subs decides "ended"). `statusHTML(c, {leadgen, subs})` / `statusPill`: live green, soon yellow, ended red, grouped by market.
- `marketEditor()` = per-market dates UI (campaign, lead gen, each sub). `placeTask`/`orderedTasks(c, sec)` order tasks per section. `ask()` = in-page confirm (never `confirm()`); open/close dialogs only with `openDlg(d)` / `shut(d, value)` (animated; never `showModal`/`close` directly); `closeGuarded` asks Save/Discard on edited forms.
- Motion standard: CSS vars `--ease-spring/glide/fold`, `--dur-fold/move` → JS `MOTION` {fold, move, enter, leave}; use these, not literals.
- Showing/hiding a block: `foldTo(el, show)` (folds height + parent gap; elements with a `display` rule need a matching `[hidden]` rule).
- Tabs / `.zoom` segmented controls get the pill glide automatically (capture click listener + `pickedIn`); new segmented controls just need `.zoom > button[aria-pressed]`.
- Motion: `withFlip` (board tasks), `tkFlip` (Tasks tab; `merge` = liquid version), `flipCols` (columns), View Transition only for Detailed/Compact (`view-transition-name` col-<id> / sub-<id>).

## Gotchas
- Write localStorage only via `store(key, value)` (shows the save warning on failure). Other tabs' saves arrive via the `storage` event → `syncFromOtherTab()` (reloads data; keep editor references id-based).
- WAAPI: a single keyframe without `offset` is the END frame. For "from X to current" write `[{ opacity: 0, offset: 0 }]`.
- Timeline changes: `morphTimeline(update)` (bars glide by key `seg|id|kind`), month moves: `slideTimeline(dir, update)`.
- `today` is a `let` that `checkNewDay()` moves on past midnight; never cache dates derived from it across renders.
- `crypto.randomUUID` is missing on `file://` → `uid()`. Every campaign needs `tasks: []` and `subs: []`.
- Name clash: `renderSubs` = task subtasks; sub-campaigns use `renderSubCampaigns`.
- Never hardcode colours in rules: CSS vars with a `[data-theme="dark"]` block. Accent `--accent` #0c8a80 (light) / #18c2b4 (dark).
- Flags only on the Timeline row labels (emoji via the Noto Color Emoji webfont; Windows has none); everywhere else markets are codes. Custom colours use the in-page wheel, not `<input type=color>`.
- Grid tracks need `minmax(0, 1fr)` where a long pill could widen them (it once pushed the unpark button out of a tile).
- Don't animate negative margins on grid items (track clamps at 0, motion jumps). Sticky labels (z 3) must stay above bars (z 2).
- After a pointer drag Firefox clicks the element under the pointer; clicks within 400ms of `dragEndedAt` are swallowed. Drag listeners live on `window`.
- The in-app preview pane is a hidden `data:` page: no localStorage/hash, and dialog close events and view transitions are delayed there — test real behaviour in Firefox. To check motion, freeze frames: on load trigger the change, then `document.getAnimations().forEach(a => { a.pause(); a.currentTime = T })` and screenshot.
- `.chip`, `.toggle`, `.zoom > button` act on pointerdown (quick clicks while the mouse moves were lost); the trusted click after is swallowed. Layout changes on blur go through `afterPointer` so the click lands first.
- Dialog lists (Archive/Trash): rows carry `data-key`; wrap updates in `flipRows(list, update)`.
- Board changes that move columns/tasks/tiles: wrap the update in `flipBoard(update)` (nested FLIP: all after-rects measured first, parent delta subtracted). Park/unpark of campaigns and subs: `morphPark`.
- `timing()` / `isEnded()` crash on `general` (no dates): guard with `c !== general`.
