## Handoff Checklist

- Project overview reviewed (`README.md`, `docs/SYSTEM_SPEC.md`)
- Single Source of Truth confirmed:
  - Zod contracts (`shared/contracts.ts`)
  - XState machines (`shared/machines/*`)
  - BDD features (`tests/bdd/*`)
  - Drizzle schema (`server/src/db/schema.ts`)
- Tooling & scripts:
  - `dev:orchestrate`, `test:e2e`, `bdd-diff`, `db:*`, `deploy:*`
- PWA:
  - Manifest present; service worker autoUpdate
- Testing:
  - Unit and E2E smoke run locally
  - Deterministic seeds if DB enabled
- CI:
  - Pipeline stages green; docs generation has no drift
- Env:
  - `.env.example` accurate; no real `.env` changes committed
- Docker/Azure:
  - Docker build OK; Azure WebApp notes in `docs/deploy.md`
- Follow-ups:
  - Redis presence, auth/RBAC, rate limits, observability backlog


