# Tripmaster Workspace Guide (for AI builders)

This guide explains how to set up, run, and extend the Transit monorepo in a modular way. It also outlines a path to a “seed” core (admin + tools) with a composable UI layer on top.

## Layout (monorepo root)
- `client/` — Vite React app (Chat UI and presence)
- `server/` — Fastify server (REST + WebSocket) with LowDB JSON storage
- `shared/` — shared Zod schemas and TypeScript types
- `scripts/` — dev orchestrator and utilities
- `tests/` — Playwright e2e tests

Workspaces are declared in root `package.json` (`client`, `server`, `shared`).

## Prereqs
- Node.js 20+ (22 OK)
- Git Bash or a POSIX-like shell (Windows: Git Bash is fine)

## Environment
You can run with no manual `.env` setup. The dev orchestrator sets:
- `PORT` (server HTTP/WS)
- `VITE_PORT` (client dev)
- `VITE_SERVER_HTTP_URL`
- `VITE_SERVER_WS_URL`

Optional manual exports if not using the orchestrator:
```bash
export PORT=5175
export VITE_PORT=5173
export VITE_SERVER_HTTP_URL=http://localhost:$PORT
export VITE_SERVER_WS_URL=ws://localhost:$PORT
```

## Install
From repo root:
```bash
npm i
```
This installs all workspaces.

## Run (dev)
Two options:
- Orchestrated (recommended):
```bash
npm run dev:orchestrate
```
Writes `.dev-ports.json` with chosen ports and starts both apps.

- Manual:
```bash
npm run dev:server   # runs Fastify on PORT (default 5175)
npm run dev:client   # runs Vite on VITE_PORT (default 5173)
```

URLs:
- Client: http://localhost:5173 (or see `.dev-ports.json`)
- WS endpoint: `ws://localhost:<PORT>/ws`
- Health: `GET /api/health`
- Online GUIDs: `GET /api/guids`
- Account upsert: `POST /api/account` `{ guid, username?, email? }`

## Data (LowDB)
- Database file: `server/data/db.json`
- First run seeds minimal state on demand
- Reset by deleting `server/data/db.json`

## Build
```bash
npm run build -w shared
npm run build -w server
npm run build -w client
```
- Server output: `server/dist/`
- Client output: `client/dist/`

## Test (Playwright)
```bash
npm run test:e2e
```
Heads-up: e2e assumes the dev server(s) are running. Prefer launching them in a dedicated terminal pane first.

## Shared contracts (Zod)
Schemas live in `shared/zodSchemas.ts` and are used by server (REST/WS) and client. When adding messages or payloads:
1) Define Zod schema + TypeScript type in `shared/`
2) Validate server inputs with Zod
3) Use the inferred type on the client

## Server (Fastify + WS)
- Entry: `server/index.ts`
- Routes: `server/routes/index.ts`
- WebSocket: `server/ws/index.ts`, presence helpers in `server/ws/presence.ts`
- DB (LowDB): `server/db.ts`

Add a REST endpoint
1) Define payload schema in `shared/`
2) In `server/routes/index.ts`, `app.get(...)`/`app.post(...)`, Zod-validate `req.body`/`req.query`
3) Persist to LowDB via `db` and call `await db.write()`

Add a WS message type
1) Extend `wsClientToServerSchema` and/or `wsServerToClientSchema`
2) Handle it in `server/ws/index.ts`
3) Keep messages small and structured for reliability

## Client (Vite React)
- Entry: `client/src/main.tsx`, app: `client/src/App.tsx`
- Chat UI: `client/src/components/ChatUI.tsx`
- State machine: `client/src/state/chatMachine.ts`

Guidelines
- Use shared types from `shared/`
- Keep WebSocket interactions typed and minimal
- Follow UX rules in `README.md` (Design Guidelines)

## Modular architecture plan
Goal: establish a “seed” core (admin + tools) that rarely changes, and compose product UIs on top via configuration.

Proposed workspaces (incremental; add as needed):
- `packages/admin-core/` (seed)
  - Headless admin services, core entities, audit/logging utilities, access policies
  - Admin UI primitives (forms, tables) with accessibility baked in
  - Stable contracts and tokens; versioned independently
- `packages/ui-composer/` (seed)
  - Configuration DSL for composing screens from primitives (panels, lists, detail views)
  - Registry of components and adapters; JSON/TS configs → rendered routes
- `apps/console/` (app)
  - Admin console built by `ui-composer` configs + `admin-core` primitives
- `apps/transit-client/` (app)
  - End-user experience layering on the same primitives

Migration path from current layout
1) Extract stable, generic components and utilities from `client/` into `packages/admin-core/`
2) Introduce `packages/ui-composer/` with a minimal registry: panel, list, detail, action
3) Move current Chat UI into `apps/transit-client/` as a vertical slice; keep shared schemas in `shared/`
4) Wire routing: `ui-composer` consumes a config to build routes and screens

Example composer config (future)
```ts
// apps/console/src/screens.ts
import { defineScreens } from '@transit/ui-composer';

export default defineScreens({
  routes: [
    { path: '/', panel: 'DashboardPanel' },
    { path: '/clients', list: 'ClientsTable', detail: 'ClientDetail' },
    { path: '/messages', list: 'MessageList' }
  ]
});
```

Versioning and stability
- Treat `admin-core` and `ui-composer` as the “seed” that changes slowly
- Product apps evolve faster and consume these seeds via semver ranges

## Ops and DX
- Health: `GET /api/health` returns `{ ok: true }`
- Logs: Fastify logger enabled in dev
- Dev ports: `.dev-ports.json` produced by `npm run dev:orchestrate`
- Avoid committing secrets; do not auto-edit `.env` files

## CI ideas (future)
- Typecheck and lint per workspace
- Build server/client
- Launch ephemeral dev server, run Playwright smoke
- Artifact uploads: client `dist/`, server `dist/`

## Security and privacy
- Validate all inputs with Zod on the server
- Keep WS messages minimal; never trust client data
- Plan auth/roles for admin-core; least privilege when DB is introduced

## Roadmap (optional enhancements)
- Switch LowDB → Drizzle + PostgreSQL
- Generate Zod from DB schema (drizzle-zod) and emit JSON Schema for tools
- Add storybook and visual regression for `admin-core` primitives
- Add rate limiting and CORS allowlist

---
This document is the source of truth for setup and extension. For UX principles, see `README.md`.
