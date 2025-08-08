## aico Master Seed Consolidation Plan (aico)

This document defines the exact, step‑by‑step plan to consolidate overlapping projects into a single master seed in `aico/`. It captures guiding principles, single‑source‑of‑truth strategy, the feature inventory to merge, and explicit implementation instructions with commands.

Note: The workspace has been consolidated under `aico/`. All paths in this plan refer to `aico/`.

### Objectives and principles
- **Single source of truth**: contracts and behavior live in one place, everything else is generated from them.
- **TypeScript everywhere**: strict types, no `any`.
- **Vite + VITE_ envs**: public config only via `VITE_*` variables; validate at runtime.
- **No CDNs**: local packages only.
- **PWA first**: app identity is "aico".
- **Do not auto‑start servers**: tools/scripts respect developer control.
- **Non‑destructive automation**: no automatic env file edits; `.env.example` only.
- **Docker for deployments; Azure WebApp + GitHub** for production.

### Current state (aico)
- PWA is enabled in `client/vite.config.ts` with `vite-plugin-pwa`, and `public/manifest.webmanifest` exists.
- Shared layer exists: `shared/contracts.ts`, `shared/machines/` (chat machine re-exported), `shared/index.ts`.
- BDD features exist: `tests/bdd/chat.feature`, `tests/bdd/schedule.feature`.
- Orchestrator and env utilities present: `scripts/dev-orchestrator.ts`, `env-encrypt.ts`, `env-decrypt-load.ts`.
- Server is Fastify 5 with WS and LowDB; Drizzle not yet integrated.
- Workspace still references `@transit/*` names; rename to `@aico/*` remains.

### Chosen base and rationale
- **Base**: `aico/` (monorepo with `client/`, `server/`, `shared/`, `scripts/`, `tests/`, WS + REST, orchestrator, Playwright).
- **Imports** (remaining to pull/adapt):
  - From `seed/`: strict ESLint v9 flat config and Prettier (root-level), if needed.
  - From `Fresh/aico/`: Hume EVI module (function calling, audio capture/visualization), optional single‑file build.
  - From `5/tripmaster/`: Drizzle + Postgres schema/seeding and schedule APIs; Tripmaster client slice.
  - From `Fresh/server/DEPLOYMENT.md`: migration workflows and CI integration guidance.
  - From `Fresh/` automation: AI assistant macros and scripts (`ai:prep`, `ai:test-report`, `ai:pre-commit`) adapted to this repo.

### Single‑source‑of‑truth (SSOT) definitions
1) **Contracts (canonical):** Zod schemas in `shared/contracts.ts` define all domain models, REST payloads, and WS messages.
   - Generate: JSON Schema, OpenAPI (REST), AsyncAPI (WS), inferred TS types (auto).
2) **Behavior (canonical):** XState statecharts in `shared/machines/*.ts` define flows (chat/presence, Tripmaster, audio/session).
   - Generate: diagrams (Mermaid/PNG) and model‑based tests.
3) **Acceptance (authoritative outcomes):** BDD feature files in `tests/bdd/*.feature` reference machine state names and contract fields; enforced by a BDD diff.
4) **Database (persistence SoT):** Drizzle schema in `server/src/db/schema.ts`; DTOs and IO validation still derive from Zod.
5) **Configuration:** Only `VITE_*` public vars and secure server envs; Zod‑validated at startup.

### Scope of consolidation (feature inventory)
- Client
  - PWA: `vite-plugin-pwa`, `public/manifest.webmanifest`, icons, autoUpdate SW.
  - Styling: `vanilla-extract` typed CSS; keep simple, accessible UI.
  - UI features: chat with presence, Tripmaster schedule slice, optional Hume EVI audio module.
  - State: XState 5 for flows; Motion for animation; `react-icons/fc` for icons.
- Server
  - Fastify 5, `@fastify/websocket`, `@fastify/cors`.
  - REST + WS endpoints validated by Zod; LowDB for dev fallback.
  - Drizzle + Postgres schema, seeds, and schedule APIs.
