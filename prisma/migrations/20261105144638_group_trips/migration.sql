-- CreateEnum
CREATE TYPE "group_trip_visibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "group_trip_status" AS ENUM ('open', 'cancelled');

-- CreateEnum
CREATE TYPE "group_trip_role" AS ENUM ('leader', 'member');

-- CreateEnum
CREATE TYPE "group_trip_member_status" AS ENUM ('pending', 'approved', 'rejected', 'left');

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "group_trip_id" UUID;

-- CreateTable
CREATE TABLE "group_trips" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "visibility" "group_trip_visibility" NOT NULL,
    "status" "group_trip_status" NOT NULL DEFAULT 'open',
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "back_by" TIMESTAMPTZ(3) NOT NULL,
    "meeting_text" VARCHAR(120) NOT NULL,
    "meeting_lat" DOUBLE PRECISION,
    "meeting_lng" DOUBLE PRECISION,
    "carpool_from" VARCHAR(5),
    "carpool_seats" INTEGER,
    "max_people" INTEGER,
    "min_level" INTEGER,
    "gear_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "custom_gear" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" VARCHAR(500) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "group_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_trip_groups" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "message_id" UUID,

    CONSTRAINT "group_trip_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_trip_members" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "group_trip_role" NOT NULL,
    "status" "group_trip_member_status" NOT NULL,
    "note" VARCHAR(200),
    "personal_trip_id" UUID,
    "attended_at" TIMESTAMPTZ(3),
    "decided_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "group_trip_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_trips_status_start_at_idx" ON "group_trips"("status", "start_at");

-- CreateIndex
CREATE INDEX "group_trips_place_id_start_at_idx" ON "group_trips"("place_id", "start_at");

-- CreateIndex
CREATE INDEX "group_trip_groups_group_id_idx" ON "group_trip_groups"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_trip_groups_trip_id_group_id_key" ON "group_trip_groups"("trip_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_trip_members_personal_trip_id_key" ON "group_trip_members"("personal_trip_id");

-- CreateIndex
CREATE INDEX "group_trip_members_user_id_status_idx" ON "group_trip_members"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "group_trip_members_trip_id_user_id_key" ON "group_trip_members"("trip_id", "user_id");

-- CreateIndex
CREATE INDEX "trips_group_trip_id_idx" ON "trips"("group_trip_id");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_group_trip_id_fkey" FOREIGN KEY ("group_trip_id") REFERENCES "group_trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_trips" ADD CONSTRAINT "group_trips_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_trips" ADD CONSTRAINT "group_trips_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_trip_groups" ADD CONSTRAINT "group_trip_groups_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "group_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_trip_groups" ADD CONSTRAINT "group_trip_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_trip_members" ADD CONSTRAINT "group_trip_members_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "group_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_trip_members" ADD CONSTRAINT "group_trip_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_trip_members" ADD CONSTRAINT "group_trip_members_personal_trip_id_fkey" FOREIGN KEY ("personal_trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
