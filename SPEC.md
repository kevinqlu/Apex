# Apex Driver Portal: Proof of Concept Spec

Status: DRAFT v1. Items marked **[DECIDE]** are design choices the owner (Kevin) must confirm or change before the agent builds on them.

Source of truth: this file. If code and spec disagree, flag it; do not silently pick one.

## 1. Goal and audience

Build a mini driver portal for Apex Logistics & Transportation Solutions as a hiring assessment. The evaluators are a mix: non-technical reviewers who judge what they see, and at least one reviewer who can read code or use AI to explore the repo and explain it to themselves. So the repo must be easy to understand cold, by a person or an AI: a clear README, a one-page `docs/architecture.md`, consistent structure, meaningful names, comments that explain why, and tests that read as documentation. The deliverable is judged on:

1. Architecture and design (routes, components, data flow)
2. UX for a driver on a phone or tablet in a truck cab
3. Coverage of every core requirement (auth, alerts, loads, onboarding, documents, support)
4. Code clarity (a repo link and README are required)

The demo must survive a 5-minute walkthrough on a phone with no setup friction. Optimize for: first impression, no broken states, believable seed data, and a repo that explains itself.

## 2. Stack **[DECIDE]**

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + TypeScript, React Router | Known stack, fast iteration, clear component boundaries |
| Backend | Node + Express + TypeScript | Thin REST API, easy to explain |
| Database | SQLite via better-sqlite3 | Zero setup, real relational data, resets cleanly |
| Auth | Server-side sessions in an httpOnly cookie | Safer than JWT in localStorage; simple to defend |
| Passwords | bcryptjs (no native build) | Portable |
| Uploads | multer to a local `uploads/` dir | Spec allows mock storage; this is real enough |
| Layout | npm workspaces: `web/` and `server/`, one `npm run dev` | Reviewer runs one command |

If a different stack is chosen, keep the same module boundaries below.

## 3. Auth and security rules

- Login: Driver ID + password (min 8 chars). Decided: password over PIN, for now (see decisions log, section 16).
- Passwords hashed with bcrypt. Never log or return hashes.
- Session: random 32-byte id stored in a `sessions` table, sent as an httpOnly, SameSite=Lax cookie (`Secure` in production). 12-hour expiry.
- Rate limit login: 5 failed attempts per Driver ID + IP per 15 minutes, in memory.
- **Every data endpoint derives the driver from the session, never from a request parameter.** A driver must never be able to read another driver's loads, documents, or tickets by changing an ID. This is the most important rule in the codebase.
- CSRF: reject mutating requests whose `Origin` does not match the app origin; require `Content-Type: application/json` except for uploads.
- Uploads: allow PDF, JPG, PNG, HEIC; max 10 MB; store under a random filename; serve files only through an authenticated route that checks ownership.
- Login errors are generic ("Driver ID or password is incorrect"); do not reveal which part was wrong.

## 4. Data model

```
drivers(id TEXT PK, name, password_hash, terminal, dispatcher_name, dispatcher_phone,
        hired_at, duty_status)            -- duty_status: driving|on_duty|sleeper|off_duty
sessions(id PK, driver_id FK, expires_at)
loads(id TEXT PK, driver_id FK, status,   -- pending|in_transit|delivered|delayed
      origin_city, origin_state, origin_facility,
      dest_city, dest_state, dest_facility,
      cargo_description, weight_lb, equipment,
      pickup_at, delivery_at, delay_note NULL, reference NULL)
notifications(id PK, kind, category, title, body, created_at)   -- kind: urgent|announcement
notification_targets(notification_id FK, driver_id FK)          -- no rows = sent to everyone
notification_reads(driver_id FK, notification_id FK, read_at)   -- read state is PER DRIVER
documents(id PK, driver_id FK, type, load_id NULL, original_name, stored_name,
          size, mime, status, uploaded_at)                      -- status: review|approved
onboarding_progress(driver_id FK, task_id, completed_at, detail_json NULL)
tickets(id PK, driver_id FK, category, load_id NULL, message, status, created_at)
```

Timestamps are stored as UTC ISO strings. Seed data is generated **relative to now** so the demo always looks fresh.

## 5. API (all under `/api`, all require a session except login)