- Tooling & DX
  - `vite-node` dev orchestrator with dynamic ports; non‑interactive scripts; integrated terminals.
  - ESLint v9 flat config, Prettier, strict TS checks.
  - Env helpers: encrypt/decrypt scripts; never mutate real env files.
- Testing
  - Vitest unit + coverage; Playwright E2E (headed/headless/UI).
  - BDD feature diff and smoke suites.
- Ops & Deployment
  - Dockerfiles; docker‑compose for local Postgres.
  - Azure WebApp deployment process + GitHub Actions CI.

---

## Implementation plan (step‑by‑step)

### 0) Branching and safety
```bash
git checkout -b seed/consolidation-aico
git status
```
Checklist:
- All changes happen under `aico/` unless noted.
- Do not edit `.env` automatically. Provide `.env.example` and docs.
- Prefer separate terminal tabs for long‑running scripts.

### 1) Establish SSOT modules
1.1 Refine `shared/contracts.ts` (already present) to cover all shared Zod schemas:
- Chat WS messages: `hello`, `whoami`, `user_message`, `assistant_message`, `presence`, `error`.
- Tripmaster REST: `ScheduleQuery`, `AssignRequest`, `UnassignRequest`, `AccountRequest`.
- Common entities: `Guid`, `Timestamp`, `Route`, `Leg`, `Trip`, `Driver`, `Vehicle`.

1.2 Expand `shared/machines/` (exists) with XState charts:
- `chatMachine.ts` (already re-exported): disconnected → connecting → ready → sending → error; events map 1:1 to WS messages.
- Add `presenceMachine.ts`: join/leave, heartbeats, broadcast updates.
- Add `scheduleMachine.ts`: load day → assign/unassign → optimistic UI → reconcile.
- Add `audioMachine.ts` (optional): Hume connect → streaming → interruption → cleanup.

1.3 Generators and outputs (scripts to add later):
- Zod → `docs/contracts/schemas/*.json`, `docs/contracts/openapi.json`, `docs/contracts/asyncapi.json`.
- XState → `docs/behavior/*.md` (Mermaid) or images.
- BDD → `tests/bdd/*.feature` referencing machine states and contract names.

### 2) Client consolidation (`client/`)
2.1 UI conventions:
- Ensure `react-icons/fc` usage is consistent for icons.
- Keep `vanilla-extract` tokens minimal and accessible (already present under `src/styles/`).

2.2 Features:
- Chat + presence UI: confirm `data-testid` attributes for E2E coverage.
- Tripmaster schedule view: wire to REST routes; accessible interactions for assign/unassign.
- Hume EVI module (optional; from `Fresh/aico/`):
  - Place in `client/src/evi/` (player, capture, visualizer, tool handling).
  - Feature‑flagged by `VITE_AUDIO_ENABLED` and `VITE_FUNCTION_CALLING_ENABLED`.
  - Runtime configuration picker (end‑user can select Hume configs); load via `VITE_` and/or a small JSON config served by the app.
  - Provide a "single‑file build" script if needed: `vite-plugin-singlefile` gated to a separate npm script.

2.3 Config and typing:
- Read only `VITE_*` vars; validate with Zod in `client/src/config.ts`.
- Never require secrets on the client; optional AI/Hume features are disabled if keys are absent.

### 3) Server consolidation (`server/`)
3.1 Fastify base:
- Keep `@fastify/websocket` at `/ws` (already present in `server/ws/`); validate WS messages with Zod from `shared/contracts.ts`.
- REST endpoints for Tripmaster: `GET /api/schedule?date=YYYY-MM-DD`, `POST /api/master/assign`, `POST /api/master/unassign`, `GET /api/health`, `GET /api/guids`, `POST /api/account`.

3.2 Persistence:
- Dev: LowDB JSON persistence retained for quick start (already present under `server/data/db.json`).
- Next: Integrate Drizzle + Postgres (from `5/tripmaster/`):
  - `server/src/db/schema.ts` (Drizzle schema)
  - `server/src/db/client.ts` (drizzle + pg pool)
  - `server/src/db/seed.ts` (deterministic seeds)
  - Scripts: `db:push`, `db:seed`, `deploy:generate`, `deploy:migrate`, `deploy:check`.

