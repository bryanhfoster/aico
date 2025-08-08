## PR Title
Seed: unify Transit as aico master seed (PWA, SSOT, Drizzle, tests, CI)

### Context
- Why this change and scope
- Linked issues/epics

### Changes
- Client: PWA, `vanilla-extract`, features
- Server: Fastify, Drizzle path
- Shared: Zod contracts, XState machines
- Tests: Vitest, Playwright smoke, BDD
- CI/CD: pipeline, Docker, deploy docs

### SSOT compliance
- Contracts updated in `shared/contracts.ts` and consumed on both sides
- Machines in `shared/machines/*` reflect behavior; diagrams generated
- BDD features in `tests/bdd/*`; `bdd-diff` clean

### Testing
- Unit: results summary
- E2E: smoke pass/fail with links
- Coverage: if applicable

### Docs generation
- OpenAPI/AsyncAPI/JSON Schema up to date (no drift)
- Behavior diagrams refreshed

### Backward compatibility
- Any breaking changes? Migrations? Rollback plan

### Env & flags
- Client `VITE_*` used; no secrets required
- New flags (e.g., `VITE_AUDIO_ENABLED`): defaults and docs

### Checklist
- [ ] Typecheck, lint, build
- [ ] Docs generated and drift-checked
- [ ] Unit + E2E green locally
- [ ] No `.env` changes committed; `.env.example` updated if needed
- [ ] Docker build OK locally
- [ ] Azure deploy dry-run notes updated


