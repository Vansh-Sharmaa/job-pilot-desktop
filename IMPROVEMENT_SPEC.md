# JobPilot AI — Improvement Spec (v2)

> Handoff document for Antigravity / any coding agent.
> Scope: product, UI/UX, features, architecture, frameworks, scenarios.
> Read §0 before touching anything.

---

## 0. Operating rules for the agent

```
1. This is an improvement spec, not a rewrite licence. Ship in small PRs.
2. Never remove a capability without shipping a working replacement or an
   honest "not available" state.
3. No user-visible success message until the operation is verified.
4. No hardcoded numbers in the UI (counts, quotas, scores, node counts).
   Every number must be derived from real state or render as "—".
5. Every IPC channel and preload API must be used by the renderer or deleted.
6. No secrets, phone numbers, emails or URLs in source files.
7. Keep the existing design tokens (src/styles.css :root) as the visual base.
8. After each PR: the app must start, the ledger must load, and no console
   error may fire within 60 seconds of idle.
9. Delete dead code you touch instead of leaving it commented out.
```

---

## 1. Diagnosis — why the app feels impressive but unusable

| Root cause | Symptom the user feels | Consequence |
|---|---|---|
| **The UI narrates instead of reporting** | Agent says "Navigated browser", quotas say "CAP REACHED", apply says "submitted" | The user cannot tell what is real; trust collapses after the first failure |
| **State lives in four places** | Profile edited in Settings does not change autofill | Wrong data is submitted to employers |
| **Everything is one 3,000-line HTML file with a 96 KB inline script** | Cannot add a feature without breaking another | Bugs multiply; every change is risky |
| **No single source of truth for the domain** | 3 portal registries, 3 quota tables, 2 backends, 2 ATS engines | Numbers disagree across screens |
| **No persistent job/application model** | Ledger is a CSV, interviews are a JSON nobody reads | The app cannot become a career CRM |
| **Automation is DOM-heuristic based** | Fails on Greenhouse/Lever/Workday, iframes, file uploads | The core promise ("auto-apply") does not hold on most real jobs |

The fix order is: **data model → truthful state → UI shell → automation engine**. Not the reverse.

---

## 2. UI / UX overhaul

### 2.1 Information architecture — 7 views is too many, and one is unreachable

Current views: `ws-radar`, `ws-ledger`, `ws-fleet`, `ws-resume`, `ws-quotas`, `ws-telemetry` (0 nav triggers → unreachable), `ws-settings`.

**Problem:** the user must mentally map 7 screens to one job: *find jobs → apply → track → prepare*. The radar is decorative, telemetry is hidden, quotas is a dead tab, settings is a wall of inputs.

**Target: 4 workspaces + 1 context drawer**

| Workspace | Absorbs | Purpose |
|---|---|---|
| **Discover** | Radar (as a real pipeline/filter view), portals, saved searches | Find and triage jobs |
| **Apply** | Browser webview, ATS scan, autofill, tailoring | One job at a time, with confirmation |
| **Pipeline** | Ledger + interviews + replies | CRM of every application |
| **Library** | Resume studio, answer bank, prep | Reusable assets and prep |
| *Settings* | Settings + diagnostics | Modal, not a workspace |

`ws-telemetry` becomes the **Activity / Audit drawer** (slide-over from the right), reachable from every screen.

### 2.2 Shell blueprint

```
┌───────────────────────────────────────────────────────────────────────────┐
│ titlebar  ⚡ JobPilot   [⌘K Search & actions]            ─  □  ✕          │
├──────────┬────────────────────────────────────────────────────────────────┤
│          │  breadcrumb: Pipeline / Acme Corp / AI Engineer   [status pill]│
│ sidebar  ├────────────────────────────────────────────────────────────────┤
│          │                                                                │
│ ● Agent  │   MAIN WORKSPACE (one of: Discover | Apply | Pipeline | Library)│
│ ● Today  │                                                                │
│ ● Saved  │   ┌──────────────────────────┐  ┌───────────────────────────┐  │
│ ● Runs   │   │ primary content          │  │ inspector / detail panel  │  │
│          │   │ (list, board, browser)   │  │ (job, company, activity)  │  │
│ ───────  │   └──────────────────────────┘  └───────────────────────────┘  │
│ + New    │                                                                │
├──────────┴────────────────────────────────────────────────────────────────┤
│ dock:  model ▾ | engine: Chrome/Webview | safety: Dry-run ▾ | quota 3/25  │
└───────────────────────────────────────────────────────────────────────────┘
                                    ▲
                    Activity drawer (audit log) slides in from right
```

