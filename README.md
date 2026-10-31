# Apex driver portal

A proof-of-concept driver portal for Apex Logistics & Transportation Solutions, built as a hiring assessment. A driver signs in on a phone, sees their loads and alerts, finishes onboarding, uploads documents, and gets help. The company and every driver in the demo are fictional.

`SPEC.md` is the source of truth for scope and build order. A five-minute demo script is in [`docs/walkthrough.md`](docs/walkthrough.md).

## What it does

| Requirement                          | Where                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Remote login, session persistence    | Sign-in screen, 12-hour session cookie, sign out ends it on the server    |
| Announcements, urgent alerts, unread | Alerts screen, urgent banner on Home, per-driver read state, unread badge |
| Assigned loads with all metadata     | Loads screen, four statuses, route strip with a truck marker              |
| Dashboard                            | Home: duty status, active load, urgent alerts, onboarding progress        |
| Onboarding checklist                 | Driven by a JSON template, so the company can change it without code      |
| Document center                      | Required documents, proof of delivery per load, upload, replace, download |
| Support                              | One-tap emergency roadside call, dispatcher and terminal, message form    |

## Run it

You need Node 22 (see `.nvmrc`).

```
npm install
cp .env.example .env
npm run seed
npm run dev
```

The web app is at http://localhost:5173 and the API at http://localhost:3001. On Windows PowerShell, use `copy .env.example .env` for the second step.

With `DEMO_MODE=true` (the default in `.env.example`) the sign-in screen lists two demo drivers and fills in the form for you. The demo password is `apex-demo-1`.

- **Marcus Reyes, D-1042.** Hired 5 days ago. A load in transit, a delayed one, a pending one, and a delivered one with no proof of delivery. Two urgent alerts. Onboarding is done except signing the fleet policy, due today.
- **Dana Whitfield, D-2217.** Hired yesterday. One pending load and almost nothing complete, so the Onboarding and Documents screens have real work on them.

Signing in as each shows different loads, alerts, tickets and documents. That is the proof that data is scoped to the signed-in driver.

## Commands

| Command          | What it does                                                   |
| ---------------- | -------------------------------------------------------------- |
| `npm run dev`    | Starts the server and the web app together                     |
| `npm run seed`   | Resets the demo data. Safe to run while the server is running  |
| `npm run lint`   | Lint and typecheck                                             |
| `npm test`       | Server tests                                                   |
| `npm run build`  | Builds the web app into `web/dist`                             |
| `npm start`      | Production mode: serves the built web app and the API together |
| `npm run format` | Formats the code with Prettier                                 |

## Onboarding template (Starter template)

What drivers see on the Onboarding screen comes from `server/config/onboarding.template.json`, not from code. The file that ships is a **Starter template**. It is the company's to change.

- **Add, remove, or reorder** a task by editing the `tasks` list. Tasks and phases show in the order they appear in the file.
- **Four task types:** `video` (the driver confirms they watched it), `upload` (done when a document of that `docType` exists, and it also appears on the Documents screen), `esign` (the driver types their name), and `company` (done by staff, so the driver only sees "Waiting on ...").
- **`dueDay`** is the number of days after the hire date.
- **Restart the server** after editing. If the file has a mistake, the server will not start and prints which task and field to fix.
- With `DEMO_MODE=true`, company steps show a dashed "Demo: mark complete" button so a walkthrough can show a step finishing. Drivers can never complete a company step otherwise.

## Tests

`npm test` runs the server tests. They cover the things that matter most:

- **Authorization.** One driver cannot read another's load, document, or ticket. Another driver's ID always looks the same as an ID that does not exist.
- **Auth.** Wrong password, expired session, the sign-in rate limit, sign out ending the session, the origin check.
- **Onboarding.** A driver cannot complete a company task. A malformed template fails with a message that names the task and field.
- **Uploads.** An oversize file and a disallowed type are refused, including a program renamed to `.pdf`.

## Production and hosting

`npm run build` then `npm start` serves everything from one address, which keeps the session cookie same-site. These settings go in the environment (see `.env.example`):

| Setting                        | Why                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `APP_ORIGIN`                   | The public address of the app. The server only accepts changes that come from it.          |
| `DEMO_MODE`                    | `true` shows the demo drivers and the demo buttons. Leave it `false` for anything real.    |
| `TRUST_PROXY`                  | Set to `1` behind a host that forwards requests, so the sign-in limit sees real addresses. |
| `UPLOADS_DIR`, `DATABASE_PATH` | Where files and the database live. Use storage that survives restarts.                     |

The server runs TypeScript directly with `tsx`, so install with dev dependencies on the host. The database is a single SQLite file, which suits one instance. Moving to several instances would need a shared database and shared session and file storage.

## Setup on a new machine

Git is the only way to move work between computers. Never copy the project folder, because `node_modules` built on one operating system will not work on another.

1. Install Node 22. On Windows: `winget install --id OpenJS.NodeJS.22 -e`. On Mac: `nvm install` (reads `.nvmrc`) or `brew install node@22`.
2. `git clone` the repo, or `git pull` if you already have it.
3. `npm install`
4. Copy `.env.example` to `.env`.
5. `npm run seed`
6. `npm run dev`

If a compile starts on a Mac with Apple Silicon, run `xcode-select --install` once. The `.env` file, the database, `uploads/` and `node_modules` are not in git on purpose. `npm run seed` rebuilds working demo data on any fresh clone.

## Design notes

- **A session cookie, not a token in localStorage.** The cookie is `httpOnly`, so a script injected into the page cannot read it. It is `SameSite=Lax` and `Secure` in production, and the server checks the `Origin` of every change. The session is a row in the database, so signing out really ends it.
- **Authorization lives on the server.** Every data route sits behind one middleware that sets the driver from the session. No route reads a driver ID from the request. Queries for loads, documents and tickets include the owner, so someone else's record is simply not found.
- **Onboarding is data.** Tasks, phases, order, due dates and owners live in a JSON file that is checked at startup. The screens know how to show four task types, not which tasks exist.
- **Company steps are not the driver's.** Real onboarding has many steps that staff do, such as record checks and the equipment walkthrough. The driver sees those as "Waiting on {owner}", never as a to-do, and the server refuses a driver who tries to complete one.
- **Built for a cab.** Designed at 375px, tap targets of 48px or more, plain words, no status that relies on color alone, dark mode, visible focus, and a skip link and page titles for keyboard and screen reader users. The accessibility checker axe reports no problems on any screen, in light and dark.

## Left out on purpose

These are cuts made for scope, not things that were missed:

- Real hours-of-service or ELD data. The duty status is a simple selector.
- Push notifications. Alerts update when the app loads or an action finishes.
- A back office. Alerts and tickets come from seed data, and staff steps are finished with the demo button.
- Cloud file storage. Uploads go to a local folder and are served only through an authenticated route.
- Translations, and working offline.
- A template editor for onboarding. Editing the JSON file is the intended step for now, and a small admin screen is the natural next one.

## Layout

- `web/` is the React app (Vite, TypeScript, React Router). Screens are in `routes/`, shared pieces in `components/`, the typed API client in `api/`.
- `server/` is the Express API with a SQLite database (better-sqlite3). Routes are in `routes/`, auth and request checks in `middleware/`, data access and the seed in `db/`.
- `docs/walkthrough.md` is the five-minute demo script.
