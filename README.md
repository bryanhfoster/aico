## aico seed — Chat, Presence, and Trip Scheduling with Shared Contracts

Pitch: A modern, strongly‑typed TypeScript monorepo that ships a realtime chat (WS), presence, and a Tripmaster schedule slice. It uses shared Zod contracts across server and client, Vite‑powered DX, Playwright E2E, and a simple dev orchestrator so you can rebuild this in a day and scale it to enterprise later.

### Notable tools and why we chose them
- **TypeScript**: End‑to‑end static types for safer refactors and better IDE support.
- **Zod**: Single source of truth for contracts; validates REST/WS payloads and LowDB data; infers TS types for the client.
- **Fastify 5**: Fast, minimal, typed HTTP server with first‑class plugin ecosystem.
- **@fastify/websocket**: Lightweight WS upgrade handling integrated with Fastify routing.
- **LowDB**: Ultra‑simple JSON persistence for dev/prototyping; swap to Postgres later.
- **Vite 7**: Best‑in‑class dev server and build tooling for React; blazing fast HMR.
- **React 18**: Battle‑tested UI library with great ecosystem.
- **XState 5**: Deterministic state machines for chat/presence flows; easy testing and reasoning.
- **Playwright**: Reliable E2E/browser automation; runs headless and integrates with CI easily.
- **Vanilla Extract**: Type‑safe CSS; co‑locate styles with components without runtime cost.
- **OpenAI SDK (optional)**: Drop‑in AI responses when a key is present; otherwise echo fallback.
- **vite‑node**: Instant TypeScript execution for Node during development.
- **execa + get‑port**: Robust process orchestration and dynamic port selection for DX.
- **dotenv**: Conventional env loading in dev; pairs with our encrypt/decrypt helpers.

### Introduction
Transit is a compact, composable starter that demonstrates how to build:
- A websocket chat with presence and history
- A REST slice for “Tripmaster” route scheduling
- Shared contracts enforced at runtime and compile‑time
- A developer experience you can pitch: 1‑command dev, 1‑command tests

You can adopt it as a seed for aico or any app that needs typed WS + REST with a clear path to enterprise hardening.

### SSOT and consolidation docs
- See `docs/SYSTEM_SPEC.md` for Single Source of Truth and generation plan.
- See `CONSOLIDATION_PLAN.md` for the full consolidation roadmap and source→target mapping.

### Repository layout (high level)
- `client/` — Vite React app (chat UI, presence, sandbox gallery)
- `server/` — Fastify server (REST + WS) with LowDB JSON storage
- `shared/` — Zod schemas and shared types used on both sides
- `scripts/` — dev orchestrator, E2E runner, env encrypt/decrypt helpers
- `tests/` — Playwright E2E tests
- `TripMaster/` — a parallel vertical slice (client/server/shared/tests) for reference

### Quick start (Day 0)
1) Install prerequisites: Node 20+ (22 OK). On Windows, use Git Bash.
2) Install workspaces:
```bash
npm i
```
3) Run dev (auto‑ports, client+server):
```bash
npm run dev:orchestrate
```
4) Visit the client (port shown in `.dev-ports.json`), send a chat message, see echo and presence.
5) Run E2E (in a separate terminal after dev is up):
```bash
npm run test:e2e
```

### Core concepts (2 minutes)
- **Shared contracts**: `shared/contracts.ts` (SSOT) and `shared/zodSchemas.ts` (legacy) define WS/REST payloads and DB shape. Server validates; client consumes inferred types.
- **WebSocket flow**: Client connects to `/ws`, sends `hello{ guid }`, receives `whoami{ whoami, onlineGuids, messageHistory }`. User messages are `user_message{ guid, message }`; server replies with `assistant_message` (AI if key, else echo).
- **Presence**: In‑memory set; broadcast `presence{ onlineGuids }` on connect and cleanup on close.
- **Tripmaster schedule**: `GET /api/schedule?date=` returns routes with assigned legs and a holding pen of unassigned legs.

### Step‑by‑step path: beginning → enterprise

1) Starter (today)
   - Run dev orchestrator and verify:
     - Client loads, header shows `GUID` and `Online` count
     - Send chat → see your message instantly and `Echo:` assistant
     - Sandbox gallery (`?sandbox=1`) → “Tripmaster Schedule” renders
   - Must‑dos:
     - Keep schemas in `shared/` and use them in server routes/WS
     - Call `await db.write()` after every mutation
     - Use `data-testid` on critical UI elements for E2E stability
   - Suggestions:
     - Add small UX polish (aria‑labels, focus management)
     - Keep console logs during dev; gate them later

