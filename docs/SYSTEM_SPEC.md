## SYSTEM_SPEC — Single Source of Truth (SSOT)

This spec defines the canonical sources and how all artifacts are generated and validated. It maps directly to the master seed `aico/`.

### Canonical sources
- **Contracts (Zod)**: `shared/contracts.ts`
  - Purpose: All domain entities, REST DTOs, and WS messages
  - Generates: JSON Schema, OpenAPI (REST), AsyncAPI (WS), inferred TS types
  - Note: Existing `shared/zodSchemas.ts` remains during migration and is re-exported by `shared/index.ts`.

- **Behavior (XState)**: `shared/machines/*.ts`
  - Purpose: Exact system flows and rules
  - Generates: Diagrams (Mermaid/PNG), model-based tests
  - Note: Existing `client/src/state/chatMachine.ts` will be aliased or moved under `shared/machines/`.

- **Acceptance (BDD)**: `tests/bdd/*.feature`
  - Purpose: Human-readable outcomes tied to machines and contracts
  - Enforced by: `bdd-diff` drift checks in CI

- **Database (Drizzle)**: `server/src/db/schema.ts`
  - Purpose: Persistence schema of record
  - Interop: DTOs validated via Zod contracts; seeds in `server/src/db/seed.ts`

- **Configuration**
  - Client: `VITE_*` only; parsed and validated via Zod at runtime
  - Server: environment variables documented in `.env.example`; validated on startup

### Generation plan (scripts to be added)
- `npm run generate:schemas` → Zod → JSON Schema (docs/contracts/schemas)
- `npm run generate:openapi` → Zod → OpenAPI (docs/contracts/openapi.json)
- `npm run generate:asyncapi` → Zod → AsyncAPI (docs/contracts/asyncapi.json)
- `npm run generate:machines` → XState → diagrams (docs/behavior)

### CI gates
1) Typecheck, lint, build
2) Generate docs, compare to committed outputs, fail on drift
3) Unit (Vitest) and E2E (Playwright smoke)
4) `bdd-diff` to ensure features map to machines/contracts
5) Docker build (server), optional publish on main

### Extension rules
- Update Zod contracts first, re-generate docs, then adapt server/client
- Update machines with named states and events; keep BDD scenarios in sync
- All optional modules behind feature flags; no secrets required on client


