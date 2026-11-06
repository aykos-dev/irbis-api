CREATE TYPE "league_tier" AS ENUM ('scout', 'tracker', 'ranger', 'vanguard', 'legend');
CREATE TYPE "league_season_status" AS ENUM ('active', 'settling', 'closed');
CREATE TYPE "league_outcome" AS ENUM ('champion', 'promoted', 'stayed', 'demoted');
CREATE TYPE "league_medal" AS ENUM ('gold', 'silver', 'bronze');

CREATE TABLE "league_seasons" (
  "id" UUID NOT NULL,
  "key" VARCHAR(20) NOT NULL,
  "name" VARCHAR(40) NOT NULL,
  "starts_at" TIMESTAMPTZ(3) NOT NULL,
  "ends_at" TIMESTAMPTZ(3) NOT NULL,
  "settles_at" TIMESTAMPTZ(3) NOT NULL,
  "status" "league_season_status" NOT NULL DEFAULT 'active',
  "finalized_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "league_seasons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_seasons_window_check" CHECK ("starts_at" < "ends_at" AND "ends_at" <= "settles_at")
);

CREATE TABLE "league_divisions" (
  "id" UUID NOT NULL,
  "season_id" UUID NOT NULL,
  "tier" "league_tier" NOT NULL,
  "number" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "league_divisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_divisions_number_check" CHECK ("number" > 0)
);

CREATE TABLE "league_members" (
  "id" UUID NOT NULL,
  "season_id" UUID NOT NULL,
  "division_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "tier" "league_tier" NOT NULL,
  "elevation_m" INTEGER NOT NULL DEFAULT 0,
  "qualifying_trips" INTEGER NOT NULL DEFAULT 0,
  "final_rank" INTEGER,
  "outcome" "league_outcome",
  "medal" "league_medal",
  "result_seen_at" TIMESTAMPTZ(3),
  "enrolled_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "league_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_members_counts_check" CHECK ("elevation_m" >= 0 AND "qualifying_trips" >= 0),
  CONSTRAINT "league_members_rank_check" CHECK ("final_rank" IS NULL OR "final_rank" > 0)
);

CREATE TABLE "league_contributions" (
  "id" UUID NOT NULL,
  "trip_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "season_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "elevation_m" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_contributions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_contributions_elevation_check" CHECK ("elevation_m" >= 0)
);

CREATE UNIQUE INDEX "league_seasons_key_key" ON "league_seasons"("key");
CREATE INDEX "league_seasons_status_settles_at_idx" ON "league_seasons"("status", "settles_at");
CREATE INDEX "league_seasons_starts_at_ends_at_idx" ON "league_seasons"("starts_at", "ends_at");
CREATE UNIQUE INDEX "league_divisions_season_id_tier_number_key" ON "league_divisions"("season_id", "tier", "number");
CREATE INDEX "league_divisions_season_id_tier_idx" ON "league_divisions"("season_id", "tier");
CREATE UNIQUE INDEX "league_members_season_id_user_id_key" ON "league_members"("season_id", "user_id");
CREATE INDEX "league_members_division_id_elevation_m_enrolled_at_idx" ON "league_members"("division_id", "elevation_m", "enrolled_at");
CREATE INDEX "league_members_user_id_created_at_idx" ON "league_members"("user_id", "created_at");
CREATE UNIQUE INDEX "league_contributions_trip_id_key" ON "league_contributions"("trip_id");
CREATE INDEX "league_contributions_user_id_season_id_idx" ON "league_contributions"("user_id", "season_id");
CREATE INDEX "league_contributions_season_id_created_at_idx" ON "league_contributions"("season_id", "created_at");

ALTER TABLE "league_divisions" ADD CONSTRAINT "league_divisions_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "league_divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_contributions" ADD CONSTRAINT "league_contributions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_contributions" ADD CONSTRAINT "league_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_contributions" ADD CONSTRAINT "league_contributions_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_contributions" ADD CONSTRAINT "league_contributions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "league_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