3.3 Security and ops:
- CORS allowlist configurable; sane body size limits; rate limiting for REST and WS.
- Structured logging (pino) with request IDs; health check includes DB ping.
- Secrets from env/Key Vault; never commit secrets.

### 4) Shared layer (`shared/`)
- Co‑locate only pure TS (no runtime side effects). Export inferred types from Zod for both sides.
- Provide a `shared/index.ts` barrel to re‑export contracts and machine types.

### 5) Scripts & orchestration (`scripts/` and npm scripts)
5.1 Dev orchestrator:
- Continue using `vite-node` to boot server + client with dynamic ports (write `.dev-ports.json`).
- Do not auto‑open browser; log URLs. Prefer integrated terminals.

5.2 Env utilities:
- Add `env:encrypt` and `env:load` commands (non‑destructive). Keep `.env.example` up to date.

5.3 AI automation macros (from `Fresh/`):
- Add `ai:prep`, `ai:test-report`, `ai:pre-commit` tasks adapted to this repo layout.

### 6) Testing
- Unit: Vitest with `@vitest/coverage-v8` (to add).
- E2E: Playwright `test:e2e`, `test:e2e:ui`, `test:e2e:headed`; smoke specs already present (`tests/smoke.spec.ts`).
- BDD: `.feature` files exist; wire `bdd-diff` script that checks drift between BDD scenarios, XState states, and Zod contracts.

### 7) Linting, formatting, and standards
- ESLint v9 flat config from `seed/`; zero warnings policy.
- Prettier v3; consistent formatting.
- TypeScript strict; forbid `any`.

### 8) Documentation
  - `docs/SYSTEM_SPEC.md`: index that points to contracts, behavior, and acceptance artifacts.
  - Generated docs: `docs/contracts/*` (OpenAPI/AsyncAPI/JSON Schema), `docs/behavior/*` diagrams.
  - Keep `aico/README.md` high‑signal with quick start and links.

### 9) CI/CD (skeleton to add)
- GitHub Actions pipeline (to add):
  - Install, typecheck, lint, build server/client.
  - Generate and diff docs (fail on drift vs sources).
  - Run unit tests and Playwright smoke.
  - Run `bdd-diff` to enforce acceptance coverage.
  - Build Docker image(s) and publish if on main.
- Azure WebApp deploy: containerize server; serve client via static hosting/CDN; inject envs securely.

### 10) Docker & local services (to add)
- `Dockerfile`(s): one for server, optional for client.
- `docker-compose.yml`: local Postgres (`postgres:16`), server, and optional admin tools.
- Server entry should run migrations on start when env flags are set.

### 11) Hume integration (optional module)
- Client‑only features: audio capture, EVI player, function calling demo/tool.
- Config: `VITE_HUME_API_KEY`, optional `VITE_HUME_CONFIG_ID`, plus runtime configuration picker for end‑users.
- Gate all Hume features by flags; absence of keys must not break the app.

---

## Source → Target mapping (high level)
- `seed/` (aico‑seed)
  - ESLint/Prettier/TS strict → repo root configs.
- `Fresh/aico/`
  - EVI audio modules → `client/src/evi/*` (player, capture, visualizer, tool handlers).
  - Optional single‑file build → extra npm script (no default path change).
- `5/tripmaster/`
  - Drizzle schema/seed → `server/src/db/*`.
  - Tripmaster APIs → `server/src/drizzleApi.ts` (or consolidated routes), wire to Drizzle.
  - Client slice → `client/src/features/tripmaster/*` (UI + API client).
- `Fresh/server/DEPLOYMENT.md`
  - Migrations and deploy scripts → `server/package.json` scripts and `docs/deploy.md`.
- `Fresh/` automation macros
  - npm scripts → `package.json` (`ai:*`), support files under `scripts/`.

