# Engineering Standards — irbis-api (NestJS)

These are the **definition of done** for every change in this repo. An endpoint that works but
skips these is not finished. Read with [`architecture.md`](./architecture.md).

If a change ships without an item below, the reason is written in the feature spec
(`irbis-docs/features/<slug>.md`) and the wrap-up summary — never silently omitted.

> Applied proactively on every feature. The `reviewer` agent checks the Quick gate on every diff.

---

## Quick gate

- [ ] Endpoint protected by the global auth guard; `@Public()` only where the spec says so; `@Roles()` where needed
- [ ] Every body / query / param is a DTO with class-validator; responses are typed response DTOs
- [ ] Swagger decorators complete; `npm run openapi:export` run and `openapi.json` committed
- [ ] Controller thin → service holds logic → repository is the only Prisma user
- [ ] Errors thrown as domain exceptions with a stable `code`; nothing swallowed
- [ ] Business invariants enforced in the database too (unique / check / FK constraints), not only in code
- [ ] Multi-write operations in one transaction; value-granting writes idempotent
- [ ] New migration only (never edited); destructive changes have a staged plan
- [ ] Lists are cursor-paginated with a max `limit`
- [ ] No N+1 queries; new filter/sort columns indexed
- [ ] Logs structured, no secrets or personal data
- [ ] Unit tests for service logic + e2e for each endpoint (happy path, validation, auth, forbidden, not found, conflict)
- [ ] `npm run check` green

---

## 1. Layering

| Layer | Owns | Must not |
| ----- | ---- | -------- |
| **Controller** | routing, DTO binding, Swagger, guards/decorators, mapping service result → response DTO | contain logic, touch Prisma, catch errors |
| **Service** | business rules, orchestration, transactions, authorisation beyond roles (ownership) | import Prisma client directly, know about HTTP (`Req`, `Res`) |
| **Repository** | all Prisma queries for its aggregate, select shapes | contain business rules, throw HTTP exceptions |

- One module per feature in `src/features/<slug>/`. Cross-feature calls go through the other
  module's **exported service**, never its repository.
- Pure helpers (distance, date math, pagination cursors) live in `src/lib/` and are unit-tested.
- Generators first: `npx nest g resource <slug>`, then reshape to this layout.

## 2. API contract & OpenAPI

- REST under `/v1`, plural kebab-case resources, camelCase JSON, ISO-8601 UTC timestamps (ADR-003).
- Every route has `@ApiOperation`, `@ApiOkResponse`/`@ApiCreatedResponse` with a response DTO, and
  `@ApiResponse` for each error it can return. `operationId` = `<Controller>_<method>` so orval
  generates stable hook names.
- Response DTOs are explicit classes — never return a Prisma model directly (leaks columns, couples
  the contract to the schema).
- `openapi.json` is regenerated and committed with every contract change. Breaking changes
  (removing/renaming a field, tightening validation) need an ADR or a new version.
- Enums are exported as named Swagger enums so clients get real union types.

## 3. Validation

- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Every input field has a validator (`@IsString`, `@Length`, `@IsLatitude`, `@IsUUID`, `@Max`…);
  optional fields `@IsOptional()` explicitly. Strings have max lengths. Arrays have max sizes.
- Path ids validated (`ParseUUIDPipe` or equivalent).
- Validation failures return `400` with `code: 'VALIDATION_FAILED'` and `fieldErrors: { field: [codes] }`
  — clients map these to form fields.

## 4. Errors

- One global exception filter produces `{ statusCode, code, message, fieldErrors?, requestId }`.
- Services throw **domain exceptions** (`SpotNotFoundError`, `CheckInTooFarError`,
  `CheckInAlreadyTodayError`) extending a base `DomainError` with a stable `code` and HTTP status.
  Clients branch on `code`; `message` is for humans and logs.
- Unknown errors → `500` `INTERNAL_ERROR`, logged with stack, **no internals in the response**.
- Never `catch { return null }`, never `console.log`. Catch only to translate or add context, then rethrow.
- Prisma errors are translated in the repository (`P2002` unique → `ConflictError`, `P2025` → `NotFoundError`).

## 5. Auth & authorisation

- Global JWT guard, **deny-by-default** (ADR-001). `@Public()` is reviewed every time it appears.
- `@Roles('admin')` for admin endpoints; ownership checks ("can this user edit this resource") in
  the service, not the controller.
- Current user via a `@CurrentUser()` decorator — never read `req.user` by hand.
- Access tokens short-lived; refresh tokens rotated, stored hashed, reuse revokes the family.
- Auth endpoints rate-limited (`@nestjs/throttler`), tighter than the global limit.

## 6. Database & Prisma

- Schema in `prisma/schema.prisma`; migrations via `npx prisma migrate dev --name <change>` only.
  **Never edit or delete an existing migration; never `db push` against a shared DB** (ADR-002).
