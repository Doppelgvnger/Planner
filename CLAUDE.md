# Planner
Campaign planner for the user's girlfriend (marketing project manager, uses it on a Mac in a browser tab). UI in English; the user writes in Russian. Single-file HTML/CSS/JS (`index.html`), no build, no backend. Git repo `Doppelgvnger/Planner`, branch `main`, lives in `H:\GIT\Planner` (`H:\Claude Code\Projects\Planner` is a junction to it).

## Run / deploy
- Live: https://doppelgvnger.github.io/Planner/ — GitHub Pages from `main` root; `git push` deploys in ~1 min.
- Local: open `index.html` (works from `file://`). Test in headless Firefox with a temp profile: `firefox -headless -no-remote -profile <tmp> --window-size=W,H --screenshot out.png <url>`; seed data by injecting a `<script>` that writes localStorage into a scratch copy.

## Workflow
- Bigger features: propose a plan in Russian, wait for the user's "green light", then build. Small fixes: just do them.
- One commit per change, then push; verify in Firefox (light + dark, 375/1280/1920 when layout changes).
- Never commit `planner-backup-*.json` (her real data; gitignored).

## Layout
- `index.html` — everything. Tabs: Calendar (placeholder), Campaigns, Timeline (`showView`, open tab in URL hash). Both built tabs share `campaigns`, the campaign dialog and the DTC/Sephora filter; `renderAll()` redraws both.
- `favicon.svg` (also the header mark), `favicon-32.png`, `apple-touch-icon.png` (PNG fallbacks drawn with PowerShell System.Drawing): dark square, three phase circles in `#18c2b4`.

## Data (localStorage, per browser + address; moved between them via Backup → Export/Import)
- `planner.timeline.v1` campaigns: `{id,name,segments[],destinations[],start,end,color,overrides{seg:{start,end}},leadgen?,subs[],tasks[],parked?,compact?}`. Markets order = `SEGMENTS` (US, CA·EN, CA·FR, BR, MX). Color = preset name or hex (`paint`/`customVars`, theme-aware).
- `leadgen {segments,start,end,overrides}`; `subs[{id,name,segments,start,end,overrides,parked?,compact?}]`; dates per market via `datesIn` / `lgIn` / `subIn`.
- `tasks[{id,text,done,doneAt,urgent,archived,due,desc,segments,showSegs,subtasks,createdAt,sub?}]`; `t.sub` puts it in a sub-campaign's section (`secOf`).
- Also `planner.trash.v1`, `planner.colorder.v1`, `planner.dense.v1`, `planner.theme.v1`. Old records are filled in on load (`normCampaign`, `normTask`, `normTrashItem`); first visit starts empty.

## Key helpers
- `timing(c)` → spans `sp`, `lg`, `subs`, `first`, `last` (`last` incl. subs decides "ended"). `statusHTML(c, {leadgen, subs})` / `statusPill`: live green, soon yellow, ended red, grouped by market.
- `marketEditor()` = per-market dates UI (campaign, lead gen, each sub). `placeTask`/`orderedTasks(c, sec)` order tasks per section. `ask()` = in-page confirm (never `confirm()`); `closeGuarded` asks Save/Discard on edited forms.
- Motion: `withFlip` (tasks), `flipCols` (columns), View Transitions for park/density (`view-transition-name` col-<id> / sub-<id>).

## Gotchas
- `crypto.randomUUID` is missing on `file://` → `uid()`. Every campaign needs `tasks: []` and `subs: []`.
- Name clash: `renderSubs` = task subtasks; sub-campaigns use `renderSubCampaigns`.
- Never hardcode colours in rules: CSS vars with a `[data-theme="dark"]` block. Accent `--accent` #0c8a80 (light) / #18c2b4 (dark).
- Flags are emoji via the Noto Color Emoji webfont (Windows has none). Custom colours use the in-page wheel, not `<input type=color>`.
- Grid tracks need `minmax(0, 1fr)` where a long pill could widen them (it once pushed the unpark button out of a tile).
- Don't animate negative margins on grid items (track clamps at 0, motion jumps). Sticky labels (z 3) must stay above bars (z 2).
- After a pointer drag Firefox clicks the element under the pointer; clicks within 400ms of `dragEndedAt` are swallowed. Drag listeners live on `window`.
- The in-app preview pane is a hidden `data:` page: no localStorage/hash, and dialog close events and view transitions are delayed there — test real behaviour in Firefox.