```
POST /auth/login        POST /auth/logout        GET /auth/me
PATCH /me/duty-status
GET  /loads             GET /loads/:id           (404 if not the caller's load)
GET  /notifications     POST /notifications/read  { ids: [] }
GET  /onboarding        POST /onboarding/tasks/:taskId/complete   (driver-owned task types only)
GET  /documents         POST /documents (multipart: type, loadId?)   GET /documents/:id/file
GET  /tickets           POST /tickets
GET  /tracking/active-load      (Slice 7, stretch; the caller's own active load only)
```

Error shape: `{ "error": { "code": "string", "message": "plain-language text" } }`. The frontend shows `message` directly, so write it for drivers, not developers. A 401 anywhere sends the user to login with "Your session expired. Sign in again."

## 6. Onboarding: an open template (key requirement)

The company has onboarding problems and wants to adjust the process. So onboarding is **data, not code**.

- Lives in `server/config/onboarding.template.json`. Adding, removing, or reordering a task must require **no UI code changes**.
- Schema:

```jsonc
{
  "phases": [{ "id": "start", "title": "Before your first trip" }],
  "tasks": [{
    "id": "safety-video",
    "phase": "start",
    "title": "Complete the safety video",
    "description": "Short plain-language explanation.",
    "type": "video | upload | esign | company",
    "docType": "cdl",                   // only for type=upload; completion is derived from documents
    "ownerLabel": "Safety Department",  // only for type=company
    "dueDay": 3,                        // days after hired_at
    "minutes": 12,                      // only for video
    "optional": false
  }]
}
```

- Task types: `video` (driver watches, then confirms), `upload` (completes when a document of `docType` exists), `esign` (typed name must match the driver), `company` (completed by staff; the driver sees "Waiting on {ownerLabel}").
- **Owner matters:** many real onboarding steps (record checks, equipment walkthrough, check-ins) are done by the company, not the driver. The driver view must show those as waiting on the company, never as the driver's to-do. The server rejects a driver trying to complete a `company` task.
- Ship a **starter template** with 7 tasks across 3 phases (before first trip, first week, first 30 days): the three from the assessment (safety video, medical card, fleet policy), a CDL upload, and three company-side steps. Label it "Starter template" in the README so the company knows it is theirs to change.
- Demo-only affordance: a clearly labeled "Demo: mark complete as {owner}" button on company tasks so the walkthrough can show state changing. Gate it behind `DEMO_MODE=true`.
- Next step (out of scope for v1): a small admin editor for the template.

## 7. Requirements coverage

| Requirement | Where it lives |
|---|---|
| Remote login, session persistence | Slice 1 |
| Announcements, urgent alerts, unread vs read | Slice 3 |
| Assigned loads with all required metadata and 4 statuses | Slice 2 |
| Dashboard: duty state, active load, recent unread alerts | Slices 2 and 3 |
| Onboarding checklist | Slice 4 |
| Document center (upload, uploaded vs pending) | Slice 5 |
| Support (terminal, dispatcher, roadside, ticket form) | Slice 6 |
| Live tracking map (stretch, requested by the company) | Slice 7 |

## 8. UX and visual direction

- Mobile-first (design at 375 px wide), bottom tab bar on phones, left sidebar at 900 px and up. Six sections: Home, Loads, Alerts, Onboarding, Documents, Help.
- Driver-on-the-road rules: tap targets at least 48 px; glanceable status; minimal typing; plain words; sentence case; no jargon.
- Status never relies on color alone: every status chip has an icon and a text label. Unread items show a "New" label, not just a dot.
- Urgent alerts are unmistakable: solid urgent banner on the dashboard until read.
- If duty status is "Driving," show a notice on forms (upload, tickets, e-sign): "Park safely before filling this out." Notice only, never block.
- Dark mode via `prefers-color-scheme`. Visible keyboard focus. Respect `prefers-reduced-motion`.
- Palette (named tokens, light / dark):
  - ink `#101B26` / `#EAF0F5`, surface `#FFFFFF` / `#16212B`, background `#EEF1F3` / `#0D141B`
  - brand highway green `#0E6B4A` / `#4CC38A`
  - urgent `#B3261E` (solid) with soft tint, caution amber `#7A5200` on `#FBEBC2`, info blue `#1B5FA8` on `#DEEBF8`