- Tables snake_case plural (`@@map`), columns snake_case (`@map`), models PascalCase singular.
- Every table: `id` (UUID v7 or cuid), `created_at`, `updated_at` (`timestamptz`).
- **Invariants live in the DB**: unique constraints for "once per X", FKs with explicit `onDelete`,
  check constraints via SQL in the migration when Prisma can't express them.
- Index every foreign key and every column used in a filter/sort.
- `select` only the fields needed; no `include` chains that fetch whole graphs.
- Multi-step writes in `prisma.$transaction`. Raw SQL only via tagged `$queryRaw` (never `$queryRawUnsafe`).
- Destructive changes (drop/rename column) are **expand → migrate → contract** over separate releases.
- Money and points are integers. Never floats. Coordinates are `Decimal`/`double precision` with
  explicit precision.
- Seeds use synthetic data only (`user_1`, `+998XXXXXXXXX`). Never production exports.

## 7. Idempotency & concurrency

- Clients send `Idempotency-Key` on every mutation. Endpoints that **create or grant value**
  (check-in, XP award, anything financial) store the key + response and replay it on retry.
- Race-prone rules ("once per day") are guaranteed by a unique constraint, with the service
  translating the conflict — never by a read-then-write check alone.
- Optimistic concurrency (`version` column / `updatedAt` match) on records edited by admins concurrently.

## 8. Pagination, filtering, sorting

- Cursor pagination: `?cursor=&limit=` → `{ items, nextCursor }`; `limit` default 20, max 100.
- Filters and sort fields are whitelisted in the DTO (enum), never passed through to Prisma raw.
- Stable ordering: always a tiebreaker (`createdAt, id`).

## 9. Logging & observability

- **nestjs-pino** structured JSON logs; one request log line with method, route, status, duration,
  `requestId` (from `X-Request-Id` or generated, returned in the response header).
- **Redact** `authorization`, `cookie`, `set-cookie`, passwords, tokens, OTP codes, phone numbers,
  precise coordinates.
- Log levels: `error` for 5xx/unexpected, `warn` for suspicious 4xx (auth failures, rate limits),
  `info` for lifecycle, `debug` local only.
- `/health` (terminus: DB ping) is `@Public()` and excluded from request logs.

## 10. Security

- `helmet`, CORS **allowlist** from config (never `*` with credentials), body size limit.
- Global rate limit + stricter limits on auth and value-granting endpoints.
- Secrets only from env vars validated at boot; `.env` filled in by a human, never read by Claude,
  never committed; `.env.example` lists names only.
- Never return internal ids/fields the client doesn't need; never echo input into error messages unescaped.
- Location data: store what the feature needs (e.g. check-in coordinates for audit) and nothing more;
  never log it.
- Uploads (when added): size + MIME validation, stored outside the app server, served via signed URLs.

## 11. Configuration

- `@nestjs/config` with a **zod schema validated at startup** — the app refuses to boot on missing or
  malformed config. Typed `AppConfig` injected; no `process.env` outside `src/config/`.

## 12. Time & locale

- Store and compute in **UTC** (`timestamptz`). Day-boundary rules ("once per day") state their
  timezone explicitly in the spec and the code.
- `Accept-Language` selects the locale for human-readable `message`s; clients localise by `code`.

## 13. Testing

- **Unit** (`*.spec.ts` next to the service): business rules with the repository faked at its
  interface — not by mocking Prisma internals.
- **E2E** (`test/<slug>.e2e-spec.ts`): real Nest app + **real Postgres** (Testcontainers or the
  docker-compose test DB), migrations applied, data reset per test file. Each endpoint covers:
  success, validation `400`, unauthenticated `401`, forbidden `403`, not found `404`, conflict `409`
  where applicable.
- Tests written from acceptance criteria **before** implementation.
- Never modify, skip or weaken an existing test to make it pass — report it.
- Quiet output: `--silent`, summary/dot reporter — failures only.

---

## Libraries these standards require

| Library | For |
| ------- | --- |
| `@nestjs/*` core, `@nestjs/swagger` | framework, contract |
| `prisma`, `@prisma/client`, `@prisma/adapter-pg` | §6 database |
| `class-validator`, `class-transformer` | §3 validation |
| `@nestjs/passport` + `passport-jwt` (or `@nestjs/jwt` guard) | §5 auth |
| `@nestjs/throttler`, `helmet` | §10 security |
| `nestjs-pino`, `pino-http` | §9 logging |
| `@nestjs/terminus` | §9 health |
| `@nestjs/config`, `zod` | §11 config |
| `testcontainers` (dev), `supertest` (dev) | §13 tests |

**Deliberately not adopted yet** (raise via ADR): job queue (BullMQ), caching layer (Redis),
object storage, error tracking (Sentry), metrics/tracing (OpenTelemetry), PostGIS.
