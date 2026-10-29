# Apex Driver Portal

Hiring-assessment proof of concept. Read `SPEC.md` before any work; it is the source of truth for scope, data model, API, and slices.

## How we work

- The owner (Kevin) owns design decisions and reviews every diff. You write the code.
- Build **one slice at a time** from SPEC.md section 10, then stop. Do not start the next slice.
- At the end of each slice report: what you built, what you deliberately did not build, anything in the spec you disagree with or found ambiguous, and how to verify it by hand.
- If the spec is ambiguous or a decision is marked **[DECIDE]** and unconfirmed, ask. Do not guess silently.
- Keep diffs small and reviewable. Prefer boring, explainable code over clever code. The owner must be able to defend every line in a code review.
- Do not add a dependency without saying why, and prefer what is already in the stack.
- Git: work on a branch per slice (SPEC.md section 13). **Never commit, push, merge, or tag unless the owner tells you to.** When told to commit, make small commits with plain imperative messages, and never commit `.env`, the database file, `uploads/`, or `node_modules`.

## Commands

```
npm install          # install all workspaces
npm run dev          # web + server together
npm run seed         # reset demo data
npm run lint         # lint + typecheck
npm test             # server tests
```

(Slice 0 creates these. Keep this section accurate as scripts change.)

## Hard rules

1. **Authorization lives on the server.** Every data route derives the driver from the session. Never accept a driver ID from the client. Every route that takes a resource ID must check ownership and return 404 if it is not the caller's.
2. Never return or log password hashes or session ids.
3. Onboarding behavior comes from `server/config/onboarding.template.json`. Do not hardcode task content in components.
4. Error messages shown to users are plain language for drivers. No stack traces, codes, or jargon.
5. Seed data is relative to the current time. Never hardcode dates.
6. Every user-facing status uses an icon plus text, never color alone.

## Conventions

- TypeScript strict mode. No `any` without a comment explaining why.
- `web/src/` structure: `routes/` (one folder per screen), `components/` (shared UI), `api/` (typed fetch client, one function per endpoint), `lib/` (formatting, dates), `styles/` (tokens).
- `server/src/` structure: `routes/`, `middleware/` (auth, rate limit, origin check), `db/` (schema, migrations, queries, seed), `config/`.
- Validate request bodies at the route boundary and return the standard error shape from SPEC.md section 5.
- UI copy: sentence case, plain words, active voice. Buttons say what they do ("Upload file", not "Submit").
- Mobile first. Design at 375 px, tap targets at least 48 px, visible focus states.
- Comments explain why, not what. Add a short comment at each security-relevant decision.

## Tests (keep them few and meaningful)

- Auth: wrong password, expired session, rate limit.
- Authorization: driver A cannot read driver B's load, document, or ticket (this test must exist).
- Onboarding: a driver cannot complete a `company` task; a malformed template fails with a clear message.
- Uploads: oversize and disallowed type rejected.

## Definition of done for a slice

It runs from a clean clone, lint and tests pass, the acceptance criteria in SPEC.md for that slice are demonstrably met, and the end-of-slice report is written.