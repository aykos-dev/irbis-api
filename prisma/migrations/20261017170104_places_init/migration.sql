-- CreateEnum
CREATE TYPE "place_type" AS ENUM ('peak', 'lake', 'cave', 'camping', 'trail', 'waterfall', 'canyon');

-- CreateEnum
CREATE TYPE "season_status" AS ENUM ('best', 'possible', 'closed');

-- CreateEnum
CREATE TYPE "hazard" AS ENUM ('avalanche', 'flood', 'mudslide', 'heat', 'road');

-- CreateTable
CREATE TABLE "places" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name_uz" VARCHAR(200) NOT NULL,
    "name_ru" VARCHAR(200),
    "name_en" VARCHAR(200),
    "type" "place_type" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "elevation_m" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "required_level" INTEGER NOT NULL,
    "region" VARCHAR(200),
    "description_uz" TEXT,
    "description_ru" TEXT,
    "description_en" TEXT,
    "season" "season_status"[] DEFAULT ARRAY[]::"season_status"[],
    "hazards" "hazard"[] DEFAULT ARRAY[]::"hazard"[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "places_slug_key" ON "places"("slug");

-- CreateIndex
CREATE INDEX "places_type_idx" ON "places"("type");

-- Invariants (spec § Data model).
ALTER TABLE "places"
  ADD CONSTRAINT "places_difficulty_check" CHECK ("difficulty" BETWEEN 1 AND 5),
  ADD CONSTRAINT "places_required_level_check" CHECK ("required_level" BETWEEN 1 AND 7),
  ADD CONSTRAINT "places_latitude_check" CHECK ("latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "places_longitude_check" CHECK ("longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT "places_season_check" CHECK (cardinality("season") IN (0, 12)),
  ADD CONSTRAINT "places_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