2) Team‑ready (this week)
   - Must‑dos:
     - Add basic CI: typecheck, lint, build, run Playwright smoke
     - Document new endpoints/messages directly in `shared/` as Zod
     - Add error handling patterns (400 from Zod `safeParse`, 500 on internal errors)
   - Suggestions:
     - Add reconnection logic (exponential backoff) and WS heartbeat
     - Centralize logging format; redact PII

3) Pre‑prod (this month)
   - Must‑dos:
     - Replace LowDB with Postgres via Drizzle; generate Zod from schema
     - Introduce auth (JWT/session) and RBAC; protect REST/WS
     - Add rate limiting and input size limits (REST + WS)
     - Configure CORS/Opcache strictly for known origins; enable TLS in front
     - Externalize secrets to a vault/KMS; stop using `.env` in prod
   - Suggestions:
     - Structured logging (pino) + request IDs; ship to a log backend
     - Observability: metrics (Prometheus/OpenTelemetry) and traces

4) Enterprise (scaling and governance)
   - Must‑dos:
     - Horizontal scale WS: move presence/session to Redis; use pub/sub for broadcasts
     - Database migrations and backups; DR strategy
     - SAST/DAST in CI; dependency scanning; SBOM
     - Clear SLIs/SLOs and alerting; error budgets
     - Disaster recovery runbooks; incident response process
   - Suggestions:
     - Feature flags; gradual rollout
     - Multi‑tenant design (row‑level security; tenant IDs in schemas)
     - Cost controls: cache, queue, and batch where feasible

### How to extend
- Add a REST endpoint
  1) Define payload/response in `shared/` with Zod
  2) Implement in `server/routes/index.ts` with `safeParse`
  3) Persist via `db` and `await db.write()`

- Add a WS message type
  1) Extend `wsClientToServerSchema` or `wsServerToClientSchema`
  2) Handle it in `server/ws/index.ts`
  3) Keep messages small and structured (IDs, timestamps)

### Testing
- Dev servers running? Then:
```bash
npm run test:e2e
```
Playwright asserts: chat echo, login prompt branch, presence count updates, and Tripmaster schedule visibility.

### Configuration
- Orchestrator sets: `PORT`, `VITE_PORT`, `VITE_SERVER_HTTP_URL`, `VITE_SERVER_WS_URL` (see `.dev-ports.json`).
- Optional AI: set `VITE_OPENAI_API_KEY` or `OPENAI_API_KEY` to enable real assistant replies.
- Secrets helpers: `npm run env:encrypt` and `npm run env:load` for secure local workflows.

### Deployment notes (suggested path)
- Containerize server and client separately; serve client static build behind a CDN; put server behind TLS proxy.
- Azure WebApp: deploy server container; configure env vars and secrets via Key Vault.
- For WS scale: add Redis for presence/pubsub and enable sticky sessions or token‑based routing.

### API quick reference
- WS in: `hello{ guid }`, `user_message{ guid, message }`
- WS out: `whoami{ whoami, onlineGuids, messageHistory }`, `assistant_message{ message }`, `presence{ onlineGuids }`, `error`
- REST: `GET /api/health`, `GET /api/guids`, `GET /api/schedule?date=YYYY-MM-DD`, `POST /api/master/assign`, `POST /api/master/unassign`, `POST /api/account`

### Roadmap highlights
- Drizzle + Postgres, auth/RBAC, rate limiting, Redis presence, CI with E2E, observability, Dockerization.

---

## Appendix: UX Design Guidelines

