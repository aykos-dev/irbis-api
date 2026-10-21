
-- CreateEnum
CREATE TYPE "trip_status" AS ENUM ('planned', 'active', 'checked_out', 'alerted');

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "user_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "relation" VARCHAR(30) NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_last2" CHAR(2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "status" "trip_status" NOT NULL,
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "back_by" TIMESTAMPTZ(3) NOT NULL,
    "alert_enabled" BOOLEAN NOT NULL,
    "contact_name" VARCHAR(60) NOT NULL,
    "contact_relation" VARCHAR(30) NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "contact_phone_last2" CHAR(2) NOT NULL,
    "started_at" TIMESTAMPTZ(3),
    "start_lat" DOUBLE PRECISION,
    "start_lng" DOUBLE PRECISION,
    "start_accuracy_m" DOUBLE PRECISION,
    "checked_out_at" TIMESTAMPTZ(3),
    "alert_sent_at" TIMESTAMPTZ(3),
    "alert_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trips_user_id_start_at_idx" ON "trips"("user_id", "start_at");

-- CreateIndex
CREATE INDEX "trips_status_back_by_idx" ON "trips"("status", "back_by");

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariants
ALTER TABLE "trips" ADD CONSTRAINT "trips_back_by_after_start" CHECK ("back_by" > "start_at");
ALTER TABLE "trips" ADD CONSTRAINT "trips_alert_attempts_non_negative" CHECK ("alert_attempts" >= 0);

-- One active trip per user
CREATE UNIQUE INDEX "trips_one_active_per_user" ON "trips"("user_id") WHERE "status" = 'active';