- Type: Barlow Condensed (headings, load IDs, nav labels) and Barlow (body). Fallback to system fonts.
- **The one memorable element:** a route strip on each load card: origin city, a progress line with a small truck marker, destination city. Everything else stays quiet.
- Empty and error states tell the driver what to do next. Errors never apologize and never use vague text.

## 9. Seed data (relative to now)

Two drivers (demo credentials shown on the login screen **in demo mode only**):
- **Cody Pheng, D-1042**: hired 5 days ago. One load in transit (about 40% along), one delayed pickup with a delay note, one pending, one delivered 2 days ago **missing its proof of delivery**. Unread: two urgent alerts (weather, plus a lane closure targeted only at him) and one announcement. Onboarding: all done except "Sign the fleet policy," due today. Medical card under review.
- **Anthony Jacob, D-2217**: hired 1 day ago. One pending load. Almost nothing complete, so the onboarding and documents screens show real work.

Logging in as each must show different loads. That is the proof that scoping works.

For Slice 7, Cody's in-transit load drives the map: the truck position is computed from the load's pickup and delivery times, so it always appears to be moving along its route. Anthony's pending load shows a "Not picked up yet" state. Seed data uses fictional names only.

## 10. Build slices

The agent builds **one slice at a time and stops for review**. Each slice must run with `npm run dev` and leave the app in a working state.

**Slice 0: Scaffold.** Git repo with `.gitignore`, `.gitattributes`, `.nvmrc`, and `.env.example` committed first (see sections 13 and 14), workspaces, TypeScript config, lint/format, SQLite setup, migrations, seed script, `GET /api/health`, GitHub Actions CI, README skeleton with run instructions.
Done when: a fresh clone runs `npm install && npm run dev`, `npm run seed` resets the demo data, and the same clone-and-run works on the second machine (section 14).

**Slice 1: Auth and app shell.** Login screen, login/logout/me endpoints, session cookie, rate limiting, protected routes, shell with bottom tabs and sidebar, 401 handling.
Done when: a wrong password shows a generic error; refresh keeps you signed in; signing out ends the session server-side; unauthenticated API calls return 401.

**Slice 2: Dashboard, duty status, loads.** Dashboard (greeting, duty selector, active load), loads list with Current/Delivered tabs, expandable details, route strip, all four statuses.
Done when: Cody and Anthony see different loads; requesting another driver's load ID returns 404; every required load field is visible.

**Slice 3: Notifications.** List, filter (All/Urgent/Announcements/Unread), expand to read, mark read (per driver), mark all read, unread badge on nav, urgent banner and recent unread on the dashboard.
Done when: marking read as Cody does not change Anthony's unread state.

**Slice 4: Onboarding engine.** Template loader + validator (fails fast with a clear message on a bad template), phase grouping, task types, owner handling, due dates, dashboard progress card.
Done when: adding a task to the JSON template changes the UI with no code change; a driver cannot complete a company task via the API.

**Slice 5: Documents.** Required documents with status, upload with client and server validation, per-load proof of delivery, replace file, authenticated download.
Done when: a 20 MB file and a `.exe` are rejected with plain messages; one driver cannot download another's file.

**Slice 6: Support.** Emergency roadside (prominent tap-to-call), terminal support, dispatcher contact, ticket form with validation, ticket list.
Done when: tickets are scoped per driver and the form keeps typed text on a validation error.

