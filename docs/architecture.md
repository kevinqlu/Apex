# Architecture

One page for a reader, human or AI, who is opening this repo for the first time. `SPEC.md` says what to build. This says how it is built.

## Modules

```
web/    React 19 + Vite + React Router. Runs in the driver's browser.
server/ Express 5 + TypeScript. Runs the API, the SQLite database, and file storage.
```

The two talk only through JSON over `/api`. In development Vite proxies `/api` to the server on port 3001. In production the server also serves the built web app, so everything is one address.

**Web (`web/src/`)**

- `routes/` has one folder per screen: login, home, loads, alerts, onboarding, documents, help.
- `components/` has shared pieces such as `LoadCard`, `StatusChip`, `AppShell`, and the two context providers (`AuthProvider`, `NotificationsProvider`).
- `api/` is the typed fetch client, one function per endpoint. `client.ts` is the only place that calls `fetch`.
- `lib/` has formatting, dates, and `useResource`, the hook every screen uses to load data with loading and error states.
- `styles/` has the design tokens and one CSS file per area.

**Server (`server/src/`)**

- `app.ts` builds the Express app and wires the middleware and routers in order. `index.ts` starts it.
- `middleware/` has `auth` (session check), `originCheck` (CSRF defense), `loginLimiter`, and `errors` (the one error shape).
- `routes/` has one router per area. Routes parse the request and call `db/`.
- `db/` holds all SQL: migrations, queries per area, and the seed.
- `config/` holds environment settings and the onboarding template validator.
- `uploads/` holds file-type sniffing and the size limit.

## Data flow

A screen calls a function in `web/src/api/`, which calls `client.ts`, which sends the request with the session cookie. The server middleware sets the driver, the router calls a query in `db/`, and JSON comes back. `useResource` turns that into `loading`, `ready` or `error` for the screen.

## Auth flow

1. `POST /api/auth/login` checks the Driver ID and password with bcrypt. The rate limiter counts failures per Driver ID and IP.
2. On success the server stores a random 32-byte id in the `sessions` table and sets it as an httpOnly, SameSite=Lax cookie (Secure in production) that lasts 12 hours.
3. Every later request carries the cookie. `requireSession` looks it up and sets the driver. An expired or missing session returns 401, and the web app sends the driver to sign-in with "Your session expired."
4. Sign out deletes the row, so the session ends on the server and not only in the browser.
5. Every change request (`POST` and the like) must come from an address listed in `APP_ORIGIN` and must be JSON. The only exception is the document upload, which is multipart.

## Where authorization lives

On the server, in two places.

- **Who you are** comes only from the session. No route reads a driver ID from the request.
- **What you may see** is enforced in the queries. Loads, documents and tickets are looked up with the owner in the SQL (`findLoad` in `db/loads.ts` is the model). Another driver's record is simply not found, so the route returns the same 404 as an ID that does not exist.

The tests that prove this are in `loads.test.ts`, `documents.test.ts` and `tickets.test.ts`.

## Onboarding is data

`server/config/onboarding.template.json` lists the phases and tasks. `config/onboarding.ts` checks it at startup and refuses to start with a message naming the task and field. The screens know how to show four task types (`video`, `upload`, `esign`, `company`). They do not know which tasks exist. Company tasks cannot be completed by a driver, and the server enforces that.

## Uploads

Multer keeps the file in memory with a 10 MB limit. The server checks the extension against an allow list and the first bytes of the file against the claimed type, so a program renamed to `.pdf` is refused. Files are stored under random names and are served only through `GET /api/documents/:id/file` after an ownership check.

## Seed data

`db/seed.ts` builds two drivers with loads, alerts, tickets and documents, all dated relative to now. `npm run seed` resets in place. On Render, `npm run start:demo` seeds on every start.

## Not built yet

Live tracking (`SPEC.md` Slice 7) is not built. When it is, positions come from a `TrackingProvider` interface and a simulated provider, and the endpoint takes no driver or load ID from the client.
