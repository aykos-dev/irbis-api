# irbis-api — Architecture

The single backend for Irbis. Serves the mobile app (`irbis-app`) and the admin panel
(`irbis-web`), owns the PostgreSQL database, and publishes the contract both clients generate
their code from: **`openapi.json`** at the repo root. (Product summary: `irbis-docs/PROJECT.md`.)

Companion document — mandatory:
**[`engineering-standards.md`](./engineering-standards.md)** — definition of done for every change.

---

## Tech Stack

Pinned. Do not substitute or add libraries without explicit approval (recorded here or as an ADR).
Versions are latest stable as of 2026-10-16 — replace with exact installed versions at scaffold time.

| Layer | Technology | Version |
| ----- | ---------- | ------- |
| **Runtime** | Node.js LTS | 22.x |
| **Framework** | NestJS (Express adapter) | 12.x |
| **Language** | TypeScript strict | per `PROJECT.md` |
| **Database** | PostgreSQL | 17+ |
| **ORM** | Prisma 7 (stable — not the 8.0 RC) + `@prisma/adapter-pg` | 7.10.x |
| **Contract** | `@nestjs/swagger` → `openapi.json` | 12.x |
| **Validation** | class-validator + class-transformer | 0.15 / 0.5 |
| **Auth** | JWT access + rotating refresh (ADR-001) | — |
| **Config** | `@nestjs/config` + zod | 12.x / 4.x |
| **Logging** | nestjs-pino | 5.x |
| **Security** | helmet, `@nestjs/throttler` | 8.x / 6.x |
| **Health** | `@nestjs/terminus` | 12.x |
| **Tests** | the runner the Nest CLI scaffolds (Jest) + supertest + Testcontainers | — |

> Prisma 7 uses `prisma.config.ts`, the `prisma-client` generator with an explicit `output`, and a
> driver adapter. Check Context7 for the pinned version before writing schema/client setup code.

---

## Request lifecycle

```
HTTP request
  → helmet / CORS allowlist / body limit
  → pino-http (requestId, redacted request log)
  → ThrottlerGuard (global; stricter on auth + value-granting routes)
  → JwtAuthGuard (global, deny-by-default; skipped only by @Public())
  → RolesGuard (@Roles)
  → ValidationPipe (whitelist, forbidNonWhitelisted, transform)
  → Controller (thin) → Service (rules, transaction) → Repository (Prisma)
  → response DTO (ClassSerializerInterceptor)
  ↘ any throw → GlobalExceptionFilter → { statusCode, code, message, fieldErrors?, requestId }
```

---

## Directory Structure

```
irbis-api/
├── openapi.json                 # THE contract — generated, committed
├── prisma/
│   ├── schema.prisma
│   ├── migrations/              # append-only
│   └── seed.ts                  # synthetic data only
├── prisma.config.ts
├── scripts/
│   └── export-openapi.ts        # boots the app without listening, writes openapi.json
├── docker-compose.yml           # local Postgres (+ test DB)
├── test/                        # e2e: <slug>.e2e-spec.ts, setup, factories
└── src/
    ├── main.ts                  # bootstrap: helmet, CORS, versioning, Swagger, pino
    ├── app.module.ts
    ├── config/
    │   ├── config.schema.ts     # zod schema — app refuses to boot if invalid
    │   └── app-config.ts        # typed config service (only place process.env is read)
    ├── common/
    │   ├── guards/              # jwt-auth.guard, roles.guard
    │   ├── decorators/          # @Public(), @Roles(), @CurrentUser(), @ApiErrorResponses()
    │   ├── errors/              # DomainError base + shared errors (NotFound, Conflict, Forbidden)
    │   ├── filters/             # global-exception.filter
    │   ├── interceptors/        # idempotency.interceptor
    │   ├── dto/                 # PaginationQueryDto, PageDto<T>, ErrorResponseDto
    │   └── pipes/
    ├── prisma/
    │   ├── prisma.module.ts
    │   └── prisma.service.ts    # client with pg adapter, lifecycle hooks
    ├── lib/                     # pure helpers: geo distance, cursor encode/decode, dates
    ├── health/                  # terminus /health (public)
    └── features/                # vertical slices — same slug as irbis-web / irbis-app
        ├── auth/                # sign in, OTP, refresh, sign out
        ├── users/               # me, profile, admin user lookup
        ├── spots/               # CRUD (admin), list/detail (app), verification
        ├── spot-checkin/        # check-in rules, XP award
        └── xp/                  # XP ledger, totals
```

Rules (enforced by dependency-cruiser in `npm run check`):

- Only `*.repository.ts` and `src/prisma/` import the Prisma client.
- `features/a` may import `features/b` **only via b's module exports (its service)** — never b's repository or DTO internals.
- `common/`, `lib/`, `config/` never import from `features/`.
- `process.env` only in `src/config/`.