**Slice 7: Live tracking map (stretch, time-boxed to one day).** Only start after Slices 0 to 6 pass review. The company asked for a demo map that "live tracks" drivers. Real tracking data is not available, so positions are simulated behind an interface that a real provider can replace.
- `TrackingProvider` interface: `getPosition(load)` returns `{ lat, lng, headingDeg, speedMph, updatedAt }`. Chosen by `TRACKING_PROVIDER=mock|samsara` in config.
- `MockProvider`: computes position from the load's pickup and delivery times along the route between origin and destination city coordinates, so there is no stored state and a reseed resets it. City coordinates live in one config table; an unknown city fails loudly in tests.
- `SamsaraProvider`: a documented stub only. It reads `SAMSARA_API_TOKEN`, makes no real calls, and throws "not configured." It marks where the real integration plugs in.
- `GET /api/tracking/active-load` returns the signed-in driver's own active load, position, route, progress, and ETA. It never accepts a driver or load ID from the client.
- UI: a Map screen (reachable from the active load card) using Leaflet with OpenStreetMap tiles (no API key), polling every 10 seconds, plus a load timeline (pickup, in transit, delivery, with timestamps). A visible "Simulated positions" label. If tiles fail to load, the route strip and timeline still work.
- Out of scope: real Samsara calls, route weather, and a multi-driver operations map (that is the dispatcher-facing view and needs roles; list it as a next step in the README).
Done when: Cody's truck visibly moves along its route over about 30 seconds; Anthony sees only his own state ("Not picked up yet"); a test proves the endpoint cannot return another driver's position; switching `TRACKING_PROVIDER` changes no UI code; the "Simulated" label is visible; and a tile failure degrades gracefully.

**Slice 8: Polish and ship.** Phone-width QA at 375 px, a11y pass (keyboard, labels, contrast), empty/loading/error states, README with a "where to look" guide, `docs/architecture.md` (one page: modules, data flow, auth flow, where authorization lives, for a human or AI reader), hosted deploy, the walkthrough script (`docs/walkthrough.md`), and the full verification checklist (section 15) run with real output.
Done when: the 5-minute walkthrough runs start to finish on a real phone without a single stumble.

## 11. Out of scope for v1

Real ELD/hours-of-service data, push notifications, a real admin back office, cloud file storage, internationalization, offline mode, real Samsara integration, route weather, a multi-driver operations map. State these in the README as intentional so reviewers see judgment, not omission.

## 12. What the owner must be able to explain in the review

1. Why a session cookie and not a JWT in localStorage.
2. Where server-side authorization happens and how you proved it works.
3. Why onboarding is data and how a non-developer would change it.
4. Why company-owned tasks are separate from driver-owned tasks.
5. What you cut and why.

## 13. Git workflow (commit incrementally, by hand-approved steps)

The commit history is part of the deliverable. A reviewer reading it should be able to follow how the app was built, slice by slice.

- **Branch per slice:** `slice-0-scaffold`, `slice-1-auth`, and so on. `main` always runs.
- **Commit only after the owner approves.** The agent never commits, pushes, or merges on its own initiative. When a slice is ready it says so, the owner reviews the diff, then tells it to commit.
- **Small, meaningful commits within a slice,** each leaving the app working. Messages are plain sentences in the imperative: "Add login rate limiting", "Scope loads query to the signed-in driver". No "wip", "fix", or "update".
- **Merge to `main` when a slice is approved, then tag it:** `slice-0-scaffold`, `slice-1-auth`, and so on. Tags let the owner roll back and explain the build order in the walkthrough.
- **Push after approval, never on a loop.** No auto-commit or auto-push tooling.
- **Never commit:** `node_modules`, `.env`, the SQLite database file, `uploads/`, build output. These are in `.gitignore` before the first commit. Commit a `.env.example` with placeholder values instead.
- **CI:** a GitHub Actions workflow (added in Slice 0) runs lint, typecheck, and tests on every push and pull request.
- **Deploy:** once hosting exists (Slice 8), only `main` deploys. Feature branches never touch the live demo.
- **Repo visibility:** public is fine. The company and all data in the demo are fictional, and the assessment brief is public. Keep real personal details and any secrets out of the repo regardless.

## 14. Working across two machines (Windows PC and MacBook)

The project is developed on a Windows PC and continued on a MacBook (Apple Silicon). Git is the only transfer mechanism. Never copy or zip the project folder; `node_modules` built on one OS will not work on the other.

**Set up once, in Slice 0:**
- `.gitattributes` containing `* text=auto eol=lf`, committed before any other file, so line endings stay consistent and diffs stay clean.
- `.nvmrc` and an `engines` field in the root `package.json`, pinning the same Node major version on both machines.
- npm scripts that work on both operating systems: use `cross-env` for environment variables, forward slashes in paths, and avoid shell-specific syntax such as `set X=1` (Windows only) or `export X=1` (bash only). Plain `&&` chaining is fine on both.
- Native dependencies avoided where possible. `better-sqlite3` ships prebuilt binaries for Apple Silicon and Windows; if a compile is triggered on the Mac, run `xcode-select --install` once.
- A `README` section "Setup on a new machine" with exact commands.