**Rules**
- One primary action per screen, visually dominant.
- The bottom dock is the only place that shows "mode" (model, engine, safety). No duplicated toggles in the header.
- The right inspector is contextual, not a permanent third column at <1440 px.
- Breadcrumb replaces the fake folder path (`job-pilot-desktop / New app feature ideas`).

### 2.3 Navigation, sessions and the command palette

| Current | Problem | Target |
|---|---|---|
| `setAgentSession()` clears the conversation | Clicking a sidebar chat destroys work | Real sessions persisted in SQLite; switching saves and restores |
| Session tabs (`oc-tab`) | Title only, no state | Tabs backed by real session IDs, with run status dot |
| `triggerQuickCommand('Open Command Palette')` | Opens nothing; it sends a chat prompt | A real palette: fuzzy search over jobs, companies, actions, settings, sessions |
| Keyboard hints in `title=` only | Undiscoverable | A `?` shortcuts sheet; visible hints in the palette |
| No global shortcuts | Mouse-only | `Ctrl/Cmd+K` palette, `Ctrl+1..4` workspaces, `Ctrl+Enter` run, `Esc` stop/close, `Ctrl+Z` undo |

### 2.4 Design system — good tokens, missing the rest

`styles.css` already defines color tokens (`--bg-*`, `--text-*`, `--accent-*`) and fonts. What is missing:

| Missing layer | Add |
|---|---|
| **Spacing scale** | `--space-1..8` (4/8/12/16/24/32/48/64). Remove ad-hoc `padding: 7px 11px` |
| **Type scale** | `--text-xs/sm/base/lg/xl` + line-heights. Today: 10px, 10.5px, 11px, 11.5px, 12px, 13px mixed randomly |
| **Radius / elevation** | `--radius-sm/md/lg`, `--shadow-1/2/3` |
| **Semantic colors** | `--ok`, `--warn`, `--danger`, `--info` + `*-bg` variants (replaces inline `#10b981` / `#ef4444` strings) |
| **Interactive states** | hover / active / focus-visible / disabled / loading for every control |
| **Density modes** | `compact` (28px rows) and `comfortable` (36px), persisted |
| **Motion** | 120 ms for state, 200 ms for panels; respect `prefers-reduced-motion` |
| **Icon contract** | One set (Lucide is already vendored), one size per context, no emoji-as-icon in chrome (🚨 ⚠️ ⚡ mixed with Lucide) |
| **Skeletons** | Replace "Loading ledger data…" text with row skeletons |

**Kill the inline styles.** The renderer currently injects dozens of `style="..."` strings from JS. Move every one into a class.

### 2.5 State and feedback contract (the single biggest UX win)

Every async surface must render exactly one of these, and the renderer must never invent a fifth:

| State | Rendering |
|---|---|
| `idle` | Empty state with one clear action |
| `loading` | Skeleton + cancel affordance if >2 s |
| `success` | Real data + last-updated timestamp |
| `empty` | "No applications yet" + "Add manually" + "Scan a job" |
| `stale` | Data + "updated 12 min ago · refresh" |
| `error` | Inline error with the actual message + Retry + "Copy details" |
| `blocked` | Reason + the one thing the user must do (e.g. "Token missing → Open Settings") |

**Forbidden patterns to delete**
- `showToast('...submitted')` before the submit is verified.
- `catch {}` that hides a failure.
- `innerText = 311` / `18 / 25` / `12 portal nodes`.
- `if (res.ok || res.status === 401)`.
- Optimistic "APPLIED (JUST NOW)" badge set on a `setTimeout` guess.

**Toast policy:** max 1 toast per action, 3 s, with an Undo slot where destructive. Errors never auto-dismiss.

### 2.6 Data views