---

## Feature Module Convention

```
features/<slug>/
├── <slug>.module.ts
├── <slug>.controller.ts        # thin: routes, guards, Swagger, DTO mapping
├── <slug>.service.ts           # business rules, transactions
├── <slug>.service.spec.ts      # unit tests
├── <slug>.repository.ts        # Prisma only
├── <slug>.errors.ts            # domain errors with stable codes
└── dto/
    ├── create-<entity>.dto.ts
    ├── update-<entity>.dto.ts
    ├── list-<entity>.query.dto.ts
    └── <entity>.response.dto.ts
```

---

## Domain Model

Provisional — extend as features land. Database names in brackets.

```
User [users]
├── id, displayName, phone (unique, never logged), role: 'user' | 'admin'
├── xpTotal                      # cached sum of xp_entries, updated in the same transaction
└── createdAt, updatedAt

RefreshToken [refresh_tokens]
└── id, userId, familyId, tokenHash, expiresAt, revokedAt, replacedById

Spot [spots]
├── id, name, description, lat, lng, radiusM (default 200)
├── verified, verifiedAt, verifiedById
└── createdAt, updatedAt

CheckIn [check_ins]
├── id, userId, spotId, lat, lng, distanceM, checkInDate (date in the rule's timezone)
├── createdAt
└── UNIQUE (userId, spotId, checkInDate)       # "once per day per spot" lives here

XpEntry [xp_entries]                            # append-only ledger
├── id, userId, amount (int), reason: 'check_in' | …, refId
├── createdAt
└── UNIQUE (reason, refId)                      # one award per source event

IdempotencyKey [idempotency_keys]
└── key, userId, route, requestHash, responseStatus, responseBody, createdAt, expiresAt
```

Invariants:

- **Check-in** succeeds only if the spot is `verified`, the server-computed distance ≤ `radiusM`,
  and no check-in exists for `(user, spot, day)`. Check-in + XP entry + `xpTotal` update are one
  transaction. Client-reported coordinates are input, not proof; anti-spoofing measures are a
  future ADR.
- **XP** is only ever changed by inserting an `XpEntry`; never by editing `xpTotal` directly.

---

## Representative Endpoints

| Method | Endpoint | Auth | Purpose |
| ------ | -------- | ---- | ------- |
| `GET` | `/health` | public | liveness + DB ping |
| `POST` | `/v1/auth/otp/request` | public | send OTP (rate-limited) |
| `POST` | `/v1/auth/otp/verify` | public | exchange OTP for tokens |
| `POST` | `/v1/auth/refresh` | public (refresh token) | rotate tokens |
| `POST` | `/v1/auth/sign-out` | user | revoke refresh family |
| `GET` | `/v1/me` | user | current user + XP |
| `PATCH` | `/v1/me` | user | update profile |
| `GET` | `/v1/spots?cursor=&limit=&near=` | user | list spots |
| `GET` | `/v1/spots/:id` | user | spot detail |
| `POST` | `/v1/spots` | admin | create spot |
| `PATCH` | `/v1/spots/:id` | admin | edit / verify spot |
| `POST` | `/v1/spots/:id/check-ins` | user | check in (idempotent) |
| `GET` | `/v1/me/check-ins` | user | own history |
| `GET` | `/v1/admin/spots/stats` | admin | check-in counts per spot |

---

## Contract workflow

```bash
npm run openapi:export        # writes openapi.json (no server needed)
# then, in irbis-web and irbis-app:
npm run gen:api && npm run check
```

`openapi.json` changes are part of the same commit as the code that changed it. A diff in
`openapi.json` the spec didn't call for is a review finding.

---

## Environments & deployment

- `local` (docker-compose Postgres), `staging`, `production`.
- Config only via env vars, validated at boot. `.env.example` committed with names only; real
  values filled in by a human locally and held in the secrets manager for deployed environments.
- Migrations run as a **separate release step** (`prisma migrate deploy`), never on app boot and
  never `migrate dev`/`db push` outside local.
- Stateless app instances; all state in Postgres.

---

## Decisions

| # | Decision | Resolution |
| - | -------- | ---------- |
| 1 | Auth | JWT access + rotating refresh, global deny-by-default guard (ADR-001). |
| 2 | Database | Postgres + Prisma; append-only migrations; invariants as DB constraints (ADR-002). |
| 3 | API style | REST `/v1`, OpenAPI as contract, clients use orval (ADR-003). |
| 4 | Geo | Lat/lng columns + distance in `lib/geo` (haversine). PostGIS only via a new ADR when spatial queries need it. |
| 5 | XP | Append-only ledger + cached total in one transaction. |
| 6 | Idempotency | `Idempotency-Key` stored for value-granting mutations. |

> Extend this doc as features land: entities to **Domain Model**, routes to **Representative
> Endpoints**, libraries to **Tech Stack** with their approval.