---

## Source asset inventory (exact paths to pull)

Use these concrete paths during consolidation to avoid ambiguity.

- From `seed/` (aico‑seed)
  - Tooling
    - `seed/package.json` (copy lint/format/typecheck scripts)
    - `seed/eslint.config.mjs` or equivalent flat config (adopt rules)
    - `seed/.prettierrc*` or Prettier config (adopt)

- From `Fresh/aico/`
  - EVI module (client)
    - `Fresh/aico/src/audio-manager.ts`
    - `Fresh/aico/src/audio-visualizer.ts`
    - `Fresh/aico/src/hume-client.ts`
    - `Fresh/aico/src/weather-tool.ts`
    - `Fresh/aico/src/types.ts`
    - (optional) `Fresh/aico/src/test-setup.ts` for unit tests
  - Build
    - (optional) `serve-single-file.js` and `vite-plugin-singlefile` usage (document as optional)
  - Docs
    - `Fresh/aico/README.md` (reference implementation notes)

- From `5/tripmaster/`
  - Server (Drizzle)
    - `5/tripmaster/server/src/db/schema.ts`
    - `5/tripmaster/server/src/db/seed.ts`
    - `5/tripmaster/server/drizzle.config.ts` (or `drizzle.config.ts`)
    - `5/tripmaster/server/src/drizzleApi.ts` (endpoints)
  - Client (slice)
    - `5/tripmaster/client/src/ui/App.tsx` (master dashboard wiring reference)
    - `5/tripmaster/client/src/lib/api.ts` (API client patterns)
  - Workspace docs
    - `5/README.md` (Tripmaster workspace guide)

- From `Fresh/server/DEPLOYMENT.md`
  - Migration/deploy workflows → adapt into `server/package.json` and `docs/deploy.md`

- From `aico/`
  - Existing monorepo scaffolding: `client/`, `server/`, `shared/`, `scripts/`, `tests/` (keep structure; integrate SSOT)
  - `aico/README.md` (link to `docs/SYSTEM_SPEC.md` and this plan)

Note: If directory names differ locally, apply the same mapping to the active master seed directory. Keep plan filenames identical for searchability.

---

## Commands (guide; non‑destructive)
```bash
# 0) If this directory is not yet a git repo (optional)
git init
git add .
git commit -m "chore: initial commit"

# 1) Create branch
git checkout -b seed/consolidation-aico

# 2) Bring in strict linting from seed/
# (copy flat ESLint config and Prettier to repo root)
git add .
git commit -m "chore(lint): adopt strict ESLint flat config and Prettier at repo root"

# 3) Establish/complete SSOT modules (contracts, machines)
# (contracts/machines exist; wire server/client to consume them; plan presence/schedule machines)
git add .
git commit -m "feat(ssot): add shared contracts and state machines; adopt in server/client"

# 4) Integrate Drizzle + Postgres (optional at this step)
# (schema, seed, scripts; keep LowDB as dev fallback)
git add .
git commit -m "feat(db): add Drizzle schema/seed and migration scripts; keep LowDB fallback"

# 5) Add Hume EVI (optional; feature‑flagged)
# (client/src/evi/*; config flags; off by default)
git add .
git commit -m "feat(evi): add optional Hume EVI module behind VITE_ flags"

# 6) Testing & BDD
# (vitest config, playwright smoke, bdd-diff script + .feature files)
git add .
git commit -m "test(e2e+bdd): add Playwright smoke and BDD diff wiring"

# 7) CI/CD and Docker
# (workflows, Dockerfiles, docs)
git add .
git commit -m "chore(ci+docker): add GitHub Actions, Dockerfiles, and deployment docs"

# Finally, open PR
git push -u origin seed/consolidation-aico
```

---

## Risks and mitigations
- Drift between contracts, behavior, and docs → generation + CI diff gates.
- Optional modules adding bloat → feature flags (`VITE_AUDIO_ENABLED`, `VITE_FUNCTION_CALLING_ENABLED`).
- Env sprawl → single `VITE_*` surface for client; server env documented and validated; `.env.example` only.
- E2E flakiness → deterministic seed data; `data-testid` on critical elements; headed smoke in CI when needed.

