# Apex driver portal

A proof-of-concept driver portal for Apex Logistics & Transportation Solutions, built as a hiring assessment. A driver signs in on a phone, sees their loads and alerts, finishes onboarding, uploads documents, and gets help. The company and every driver in the demo are fictional.

`SPEC.md` is the source of truth for scope and build order. A five-minute demo script is in [`docs/walkthrough.md`](docs/walkthrough.md).

## What it does

| Requirement                          | Where                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| Remote login, session persistence    | Sign-in screen, 12-hour session cookie, sign out ends it on the server                  |
| Announcements, urgent alerts, unread | Alerts screen, urgent banner on Home, per-driver read state, unread badge               |
| Assigned loads with all metadata     | Loads screen, four statuses, route strip with a truck marker                            |
| Dashboard                            | Home: duty status, active load, urgent alerts, onboarding progress                      |
| Onboarding checklist                 | Driven by a JSON template, so the company can change it without code                    |
| Document center                      | Required documents, proof of delivery per load, upload, replace, download               |
| Live map (stretch)                   | Map screen from the active load: simulated truck, timeline, "Simulated positions" label |
| Support                              | One-tap emergency roadside call, dispatcher and terminal, message form                  |

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

- **Cody Pheng, D-1042.** Hired 5 days ago. A load in transit, a delayed one, a pending one, and a delivered one with no proof of delivery. Two urgent alerts. Onboarding is done except signing the fleet policy, due today.
- **Anthony Jacob, D-2217.** Hired yesterday. One pending load and almost nothing complete, so the Onboarding and Documents screens have real work on them.

Signing in as each shows different loads, alerts, tickets and documents. That is the proof that data is scoped to the signed-in driver.

## Open it on a phone

Do this once per network. The phone and the computer must be on the same Wi-Fi.

1. Find the computer's address. On Windows, run `ipconfig` and read the IPv4 Address, such as `192.168.1.20`.
2. In `.env`, list that address after the usual one, separated by a comma: `APP_ORIGIN=http://localhost:5173,http://192.168.1.20:5173`. The server only accepts changes from addresses in this list.
3. Restart with `npm run dev`. The first time, Windows asks whether Node.js may use the network. Choose **Private networks** and allow it.
4. On the phone, open `http://192.168.1.20:5173` (your own address) in the browser.

The address can change when the router restarts. If the phone cannot sign in, check this list first.

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

## Deploy the demo (Render)

`render.yaml` describes the site, so Render sets it up for you. Only the `main` branch deploys, so slices must be merged to `main` first.

1. Push `main` to GitHub, including `render.yaml`.
2. On [render.com](https://render.com), sign in with GitHub. Choose **New**, then **Blueprint**, pick this repo, and apply it.
3. Wait for the first deploy to finish. Render shows the public address, such as `https://apex-driver-portal.onrender.com`.
4. Open it and sign in with a demo driver. Then make the QR code (below).

Render builds with `npm ci --include=dev && npm run build` and starts with `npm run start:demo`, which resets the demo data and starts the server. It sets `RENDER_EXTERNAL_URL` itself, so no address needs typing in.

**What to expect on the free plan:**

- **It sleeps after 15 minutes without a visit.** The first visit afterwards takes about a minute. Open the site yourself a few minutes before a demo.
- **The disk starts empty on every wake-up.** The data is seeded again each time, with dates relative to now, so it always looks fresh. Anything people did (uploads, tickets, signed forms) is gone after a sleep or a redeploy, which suits a demo.
- **Everything runs as one instance.** That is what the SQLite database, the in-memory sign-in limit, and local files need.

**Other hosts.** Any host that runs a Node server works. Use `npm ci --include=dev && npm run build` to build and `npm run start:demo` to start, and set `NODE_VERSION` to 22, `DEMO_MODE=true`, `TRUST_PROXY=1`, and `APP_ORIGIN` to the site's public address.

### The QR code

Once the site has an address, make the code with:

```
npx qrcode -o apex-qr.png -w 600 "https://apex-driver-portal.onrender.com"
```

Use your own address. Put the image on a slide, and save it outside this folder so it does not get committed. Scan it with a phone before the demo to be sure it opens the sign-in screen.

## Settings

These go in the environment (see `.env.example`):

| Setting                        | Why                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_ORIGIN`                   | The public address of the app. The server only accepts changes that come from it. Several addresses can be listed, separated by commas. |
| `DEMO_MODE`                    | `true` shows the demo drivers and the demo buttons. Leave it `false` for anything real.                                                 |
| `TRUST_PROXY`                  | Set to `1` behind a host that forwards requests, so the sign-in limit sees real addresses.                                              |
| `TRACKING_PROVIDER`            | `mock` (default) draws a simulated truck. `samsara` is a stub that is not connected. Positions are never real.                          |
| `TRACKING_SPEEDUP`             | How much faster than real time the simulated truck moves. 1000 in demo mode so it visibly moves, then it loops back to the start.       |
| `UPLOADS_DIR`, `DATABASE_PATH` | Where files and the database live. Use storage that survives restarts for anything real.                                                |

`npm run build` then `npm start` also serves everything from one address on your own computer, which keeps the session cookie same-site. The server runs TypeScript directly with `tsx`, so install with dev dependencies. Moving to several instances would need a shared database and shared session and file storage.

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
- Real Samsara tracking, route weather, and a map of every driver. The last is a dispatcher view and needs staff roles. The map here shows one driver's own load, with simulated positions behind a `TrackingProvider` interface a real provider can replace.
- A template editor for onboarding. Editing the JSON file is the intended step for now, and a small admin screen is the natural next one.

## Layout

- `web/` is the React app (Vite, TypeScript, React Router). Screens are in `routes/`, shared pieces in `components/`, the typed API client in `api/`.
- `server/` is the Express API with a SQLite database (better-sqlite3). Routes are in `routes/`, auth and request checks in `middleware/`, data access and the seed in `db/`.
- `docs/walkthrough.md` is the five-minute demo script.
- `docs/architecture.md` is a one-page tour of the modules, data flow, auth flow and where authorization lives.

## Where to look

| If you want to see...                        | Open                                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| How the pieces fit                           | `docs/architecture.md`                                                                 |
| What was asked for and in what order         | `SPEC.md`                                                                              |
| How sign-in and sessions work                | `server/src/routes/auth.ts`, `server/src/middleware/auth.ts`                           |
| Where one driver is kept from another's data | `server/src/db/loads.ts` (`findLoad`), and `loads.test.ts`                             |
| The onboarding checklist definition          | `server/config/onboarding.template.json`, checked by `server/src/config/onboarding.ts` |
| How uploads are checked                      | `server/src/uploads/fileType.ts`, `server/src/routes/documents.ts`                     |
| A screen and how it loads data               | `web/src/routes/loads/Loads.tsx`, `web/src/lib/useResource.ts`                         |
| The demo data                                | `server/src/db/seed.ts`                                                                |
| What the tests prove                         | The `*.test.ts` files in `server/src/`, one per area                                   |