These guidelines translate core principles from Laws of UX into actionable rules for our team and AI contributors. Use them for all new UI, UX flows, copy, and visual changes. Source: [Laws of UX](https://lawsofux.com/).

### Core Principles (What to optimize for)
- **Aesthetic–Usability**: Clean, consistent visuals increase perceived usability. Prefer simple, high-contrast layouts.
- **Hick’s Law**: Reduce and simplify choices on any screen; group or stage complex tasks.
- **Fitts’s Law**: Make primary targets larger and closer to likely cursor/touch paths; preserve adequate spacing.
- **Doherty Threshold (<400ms)**: Keep interactions responsive; show immediate feedback if slower.
- **Jakob’s Law**: Follow familiar web/app conventions; avoid novel patterns unless clearly superior.
- **Chunking**: Break complex content into small, scannable sections; use progressive disclosure.
- **Cognitive Load**: Minimize reading, memory, and decision overhead.
- **Tesler’s Law**: Put irreducible complexity where it belongs; don’t offload system complexity onto users.
- **Postel’s Law**: Be liberal in what inputs we accept; be conservative in what we output/confirm.
- **Peak–End Rule**: Ensure a delightful moment and a clear finish state in flows.
- **Goal‑Gradient**: Show visible progress and near‑term milestones.
- **Miller’s/Working Memory**: Avoid requiring users to remember more than ~5–7 items.
- **Law of Proximity/Similarity/Common Region/Uniform Connectedness**: Use spacing, grouping, and visual connections to communicate relationships.
- **Prägnanz (Simplicity)** and **Occam’s Razor**: Prefer the simplest effective design.
- **Von Restorff (Isolation)**: Make the primary action visually distinct.
- **Selective/Serial Position**: Front‑load and end with key information.
- **Zeigarnik**: Preserve and surface incomplete work; provide resumable flows.

### Design Rules (Do/Don’t)
- **Navigation & IA**
  - Do keep global navigation under 5–7 items; group the rest.
  - Do use standard placements: logo top‑left, primary nav top/left, actions right.
  - Don’t bury core actions deeper than 2–3 clicks/taps.

- **Actions & Controls**
  - Do size primary buttons at least 44×44 px touch targets (Fitts’s Law).
  - Do use a single, visually dominant primary action per view (Von Restorff).
  - Don’t place destructive actions adjacent to primary without spacing and confirmation.

- **Forms & Inputs**
  - Do accept flexible input formats (Postel) and normalize internally.
  - Do validate inline and in real time; show specific, helpful errors.
  - Don’t require users to remember previous steps; echo context and choices.

- **Content & Copy**
  - Do lead with the user’s goal; put key info in headings and last lines (Serial Position).
  - Do chunk long text with headings, bullets, and progressive disclosure.
  - Don’t use jargon; prefer concise, action‑oriented copy.

- **Feedback & Performance**
  - Do respond within 400ms or show optimistic UI/skeletons/spinners.
  - Do show system status for async work with explicit success/failure states.
  - Don’t leave users in uncertain states; always confirm outcomes.

- **Visual & Theming**
  - Do maintain consistent spacing scale, typography, and color tokens.
  - Do ensure WCAG‑AA contrast for text; provide dark mode parity.
  - Don’t introduce new colors or sizes without updating tokens/components.

### Patterns to Prefer
- **Progressive Disclosure** for complex tasks (Hick’s, Cognitive Load).
- **Inline Editing** with immediate validation (Postel, Doherty).
- **Wizard/Stepper** for multi‑step flows with clear progress (Goal‑Gradient).
- **Empty States** that teach with example content and primary next action.
- **Undo over Confirm** for non‑destructive actions; Confirm for destructive.

### Anti‑Patterns to Avoid
- Long unstructured forms; replace with grouped steps and smart defaults.
- Ambiguous icon‑only buttons; include labels or tooltips.
- Multiple competing primary buttons on the same screen.
- Hidden critical actions behind non‑standard gestures or deep menus.

### Definition of Done for UX Changes
- Meets the laws above with explicit notes on Hick’s, Fitts’s, Doherty, and Aesthetic–Usability.
- Keyboard accessible and screen‑reader friendly; contrast meets AA.
- Primary action isolated and obvious; destructive actions safeguarded.
- Latency plan: instant, optimistic, or loading feedback path chosen.
- Copy reviewed for clarity and chunked; error states are specific and helpful.
- Progress and completion states exist; incomplete work persists/restores.

### PR Checklist (copy into your PR)
- [ ] Reduced choices or staged complexity (Hick’s); UI grouped/chunked.
- [ ] Targets sized and spaced appropriately (Fitts’s); primary action isolated (Von Restorff).
- [ ] Interaction within 400ms or feedback provided (Doherty).
- [ ] Uses conventions users expect (Jakob’s); avoids custom novelty.
- [ ] Accepts flexible inputs; outputs precise confirmations (Postel).
- [ ] Error, empty, loading, success states implemented.
- [ ] Accessibility: focus order, labels, roles, contrast AA, keyboard paths.

### Guidance for AI Contributors
- Always reference these rules when proposing UI changes; name the specific laws applied and why.
- Prefer modifying existing components/tokens over introducing new primitives.
- When trade‑offs exist, minimize user cognitive load first; then optimize speed and reachability.
- Provide before/after screenshots or storybook states when possible.

### References
- Laws of UX by Jon Yablonski: [lawsofux.com](https://lawsofux.com/)