## Definition of done
- PWA, strict linting, and SSOT modules in place and adopted by both server/client.
- Drizzle schema and seeds integrated; LowDB still usable for quick dev.
- Hume EVI optional module integrated behind flags; disabled by default.
- Playwright smoke green; unit tests green; BDD diff passes.
- CI enforces typecheck/lint/build/docs generation/drift checks.
- Docker build works locally; Azure deployment notes and workflow present.

## Post‑merge follow‑ups
- Add Redis presence + WS scaling (later).
- Replace LowDB endpoints completely once Drizzle slice matures.
- Add auth/RBAC, rate limiting, observability, and SBOM/scanning.

---

Notes
- Keep using integrated terminals; do not auto‑start servers.
- Do not modify real env files programmatically; provide examples and scripts only.
- Prefer simplicity and real objects over mocks; keep demos minimal yet functional.


---

## 30‑minute execution plan (6 × 5‑minute iterations)

Timebox deliverables are documentation‑only. No file creation yet; we prepare explicit commands and diffs to execute next.

### Iteration 1 (5 min): Repo prep and branch plan
- **Deliverables (docs)**:
  - Confirm target path: `aico/`.
  - Branching commands and safety checklist.
  - Repository tree expectations for `client/`, `server/`, `shared/`, `scripts/`, `tests/`, `docs/`.
- **Commands (to run later)**:
  ```bash
  git checkout -b seed/consolidation-aico
  git status
  ```

### Iteration 2 (5 min): SSOT scaffolding plan
- **Deliverables (docs)**:
  - Exact file list for SSOT modules (contracts + machines + bdd) with paths.
  - Copy‑paste stubs for `shared/contracts.ts`, `shared/machines/*.ts` (signatures only), `tests/bdd/*.feature` examples.
- **Commands (to run later)**:
  ```bash
  git add shared/contracts.ts shared/machines/* tests/bdd/* docs/SYSTEM_SPEC.md
  git commit -m "feat(ssot): add shared contracts, state machines, BDD skeletons"
  ```

### Iteration 3 (5 min): Client UI plan
- **Deliverables (docs)**:
  - Precise edits for `client/vite.config.ts` to add `vite-plugin-pwa` (autoUpdate), registration snippet placement.
  - Confirm `public/manifest.webmanifest` and icons inventory; naming and theme guidance.
  - `vanilla-extract` structure and where to place tokens.
- **Commands (to run later)**:
  ```bash
  git add client/src/styles/* client/src/components/*
  git commit -m "chore(client): align UI conventions and tokens"
  ```

### Iteration 4 (5 min): Server + Drizzle plan
- **Deliverables (docs)**:
  - File paths and exact exports for `server/src/db/schema.ts`, `server/src/db/seed.ts`, and `server/src/db/client.ts`.
  - REST route integration checklist and Zod validation wiring points.
  - Scripts: `db:push`, `db:seed`, `deploy:generate`, `deploy:migrate`, `deploy:check`.
- **Commands (to run later)**:
  ```bash
  git add server/src/db/* server/package.json
  git commit -m "feat(server): add Drizzle schema/seed and migration scripts"
  ```

### Iteration 5 (5 min): Testing + BDD + E2E plan
- **Deliverables (docs)**:
  - Vitest config locations; minimal unit test targets.
  - Playwright smoke spec outline (chat presence, schedule visible).
  - BDD `bdd-diff` wiring and step mapping strategy to XState + Zod.
- **Commands (to run later)**:
  ```bash
  git add tests/e2e/* tests/bdd/* package.json
  git commit -m "test: add Playwright smoke and BDD scaffolding with diff script"
  ```

### Iteration 6 (5 min): CI/CD + Docker + Hand‑off
- **Deliverables (docs)**:
  - CI pipeline stages: typecheck, lint, build, docs‑generate + drift‑check, tests, docker build, deploy.
  - Dockerfiles outline; docker‑compose for local Postgres.
  - Azure WebApp deployment notes and secrets management pointers.
  - Hand‑off checklist and Definition of Done.
