# Apex driver portal

A proof-of-concept driver portal for Apex Logistics & Transportation Solutions. Drivers sign in on a phone, see their loads and alerts, finish onboarding, upload documents, and contact support.

This is a work in progress. `SPEC.md` is the source of truth for scope and build order.

## Run it

You need Node 22 (see `.nvmrc`).

```
npm install
cp .env.example .env
npm run seed
npm run dev
```

The web app is at http://localhost:5173 and the API at http://localhost:3001. Check the API with http://localhost:3001/api/health.

## Commands

| Command          | What it does                                 |
| ---------------- | -------------------------------------------- |
| `npm run dev`    | Starts the server and the web app together   |
| `npm run seed`   | Deletes the database and recreates demo data |
| `npm run lint`   | Lint and typecheck                           |
| `npm test`       | Server tests                                 |
| `npm run format` | Formats the code with Prettier               |

## Setup on a new machine

Git is the only way to move work between computers. Never copy the project folder, because `node_modules` built on one operating system will not work on another.

1. Install Node 22. On Windows: `winget install --id OpenJS.NodeJS.22 -e`. On Mac: `nvm install` (reads `.nvmrc`) or `brew install node@22`.
2. `git clone` the repo, or `git pull` if you already have it.
3. `npm install`
4. Copy `.env.example` to `.env` (`cp .env.example .env` on Mac, `copy .env.example .env` on Windows).
5. `npm run seed`
6. `npm run dev`

If a compile starts on a Mac with Apple Silicon, run `xcode-select --install` once. The `.env` file, the database, `uploads/` and `node_modules` are not in git on purpose. `npm run seed` rebuilds working demo data on any fresh clone.

## Layout

- `web/` is the React app (Vite, TypeScript, React Router).
- `server/` is the Express API with a SQLite database (better-sqlite3).
