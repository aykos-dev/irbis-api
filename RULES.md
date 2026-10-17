# irbis-api — rules for a coding run (read this, not the full docs)

Full detail only if the brief points you there: `docs/architecture.md`, `docs/engineering-standards.md`.

## Shape
- NestJS 12 · Prisma 7 (pg adapter) · Postgres 17 · Vitest. Feature = `src/features/<slug>/`:
  `<slug>.controller.ts` (thin: route, guards, Swagger, DTO→response DTO) → `<slug>.service.ts` (rules, transactions)
  → `<slug>.repository.ts` (the ONLY Prisma user) + `<slug>.errors.ts` + `dto/`.
- Reuse before writing: `src/common/` (guards `@Public()` `@Roles()` `@CurrentUser()` `@Throttled()`, `DomainError`,
  global filter, `@ApiErrorResponses`), `src/lib/` (cursor, dates Asia/Tashkent, field-cipher),
  `src/features/auth/` (AccountStatusGuard, GuestMergeRegistry, SmsSender, PhoneCipher, PasswordService).
- `process.env` only in `src/config/` (zod). Prisma only in repositories (dependency-cruiser enforces).

## Contract
- REST `/v1`, camelCase JSON, ISO-8601 UTC. Every input = DTO with class-validator (max lengths, enums).
- Errors: throw a `DomainError` subclass with a stable `code` → `{ statusCode, code, message, fieldErrors?, requestId }`.
- Every route: `operationId`, response DTO, `@ApiErrorResponses`. After any endpoint/DTO change:
  `npm run openapi:export` and commit `openapi.json` with the code.
- Deny-by-default: only routes the spec makes public get `@Public()`. Admin routes: `@Roles('admin')`.

## Data
- `npx prisma migrate dev --name <change>` → a NEW migration; never edit an existing one; never `db push`.
- Invariants as DB constraints (unique / check / FK). Multi-write = one `$transaction`. XP only via ledger rows.
- Value from config (`GameConfig`), never hard-coded numbers the spec calls "decided after testing".
- Never log tokens, codes, phones, passwords (pino redaction covers the known keys — add new ones).

## Tests (budget)
- 1–3 unit tests per rule in the brief (service level, repository faked at its interface).
- e2e (Testcontainers) = the contract only: one success + each status code the AC names. No combinatorial matrices.

## Commands — quiet, always
- `npm run check` (lint · typecheck · unit+e2e · depcruise · slop; prints failures only). Green = done.
- `npm i --silent --no-audit --no-fund <pkg>` only for packages the brief approves.
- Long output: `… 2>&1 | tail -30`. Never print a whole log, schema or generated file.
- Dev API: `docker compose up -d db`; `npm run start:dev` in the background, log to a file, read its tail.

## Finish
Commit on the branch the brief names (Conventional message + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`),
no push. Reply ≤10 lines: what changed, deviations, last line of `npm run check`.
