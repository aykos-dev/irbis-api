# irbis-api — Architecture

The single backend for Irbis — a gamified outdoor-safety app for Uzbekistan and Central Asia. Serves the mobile app
(`irbis-app`) and the admin panel (`irbis-web`), owns the PostgreSQL database, and publishes the contract both clients generate
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
    └── features/                # vertical slices — same slug as irbis-web / irbis-app (ROADMAP.md)
        ├── auth/  onboarding/  profile/        # Phase 1 accounts
        ├── places/  conditions/                # catalogue, trails, condition engine
        ├── levels/  lessons/  streaks/  badges/  weekly-path/   # progress (+ game-config, xp ledger in levels/)
        ├── trip-plan/  active-trip/  check-in/  safety-center/  # trips & safety
        └── …                                   # Phase 2+ features add their own folder
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

From the Product Overview (2026-10-16). Grouped by roadmap phase; a feature adds only its own tables, in its own
migration. Names are the Prisma models (DB tables snake_case plural). Numbers the doc calls "decided after testing"
(XP amounts, level thresholds, caps) live in **`GameConfig`**, never in code.

### Accounts & profile (Phase 1: `auth`, `onboarding`, `profile`)
```
User            id, username (unique, case-insensitive), passwordHash (argon2id), recoveryPhone? (encrypted,
                never logged), recoveryPhoneVerifiedAt?, displayName, avatarUrl?, locale (uz|ru|en),
                experience (beginner|weekend|experienced), interests[] (peak|cave|lake|camping|trail),
                level (1–7), xpTotal, gems, role (user|admin|operator), createdAt
RefreshToken    id, userId, familyId, tokenHash, expiresAt, revokedAt, replacedById
PasswordReset   id, userId, codeHash, expiresAt, attempts, usedAt      — SMS code, single use
LoginAttempt    username, ip, at, ok                                    — rate limit + lockout
(trusted account = createdAt older than 7 days; no separate flag)
EmergencyContact id, userId, name, phone (encrypted at rest), relation
Device          id, userId, platform, pushToken, locale
```

### Places & conditions (Phase 1: `places`, `conditions`)
```
Region          id, slug, name{uz,ru,en}, country, offlinePackUrl?, bbox
Place           id, regionId, type (peak|lake|cave|camping|trail), name{uz,ru,en}, lat, lng, elevationM,
                difficulty (1–5), requiredLevel (1–7), seasonMonths[12] (best|possible|closed), hazards[]
                (avalanche|flood|mudslide|heat|road_closure|…), safetyTips{…}, visibility (public|fragile),
                verification (pending|community|official), discovererId?, createdAt
Trail           id, placeId, name, difficulty, lengthM, durationMin, gpx, requiredLevel, waypoints[]
Waypoint        id, trailId, order, lat, lng, radiusM, name
Condition       placeId, status (go|caution|not_now|seasonal_lock), reasonCode?, reasonText{…}, source
                (forecast|hazard_rule|report|closure|manual), validFrom, validTo, computedAt
ConditionReport id, placeId, userId, kind, note, photoUrl?, createdAt
Closure         id, placeId, from, to, reason, source (official|admin)
PlaceRating     userId, placeId, beauty, difficulty, crowding (1–5)
```

### Progress (Phase 1: `levels`, `lessons`, `streaks`, `badges`, `weekly-path`)
```
GameConfig      key, value (json), updatedBy, updatedAt          — XP table, level requirements, caps, chest rule
XpEntry         id, userId, amount, reason (check_in|waypoint|lesson|discoverer|discoverer_visit|top_shot|post|
                game|campfire|…), refId, createdAt              — append-only; UNIQUE (reason, refId)
LevelUp         id, userId, fromLevel, toLevel, at
LessonTier      id, order, name{…}, unlocksLevel
Lesson          id, tierId, order, title{…}, xp, cards[] (question, options, answer, explanation)
LessonAttempt   id, userId, lessonId, correct, hearts, completedAt
Streak          userId, kind (daily|explorer), current, best, lastDay, shieldedWeeks[]
Badge           id, family, code, tier?, name{…}, rule (json), seasonal?, closesAt?, perk?
UserBadge       userId, badgeId, progress, earnedAt?            — UNIQUE (userId, badgeId)
WeeklyPath      id, userId, weekStart (Mon, Asia/Tashkent), nodes[] (placeId, order, status), chestOpenedAt?
```

### Trips & check-ins (Phase 1: `trip-plan`, `active-trip`, `check-in`, `safety-center`)
```
Trip            id, userId, placeId, trailId?, date, startAt, returnAt, contactId, gear[], state
                (planned|active|checked_out|overdue|alerted|cancelled), sharedAt?, startedAt?, checkedOutAt?
TripPoint       tripId, lat, lng, elevationM, accuracyM, at   — live tracking (retention-limited)
CheckIn         id, userId, placeId, tripId?, waypointId?, kind (place|waypoint), lat, lng, distanceM,
                verified, checkInDay, createdAt                 — UNIQUE (userId, placeId, checkInDay) for place
Alert           id, tripId, kind (overdue_sms|sos_sms|sos_call), sentAt, toPhoneMasked, status
```