**Ledger / Pipeline table**
- Virtualize (`@tanstack/react-virtual`), remove the `slice(0, 150)` cap.
- Sortable columns, column visibility, sticky header, row density toggle.
- Multi-select → bulk: open, mark status, copy, archive, export selected.
- Inline status edit (Saved → Applied → OA → Interview → Offer → Rejected) with audit entry.
- Row click opens the inspector; the URL becomes a real link (never an inline handler).
- Sticky filter bar: portal chips + status chips + date range + free text, all in the URL/state so refresh preserves them.

**Quota meters**
- Show `applied / limit`, reset countdown (`resets in 4h 12m`), health (green/amber/red), and the source of truth (`quota_manager.py`).
- If the backend is offline: `Quota service offline · last known 3/25 · retry`, never "CAP REACHED".
- One source: the Python quota manager via a single endpoint.

**Pipeline board (replaces the radar)**
- Columns: Saved, Applied, OA, Interview, Offer, Rejected.
- Cards group by company; drag between columns writes an audit entry.
- A small "portal health" strip at the top (logged in, last ping, today count).
- Keep a graph only as a secondary "portal coverage" visual, not the main screen.

### 2.7 Accessibility

- All interactive elements reachable by Tab; visible `:focus-visible` ring (2 px, `--accent-cyan`).
- `aria-live="polite"` region for toasts and run progress; `role="status"` on the run pill.
- Contrast: `--text-muted` (#6b7280) on `--bg-canvas` (#08080a) is ~4.4:1 — raise to `#8b93a1` for body text.
- Do not rely on color alone for status (add icon + label).
- Respect `prefers-reduced-motion` for radar/spline animations.
- Modal focus trap + `Esc` to close; return focus to the trigger.

### 2.8 Responsive and density

- Current default window is 1680×1000 with **one** `@media` query → broken on 1366×768 laptops.
- Target: usable at **1024×700**, comfortable at 1280, full at 1440+.
- Right inspector collapses below 1440; sidebar collapses to icon rail below 1200; dock wraps to two rows below 1100.
- Add `zoom` control (90/100/110%) persisted.
- Test matrix: 1024×700, 1366×768, 1440×900, 1920×1080, 2560×1440.

### 2.9 Onboarding (today: none, and it opens with someone else's identity)

First-run wizard, 5 steps, skippable except step 2:
1. **Welcome** — what the app does, what it will not do (no ToS bypass, no CAPTCHA solving).
2. **Profile** — name, email, phone, city, links, education, experience. Validated. Blocks apply until complete.
3. **Resume** — pick `resume.md` / PDF, parse sections, show a keyword diff.
4. **Connections** — model endpoint + token ("Test" must fail on 401), Python path check, extension pairing (paste token once).
5. **Guardrails** — safety mode (Dry-run default), daily caps, blacklist.

Add a **preflight panel** in Settings → Diagnostics: Node, Electron, Python version, ports 5055/5056/20128, folders exist, DB writable, extension paired, gateway auth. Each row: ✅ / ❌ + "Fix" link.

### 2.10 Settings

- Group into: **Model**, **Automation**, **Data & privacy**, **Diagnostics**, **About**.
- Model: dropdown populated from `/models` (the `getAvailableModels` API already exists and is unused), not a free-text field.
- Token: password field with "stored securely" indicator; never pre-filled from source.
- Automation: engine (Webview / Chrome extension / Playwright), safety mode, caps, concurrency, blacklist.
- Data: DB location, backup now, export, delete all, retention.
- Diagnostics: preflight + log tail + "copy debug bundle".

---

## 3. Feature gaps

| ID | Feature | Why it matters | MVP scope |
|---|---|---|---|
| **F1** | **Pipeline / CRM** | The reason people keep a job tracker | Statuses, kanban, notes, next action, reminder date, per-company timeline |
| **F2** | **Resume library** | Tailoring without versioning loses track | Versions with metadata (company, role, JD hash, ATS score, created), "used for" link, diff against master |
| **F3** | **Answer bank + approval queue** | Screening answers are the #1 time sink | Store Q/A per company+role+profile version, confidence score, approve/edit, fill only approved |
| **F4** | **Audit log** | Makes automation trustworthy | Append-only JSONL/SQLite: who/what/when, before → after, source (manual/agent/extension), revert link |
| **F5** | **Safety modes** | One switch replaces "Turbo" | `Dry-run` (fill only) / `Assisted` (confirm each submit) / `Auto` (rules + caps). Default Dry-run |
| **F6** | **Interview prep** | `assessment_prep_engine.py` already exists, unused | Per-application prep tab: rounds, likely questions, company research, mock Q&A |
| **F7** | **Reply / inbox tracking** | Applications die in the inbox | Parse Gmail (already scaffolded) → auto-move status, surface next interview, calendar link |
| **F8** | **Outreach CRM** | `recruiter_dispatcher.py` unused | Follow-ups, 7-day nudge, reply tracking, template per company |
| **F9** | **Funnel analytics** | Users need to know what works | Applied → response → interview → offer rates by portal, resume version, role |
| **F10** | **Rules engine** | Hardcoded lists in `fleet_scale_150.py` | UI for blacklist, role keywords, salary floor, remote-only, max/day, agency block |
| **F11** | **Tray / background** | "24/7 autopilot" claim is false today | Tray icon, start minimised, run queue continues, OS notifications |
| **F12** | **Multi-profile** | Different resumes for different tracks | Switch profile per application; each profile has its own answer bank |

**Explicitly out of scope (do not build):** CAPTCHA solving, proxy rotation, anti-detection evasion, mass cold-email.

---

## 4. Architecture and framework upgrades

### 4.1 Renderer: get out of the single HTML file

**Current:** `index.html` 3,026 lines incl. a 96 KB inline `<script>`; `styles.css` 2,542 lines; no modules, no types, no components.

**Recommendation: React 19 + TypeScript + Vite (`electron-vite`)**

| Option | Verdict |
|---|---|
| **React + TS + Vite** | ✅ Best ecosystem, component libs, TanStack, easiest to hire/assist. Slightly larger bundle |
| **Svelte 5 + TS + Vite** | ✅ Smallest bundle, fastest; smaller ecosystem for complex tables/boards |
| **Vue 3 + TS** | ✅ Fine, similar to React |
| **Stay vanilla + ES modules + Web Components** | ⚠️ Acceptable stopgap if migration is too big; you will rebuild tables/board/drawers by hand |
| Don't | ❌ Adding a second framework alongside the inline script |

**Migration path (no big bang):**
1. Extract the inline script into ES modules (`src/renderer/*.js`) — no framework yet.
2. Introduce Vite + TS with `allowJs`, mount the new shell.
3. Port one workspace at a time: Ledger → Pipeline → Apply → Library → Settings.
4. Delete the old markup when the last view is ported.

**Component layer:** build 12 primitives (Button, IconButton, Input, Select, Checkbox, Tabs, Table, Card, Badge, Toast, Dialog, Drawer). No third-party UI kit needed; keep the existing visual identity.

### 4.2 Typed IPC contract

**Current:** 30+ `ipcMain.handle` calls, ad-hoc payload shapes, hand-written preload, several contract mismatches already shipped (scam payload, `pdfPath`, ledger rows, fleet shape).

**Target**
- One `src/shared/contract.ts` with Zod schemas per channel.
- A single typed wrapper: `invoke('ledger:list', { ... }) → { ok: true, data } | { ok: false, error }`.
- Preload generated from the contract; renderer gets full types.
- Every handler validates input with Zod and returns a discriminated union.
- One error shape: `{ code, message, detail?, retryable }`.

### 4.3 Data layer: SQLite, not CSV

**Current:** CSV appended by Electron + Python + bridge, no lock; single backup file; naive line parser.

**Target**
- `better-sqlite3` in the main process, WAL mode, `userData/jobpilot.db`.
- Tables: `applications`, `companies`, `jobs`, `profiles`, `resumes`, `answers`, `runs`, `events` (audit), `quotas`, `settings`.
- Kysely or Drizzle for typed queries; a `migrations` table with sequential SQL files.
- **Single writer** (main process). Python writes through an HTTP/IPC endpoint or a `jobs/queue` table — never the file directly.
- One-time importer from the existing CSV (keep a `.bak`), then read-only export.
- Nightly backup to `userData/backups/` keeping 7 copies.

### 4.4 Process supervision

**Current:** `spawn` + `activeProcesses` map; `kill` on close; no state machine, no output parsing, no cancellation mid-run.

**Target**
- A `TaskRunner` service: `queued → starting → running → stopping → done/failed/cancelled`.
- Cancellation token per task; `taskkill /T /F` on Windows; `AbortController` for fetches.
- Structured stdout: Python scripts emit JSON lines (`{"event":"progress","pct":40}`), runner streams them to the UI.
- Persist run history in `runs` (script, args, start, end, exit, tail of output).
- Concurrency limit per portal; queue instead of "already running" errors.

### 4.5 Browser extension

| Current | Target |
|---|---|
| `setInterval(2000)` polling in an MV3 worker | `chrome.alarms` (min 30 s) + long-lived `chrome.runtime.connect` port; reconnect with backoff; health pill in UI |
| Token in a file listed under `web_accessible_resources: <all_urls>` | Pairing screen → `chrome.storage.local`; token never exposed to pages |
| `<all_urls>` + 22 content-script domains | `optional_host_permissions`, requested per portal on first use |
| Auto-logs an application 1.5 s after any "Apply now" click | Log only on a verified submission signal (confirmation text/URL) + explicit user confirm; dedupe by URL |
| DOM heuristics in `document_end` only | Re-run on `history.pushState`/SPA nav; MutationObserver for late forms |
| No iframe / shadow DOM / file upload | Delegate complex portals to the Playwright engine (§4.6) |

### 4.6 Automation engine: Playwright, not querySelector

**This is the change that makes "auto-apply" real.**

- Bundle Playwright (Chromium) **or** attach over CDP to the user's Chrome with the extension.
- Why:
  - Handles iframes and shadow DOM natively.
  - `setInputFiles()` solves the mandatory resume upload (impossible from a content script).
  - Multi-step flows (LinkedIn Easy Apply modal, Workday wizard) become explicit step machines.
  - Reliable waits, auto-scroll, network idle.
  - Screenshots on failure for the audit log.
- Per-portal **adapter** registry (one file per portal): URL pattern, steps, field map, success signal, rate limit.
- The extension becomes the **assist** layer (pill, manual fill, capture job metadata), not the apply engine.

### 4.7 AI layer

| Gap | Fix |
|---|---|
| Raw `fetch` to `/chat/completions`, no streaming | Stream SSE into the renderer; token counter; stop button aborts the stream |
| Prompt built inline in `run-agent-loop` | Prompt templates in files, versioned; per-task system prompts |
| Tool outputs dumped raw into context | Cap each tool result, summarise long pages, keep a rolling window |
| No structured outputs | Zod schemas + JSON mode for screening answers, JD extraction, ATS scoring |
| No retry | Exponential backoff + jitter on 429/5xx; circuit breaker |
| One model for everything | Router: cheap model for extraction, strong model for writing, local fallback (Ollama already configured) |
| Answers fabricated on failure | `needsReview: true` instead of a generic pitch; queue for approval |

Optional: adopt the **Vercel AI SDK** (provider abstraction, streaming, tool calling) or point at LiteLLM/9router. Avoid building a second client.

### 4.8 Security architecture

| Control | Implementation |
|---|---|
| Secrets | `safeStorage` → `userData/secrets.bin`; rotate the leaked token |
| Bridge | Bind `127.0.0.1`; require token on **all** routes; exact hostname allowlist; per-route method + schema validation; rate limit 60/min |
| Renderer | CSP (`default-src 'self'`), `sandbox: true`, no `allowpopups`, `setWindowOpenHandler` → `shell.openExternal` for https only |
| Webview | `will-attach-webview` → only `https:`, strip preload, deny permissions (camera/mic/geo/notifications) |
| Files | `open-path` allowlist: `userData`, resume dir, export dir. Resolve + `path.relative` check |
| Scripts | Allowlist of exact `.py` names; no arguments from the model without a schema |
| Logs | Redact email/phone/token; never log full JD |

### 4.9 Observability

- `pino` (or `electron-log`) with rotation, levels, and a "Copy debug bundle" action.
- Renderer error boundary → inline error card + log entry.
- Timeline events per run (start, tool, result, error, stop) persisted for the audit log.
- Optional Sentry (main + renderer) behind a setting; off by default.

### 4.10 Testing and CI

| Layer | Tool | Coverage |
|---|---|---|
| Unit | Vitest | CSV round-trip, duplicate matching, scam scoring, ATS scoring, answer cache keys, date helpers |
| Contract | Zod schema tests | Every IPC payload shape |
| E2E | Playwright `_electron.launch` | First run → ledger loads → add manual row → restart → row persists |
| Fixtures | Seeded DB + 3 sample CSVs | Company with comma, quotes, unicode, empty fields |
| CI | GitHub Actions on Windows | typecheck, lint, unit, e2e smoke |

Replace `verify_pillars.py` (hardcoded Infosys row) with real fixtures.

### 4.11 Packaging and distribution

- `electron-builder` → NSIS installer + portable `.exe`.
- `electron-updater` + GitHub Releases (or S3) for auto-update.
- Code signing (optional now, required before public release).
- `requirements.txt` + a Python bootstrap (`python -m venv`, install, verify) or bundle a PyInstaller sidecar.
- Preflight blocks start with a clear "Python not found → Install" screen.
- Remove hardcoded `D:\...` paths: read roots from `userData/config.json`, default to `userData/workspace/{agents,resume}`.

### 4.12 Performance budget

| Metric | Target |
|---|---|
| Cold start (window interactive) | < 2.5 s |
| View switch | < 100 ms |
| Ledger 1,000 rows | scroll 60 fps (virtualized) |
| Idle CPU | < 2% (no 2 s polling loops doing layout) |
| Idle memory | < 400 MB with one webview |
| Renderer bundle | < 600 KB gzip |
| Polling | Replace fixed intervals with event-driven IPC + 30 s heartbeat |

### 4.13 Portability

- No absolute paths anywhere; a `paths.ts` resolving from `app.getPath('userData')`.
- "Export my data" / "Import" (zip of DB + resumes + settings).
- Works when the folder is moved, renamed, or copied to another PC.

---

## 5. Scenarios (acceptance narratives)

Each of these must pass before the app is considered usable.

1. **First run on a clean machine** — wizard appears, no personal data, "Apply" disabled until the profile validates, ledger shows an empty state (not 311).
2. **Laptop at 1366×768** — no horizontal scroll, dock wraps, inspector collapses, every control reachable.
3. **Apply to a Greenhouse job** — iframe form detected, fields filled, resume uploaded, dry-run stops before submit, user confirms, audit row written.
4. **Apply to a LinkedIn Easy Apply** — multi-step modal walked step by step; on CAPTCHA or login wall the run **pauses** and asks the user; no retry loop.
5. **Duplicate job** — banner names the company/role/date from the real ledger row; "View in pipeline" opens it.
6. **Scam job** — banner lists the matched phrases from `flags`, not `undefined`.
7. **Edit profile → restart → apply** — the new phone/email are used everywhere (renderer, extension, agent).
8. **Model token wrong** — Test Connection fails with "401 invalid token"; agent says "not configured", not "offline".
9. **9router not installed** — preflight says so with a one-click "Install / Start" and a docs link.
10. **Stop a running fleet task** — status flips to `stopping`, the process tree dies within 2 s, no orphan Python/Chrome.
11. **Press Enter twice** — exactly one run starts; the input is locked with a visible "running" state.
12. **Close the window mid-run** — task is cancelled, audit says "cancelled by user", nothing keeps applying.
13. **Launch the app twice** — second launch focuses the first; no port error.
14. **Open a job URL with `'` and `<script>`** — renders as text, does not execute.
15. **Company named `Acme, Inc.`** — CSV/SQLite round-trip, ledger shows correct columns, export is valid.
16. **Delete the DB** — app offers "restore from backup" instead of crashing.
17. **Two profiles** — switching profile changes resume, answers and autofill, with a clear indicator.
18. **Recruiter replies** — application status moves to "Interview" automatically, with the email linked.
19. **After 20 agent turns** — history is summarised, no context overflow, no generic error.
20. **After 500 applications** — ledger still scrolls at 60 fps, search/sort instant.

---

## 6. Delete or repurpose

| Item | Action |
|---|---|
| `ws-telemetry` hidden view | → Activity / audit drawer |
| Radar topology (decorative graph) | → Pipeline board; keep a small "portal health" strip |
| Sidebar fake sessions | → real persisted sessions |
| "Turbo" chip | → Safety mode selector (Dry-run / Assisted / Auto) |
| `dashboard_server.py` (5055) + `dashboard.html` | Pick one backend; retire the other |
| `ALL_20_PORTALS` + `RADAR_PORTALS` + `defaultQuotas` | One `portals` table (id, name, url, quota, adapter, selectors) |
| 4 profile copies | One `profiles` row |
| `smartApplyInBrowser` + `content.js` autofill + `injectManualFieldsIntoForm` | One field-mapping module + per-portal adapters |
| JS ATS heuristic + `ats_engine.py` | One explainable engine (matched, missing, weight, suggestion) |
| `runTask` / `stopTask` / `getResumeContent` / `onChromeAgentResult` if unused | Delete or wire |
| 54 `inspect_* / test_* / click_* / _temp_*` scripts | `scripts/scratch/` (not shipped) or delete |
| `kaamsetu.html` (5 B), `gmail_snapshot.json` (0 B), `output.pdf`, `run.log`, `electron_debug.log` | Delete; logs go to `userData/logs` |
| `src/lucide.min.js` (500 KB vendored) | npm dependency (low priority) |
| Fake counts (`311`, `14`, `18 / 25`, "12 portal nodes") | Derived values or `—` |

---

## 7. Roadmap

| Phase | Theme | Contents | Exit criteria |
|---|---|---|---|
| **P0** (1–2 days) | Truthfulness | Safety modes, remove fake counts, verified-only toasts, fix scam/duplicate display, preflight panel | No screen displays a number the app did not compute |
| **P1** (1 week) | Data foundation | SQLite + migrations, single profile, one portal registry, CSV importer, backups | Restart-safe; single writer; export round-trips |
| **P2** (1–2 weeks) | Shell | Vite + TS, 4 workspaces, command palette, activity drawer, design tokens, responsive | 1024×700 usable; no inline styles in new code |
| **P3** (2 weeks) | Automation | Playwright engine + 3 portal adapters, file upload, step machine, dry-run | One real application completed end-to-end with audit |
| **P4** (1 week) | Pipeline & library | Kanban, resume versions, answer bank + approval | Status changes and resume versions traceable |
| **P5** (ongoing) | Intelligence | Interview prep, inbox sync, outreach, analytics | Funnel visible per portal/resume |

---

## 8. Definition of done

- [ ] Every visible number comes from state.
- [ ] Every async action has loading / success / error / empty.
- [ ] No success toast before verification.
- [ ] One profile, one portal registry, one quota source.
- [ ] Ledger in SQLite, virtualized, restart-safe, backed up.
- [ ] Dry-run is the default; submit requires confirmation.
- [ ] Stop kills the process tree in < 2 s.
- [ ] App usable at 1024×700.
- [ ] No hardcoded paths; move the folder and it still runs.
- [ ] Token in `safeStorage`; bridge requires it on every route.
- [ ] `npm test` and `npm run e2e` pass on Windows CI.
- [ ] Installer builds; auto-update works.

---

## 9. Prompt block for Antigravity

```
You are improving JobPilot AI (Electron 34 desktop app, vanilla HTML/CSS/JS renderer,
Python sidecar fleet). Read IMPROVEMENT_SPEC.md fully before editing.

Work in the roadmap order (P0 → P5). One PR per phase. Do not start a phase
before the previous exit criteria are met and verified.

Hard rules:
- Never display a number that is not computed from real state.
- Never show success before the operation is verified.
- Keep the existing color tokens; extend, don't replace.
- Every IPC channel validated with Zod; every preload API used or deleted.
- Dry-run is the default automation mode.
- No secrets or personal data in source.

Start with P0. For each change: state the file, the function, the before/after
behaviour, and the exact manual check that proves it. Stop and report after P0.
```