**Moving work between machines:**
1. Commit and push from the machine you are leaving (only after the slice is approved, per section 13; unfinished work goes on its own branch).
2. On the other machine: `git pull` (or `git clone` the first time), `npm install`, copy `.env.example` to `.env`, `npm run seed`, `npm run dev`.
3. Install the agent tooling (Claude Code, the pstack plugin) on each machine separately; it lives in user config, not in the repo. `CLAUDE.md` and `SPEC.md` travel with the repo.

**Files that intentionally do not travel** (all in `.gitignore`): `.env`, the SQLite database file, `uploads/`, `node_modules`, build output. The seed script must recreate working demo data on any fresh clone. If it does not, that is a bug.

**Second-machine check:** after Slice 0, and again after Slice 8, clone the repo fresh on the other machine and follow only the README. Fix the README, not your memory, when anything fails.

## 15. Verification (definition of done)

Run these and report **actual command output or measured numbers, not assumptions.** Items 1 to 3 run at the end of every slice. The rest run before Slice 8 is approved.

1. Fresh clone: `npm install && npm run dev` works; `npm run seed` resets demo data (checked on both machines).
2. `npm run lint` (lint and typecheck) completes with zero errors.
3. `npm test` passes, including the authorization tests.
4. Authorization proof: signed in as Cody, requests for Anthony's load, document, ticket, and tracking data all return 404 or 403, never data.
5. Upload tests: a 20 MB file and a `.exe` are rejected with plain-language messages.
6. Layout at 375 px, 768 px, and 1280 px with no horizontal scroll.
7. Keyboard: every interactive element is reachable and has a visible focus state.
8. Color contrast passes for text and buttons in light and dark mode.
9. Lighthouse (mobile) on login, home, and loads: Performance 90+, Accessibility 90+. Record the real numbers.
10. Every route and nav link resolves; no console errors during the walkthrough.
11. The 5-minute walkthrough runs on a real phone over cellular, against the hosted link.
12. `grep -rn "TODO\|FIXME"` output reviewed; anything left is intentional and listed in the README.

## 16. Decisions log

| Decision | Reason |
|---|---|
| Server-side sessions in an httpOnly cookie, not a JWT in localStorage | Safer against script access; simple to defend |
| SQLite, no external database | Zero setup for reviewers; real relational data; resets cleanly |
| Password login over PIN, for now | Stronger default. A PIN is friendlier on a phone and can be revisited later |
| Onboarding is data in a JSON template, not code | The company's process is broken and will change; no UI edits needed |
| Company-owned onboarding tasks are separate from driver-owned tasks | Many real steps are done by staff; drivers should see "waiting on", not a to-do |
| No containers (Docker) | The stack already needs zero setup; containers would add failure modes |
| Git workflow gated on owner approval, branch per slice | History is part of the deliverable; nothing half-reviewed gets pushed |
| Reviewers include a person who can read code, or an AI explaining the repo | Adds `docs/architecture.md`, a README "where to look" guide, and tests as documentation |
| Live map built behind a `TrackingProvider` interface with a simulated provider | No real data is available; the interface shows how the real integration would plug in |
| Map is a time-boxed stretch slice after the core requirements | The written requirements come first; scope is bounded |

## 17. Open questions

| # | Question | Status | Blocks |
|---|---|---|---|
| 1 | Submission deadline | Open | Slice scheduling; whether Slice 7 is cut |
| 2 | Stack confirmation (section 2 is still a proposed default) | Open | Slice 0 |
| 3 | What specifically is broken in their current onboarding | Unknown; the starter template is a placeholder | Onboarding template content |
| 4 | Who reviews the code, and how (Tim, AI-assisted, or both) | Open | Depth of README and architecture doc |
| 5 | Can Tim share his tracking tool code and the Samsara endpoints he used | Open | Slice 7 data shapes (optional) |
| 6 | Is the real project's map driver-facing or dispatcher-facing | Open | Slice 7 scope and any future role model |
| 7 | Hosting choice | Open | Slice 8 |
| 8 | Section 12 answers (owner's review prep) | Deferred by owner | Review readiness |