- **Commands (to run later)**:
  ```bash
  git add .github/workflows/* Dockerfile docker-compose.yml docs/deploy.md
  git commit -m "chore(ci+ops): add CI pipeline, Dockerfiles, compose, and deploy docs"
  git push -u origin seed/consolidation-aico
  ```

---

## Immediate to‑do (first coding hour after docs)

Follow these in order; each should be a focused commit.

1. SSOT scaffolding (align with existing code)
   - Present files:
     - `shared/zodSchemas.ts` (contains existing schemas)
     - `client/src/state/chatMachine.ts` (existing chat machine)
   - Actions:
     - Create `shared/contracts.ts` that re-exports and gradually replaces pieces from `shared/zodSchemas.ts`.
     - Introduce `shared/machines/` folder and move/alias machine definitions there (keep client imports working via `shared/index.ts`).
     - Add `tests/bdd/chat.feature` and `tests/bdd/schedule.feature` with 1–2 scenarios each.

2. Client PWA
   - Bring `vite-plugin-pwa` config and `public/manifest.webmanifest`; add basic icons.
   - Ensure no auto‑open of browser in scripts.

3. Server Drizzle integration (skeleton)
   - Copy schema/seed files into `server/src/db/*`; add `db:push` and `db:seed` scripts.
   - Keep LowDB routes working; do not break existing endpoints.
   - Note: existing files `server/src/index.ts`, `server/routes/index.ts`, and `server/ws/*` should start consuming Zod from `shared/contracts.ts` over time.

4. Playwright smoke & bdd‑diff
   - Add smoke spec (chat loads, presence count visible, schedule renders stub).
   - Add `bdd-diff` script (placeholder) and wire npm script.

5. CI wiring (skeleton)
   - Add workflow with typecheck, lint, build, and Playwright smoke.
   - Add doc generation placeholders (skip actual generation step until next PR).

6. Docs index
   - `docs/SYSTEM_SPEC.md` already present; update references as SSOT evolves.

---

## Repo rename notes
- Workspace rename from Transit→aico is complete in directory structure.
- Update package names over time:
  - `aico/package.json` currently names workspace `@transit/shared`; plan to rename to `@aico/shared` when code references are updated.
  - Search and replace references to `@transit/*` after adding aliases/exports in `shared/index.ts` to prevent breakage.

## Initial PR outline (ready‑to‑use structure)

Title: "Seed: consolidate aico master seed (SSOT, Drizzle, tests, CI)"

Description (sections):
- Context and goals
- Single‑source‑of‑truth: contracts, machines, BDD
- Client: UI conventions
- Server: Fastify + Drizzle path
- Testing: unit, E2E, BDD
- CI/CD and Docker
- Risk and rollback
- Follow‑ups

Labels: `seed`, `architecture`, `pwa`, `testing`, `ci`, `db`

---

## Acceptance checklist (PR must satisfy)
- Contracts live in `shared/contracts.ts` and are consumed on both server and client.
- Machines live in `shared/machines/*` and are referenced by tests and BDD.
- PWA is enabled with manifest and autoUpdate SW.
- Tripmaster REST + WS validated with Zod; smoke E2E is green.
- Drizzle schema and seeds present; LowDB still available for dev.
- CI gates: typecheck, lint, build, docs generation + drift checks, unit + E2E, docker build.
- No env files modified automatically; `.env.example` updated.

---

## Hand‑off notes (for next engineer)
- Start at `docs/SYSTEM_SPEC.md` (index to contracts, behavior, and acceptance).
- Update Zod contracts first; re‑generate docs; then wire server/client.
- Keep XState machines and BDD features in sync; CI will block drift.
- Use feature flags for optional modules (EVI/Hume); absence of keys must not break builds.
- When hardening for prod: add Redis presence, auth/RBAC, rate limits, observability.


