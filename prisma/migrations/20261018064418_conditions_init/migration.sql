-- CreateEnum
CREATE TYPE "ConditionStatus" AS ENUM ('go', 'caution', 'not_now', 'seasonal_lock');

-- CreateEnum
CREATE TYPE "ConditionSource" AS ENUM ('forecast', 'hazard_rule', 'closure', 'season', 'manual');

-- CreateEnum
CREATE TYPE "ClosureSource" AS ENUM ('official', 'admin');

-- CreateTable
CREATE TABLE "place_conditions" (
    "place_id" UUID NOT NULL,
    "status" "ConditionStatus",
    "source" "ConditionSource",
    "reasons" JSONB NOT NULL,
    "hazard_levels" JSONB NOT NULL,
    "weekend" JSONB NOT NULL,
    "forecast_at" TIMESTAMPTZ(3),
    "computed_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "place_conditions_pkey" PRIMARY KEY ("place_id")
);

-- CreateTable
CREATE TABLE "place_forecasts" (
    "place_id" UUID NOT NULL,
    "daily" JSONB NOT NULL,
    "fetched_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "place_forecasts_pkey" PRIMARY KEY ("place_id")
);

-- CreateTable
CREATE TABLE "closures" (
    "id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3),
    "reason_uz" VARCHAR(500) NOT NULL,
    "reason_ru" VARCHAR(500),
    "reason_en" VARCHAR(500),
    "source" "ClosureSource" NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),
    "ended_by_id" UUID,

    CONSTRAINT "closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condition_overrides" (
    "id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "status" "ConditionStatus" NOT NULL,
    "reason_uz" VARCHAR(500) NOT NULL,
    "reason_ru" VARCHAR(500),
    "reason_en" VARCHAR(500),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),
    "ended_by_id" UUID,

    CONSTRAINT "condition_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_conditions_status_idx" ON "place_conditions"("status");

-- CreateIndex
CREATE INDEX "closures_place_id_ended_at_idx" ON "closures"("place_id", "ended_at");

-- CreateIndex
CREATE INDEX "condition_overrides_place_id_ended_at_idx" ON "condition_overrides"("place_id", "ended_at");

-- AddForeignKey
ALTER TABLE "place_conditions" ADD CONSTRAINT "place_conditions_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_forecasts" ADD CONSTRAINT "place_forecasts_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closures" ADD CONSTRAINT "closures_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closures" ADD CONSTRAINT "closures_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closures" ADD CONSTRAINT "closures_ended_by_id_fkey" FOREIGN KEY ("ended_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_overrides" ADD CONSTRAINT "condition_overrides_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_overrides" ADD CONSTRAINT "condition_overrides_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_overrides" ADD CONSTRAINT "condition_overrides_ended_by_id_fkey" FOREIGN KEY ("ended_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
