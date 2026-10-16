# irbis-api

NestJS + PostgreSQL + Prisma. Owns the contract: `openapi.json` at repo root.

**Before any change read:** `docs/architecture.md` (structure, stack, domain, decisions) and
`docs/engineering-standards.md` (definition of done — its Quick gate must pass).
Project-wide rules: `../irbis-docs/CLAUDE.md`. Prisma 7 setup differs from older docs — check Context7.

## Commands
- `npm run check` — lint + typecheck + tests + dependency-cruiser + slop grep, failures only. Green before "done".
- `npm run openapi:export` — writes `openapi.json`. Run and commit after any endpoint/DTO change.
- `npx nest g resource <slug>` — generators for boilerplate, then reshape to the feature layout.
- `npx prisma migrate dev --name <change>` — new migration. Never edit existing ones. No `db push`.
- `npm run test -- <path>` — single test; `npm run test:e2e` — e2e against real Postgres.
- `docker compose up -d db` — local database.

## Layout (details in docs/architecture.md)
`src/features/<slug>/` → `<slug>.controller.ts` (thin) → `<slug>.service.ts` (logic, transactions)
→ `<slug>.repository.ts` (the ONLY place Prisma is used) + `<slug>.errors.ts` + `dto/`.

## Shared modules — check before creating anything new
- `src/common/guards/`, `decorators/` — global JWT guard, `@Public()`, `@Roles()`, `@CurrentUser()`
- `src/common/errors/` — `DomainError` base + NotFound/Conflict/Forbidden
- `src/common/filters/global-exception.filter.ts` — the one error format
- `src/common/dto/` — PaginationQueryDto, PageDto, ErrorResponseDto
- `src/common/interceptors/idempotency.interceptor.ts`
- `src/lib/` — geo distance, cursors, dates
- `src/config/` — the only place `process.env` is read

## Non-negotiables (from the standards)
Deny-by-default auth · DTO validation on every input · response DTOs, never Prisma models ·
domain errors with stable codes · invariants as DB constraints · transactions + idempotency for value-granting writes ·
append-only migrations · redacted structured logs · e2e against real Postgres.
