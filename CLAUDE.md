# irbis-api

NestJS + PostgreSQL + Prisma. Owns the contract: `openapi.json` at repo root.
Project-wide rules: `../irbis-docs/CLAUDE.md`. Versions: `../irbis-docs/PROJECT.md`.

## Commands
- `npm run check` — lint + typecheck + tests + slop grep, failures only. Must be green before "done".
- `npm run openapi:export` — writes `openapi.json`. Run and commit after any endpoint/DTO change.
- `npx nest g resource <slug>` — use generators for boilerplate.
- `npx prisma migrate dev --name <change>` — new migration. Never edit existing ones. No `db push`.
- `npm run test -- <path>` — single test file.

## Layout
`src/features/<slug>/` → `<slug>.controller.ts` (thin, no logic) → `<slug>.service.ts` (logic)
→ `<slug>.repository.ts` (the ONLY place Prisma is used) + `dto/`.

## Shared modules — check before creating anything new
<!-- Keep this list current. -->
- `src/common/guards/` — global JWT guard (deny-by-default), `@Public()`, `@Roles()`
- `src/common/filters/http-exception.filter.ts` — the one error format
- `src/common/pipes/` — global `ValidationPipe` (whitelist, forbidNonWhitelisted)
- `src/lib/` — shared helpers (dates, geo distance, pagination)
- `src/prisma/prisma.service.ts`

## Errors
Throw Nest `HttpException` subclasses from services; the global filter formats them.
Never `catch { return null }`, never `console.log` — use the Nest `Logger`. Never log tokens or personal data.

## Tests
Unit tests next to services (`*.spec.ts`), e2e in `test/` against a real test DB.
Write them from the spec's acceptance criteria before implementing. Don't mock the thing under test.