### Community (Phase 2)
```
Group, GroupMember(role owner|admin|member), Message, TripEvent(placeId, date, meetingPoint, maxParticipants,
minLevel, gear[]), TripEventMember(state requested|approved|declined), BuddyRating(reliable, safetyFirst, goodCompany),
Post(photos[≤10], caption, placeId, tripType solo|group|tour, enterTopShots), PostLike, PostTag(approved?),
TopShotsRound(startsAt Mon 00:00, endsAt 2nd Sun 23:59 Asia/Tashkent), TopShotsResult,
Report(reason, targetType, targetId, reporterTrusted), ModerationAction(warning|mute_7d|ban, appeal),
Block, HiddenAuthor, SpotSubmission(→ Place pending), SpotVerification(userId, placeId, checkInId)
```

### Engagement (Phase 3)
```
GeoPack, GeoRound(imageRef opaque, placeId), GeoDaily(day), GeoGuess(score, distanceM), Duel, League(tier, week),
LeagueMember(elevationM), Season(collection), GemTransaction, CampfireResult(game, xp, syncedAt)
```

### Revenue (Phase 4)
```
Operator, Tour, Booking, CommissionRule(per operator), GearItem, PickupPoint, Rental, Subscription(plan, trialEndsAt)
```

### Invariants (enforced in the database, not only in services)
- **Guest-first:** read endpoints guests need are `@Public()` (places, conditions, regions, lessons, feed reads);
  everything that writes, awards or reveals another user's data requires a session.
- **XP** changes only by inserting an `XpEntry` (`UNIQUE (reason, refId)` = one award per source event); `User.xpTotal`,
  level and caps are updated in the same transaction. Daily caps (games 30/day, post 5/day) are checked in that
  transaction against `XpEntry` for the Tashkent day.
- **Levels** need XP **and** lessons **and** verified check-ins at difficulty — the level service evaluates all three;
  no endpoint sets `level` directly. Gems and payments never change level or unlock difficulty.
- **Difficulty lock:** a place / trail above the user's level can be viewed but not started (server refuses).
- **Check-in** is verified server-side (distance to the place/waypoint, accuracy, trip state); client coordinates are
  input, not proof. One place check-in per user per place per Tashkent day.
- **Safety:** `Trip` overdue detection runs server-side (auto-alert SMS 1 h after `returnAt` without check-out); SOS
  works even when the rest of the API is degraded (separate, minimal endpoint + SMS fallback from the device).
- **Fragile** places never appear with coordinates in feed or game payloads; photo EXIF is stripped on upload.

### Scheduled jobs (in this service, Asia/Tashkent)
Weekly path rebuild (Mon 00:00) · condition recompute (hourly + on forecast update) · overdue trip check (every
minute) · daily game reset (00:00) · streak evaluation (00:05) · league week close (Sun 23:59) · Top Shots round
close (every 2nd Sun 23:59). Implemented with a job runner chosen in the first feature that needs one (ADR).

---

## Representative Endpoints

Phase 1 surface (each feature adds its own; all under `/v1`, auth required unless marked public):

| Method | Endpoint | Feature |
|---|---|---|
| `GET` | `/health` (public) | health |
| `POST` | `/v1/auth/sign-up` · `/v1/auth/log-in` · `/v1/auth/password/forgot` · `/v1/auth/password/reset` (public) · `/v1/auth/refresh` · `/v1/auth/sign-out` | auth |
| `GET` | `/v1/auth/username-available?u=` (public, rate-limited) | auth |
| `POST` | `/v1/me/guest-merge` (onboarding choices, lesson progress, saved places from the device) | auth |
| `PUT` | `/v1/me/recovery-phone` · `POST /v1/me/recovery-phone/verify` | auth |
| `GET` / `PATCH` | `/v1/me` | profile, onboarding |
| `PUT` | `/v1/me/onboarding` (language, experience, interests) | onboarding |
| `GET` | `/v1/places?type=&region=&near=` · `/v1/places/:id` · `/v1/places/:id/trails` | places |
| `GET` | `/v1/places/:id/condition` · `POST /v1/places/:id/reports` | conditions |
| `GET` | `/v1/me/path` (this week) · `POST /v1/me/path/swap` · `POST /v1/me/path/chest` | weekly-path |
| `GET` | `/v1/me/level` (requirement bars, next companion) | levels |
| `GET` | `/v1/lessons` · `POST /v1/lessons/:id/attempts` | lessons |
| `POST` | `/v1/trips` · `POST /v1/trips/:id/start` · `/v1/trips/:id/points` · `/v1/trips/:id/check-out` | trip-plan, active-trip |
| `POST` | `/v1/trips/:id/sos` | active-trip |
| `POST` | `/v1/check-ins` (place or waypoint, idempotent) | check-in |
| `GET` | `/v1/me/streaks` · `/v1/me/badges` · `/v1/badges` | streaks, badges |
| `GET` | `/v1/regions` (+ offline pack links) | safety-center |
| admin | `/v1/admin/places` CRUD · `/v1/admin/closures` · `/v1/admin/lessons` · `/v1/admin/config` | web |

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
| 4 | Geo | Lat/lng columns + distance in `lib/geo` (haversine). PostGIS likely needed for Explore map / nearby / duplicate spot check — decide in `places` (ADR). |
| 5 | XP | Append-only ledger + cached total in one transaction; amounts and caps from `GameConfig`. |
| 6 | Idempotency | `Idempotency-Key` stored for value-granting mutations. |

> Extend this doc as features land: entities to **Domain Model**, routes to **Representative
> Endpoints**, libraries to **Tech Stack** with their approval.
