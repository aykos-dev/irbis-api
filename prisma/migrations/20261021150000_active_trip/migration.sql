-- CreateEnum
CREATE TYPE "trip_sos_status" AS ENUM ('sent', 'failed');

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "climb_m" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "distance_m" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_accuracy_m" DOUBLE PRECISION,
ADD COLUMN     "last_lat" DOUBLE PRECISION,
ADD COLUMN     "last_lng" DOUBLE PRECISION,
ADD COLUMN     "last_location_at" TIMESTAMPTZ(3),
ADD COLUMN     "live_token" CHAR(22);

-- CreateTable
CREATE TABLE "trip_waypoints" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "n" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy_m" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL,
    "xp_awarded" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_waypoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_sos" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "sent_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "trip_sos_status" NOT NULL,

    CONSTRAINT "trip_sos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_waypoints_trip_id_n_key" ON "trip_waypoints"("trip_id", "n");

-- CreateIndex
CREATE INDEX "trip_sos_trip_id_sent_at_idx" ON "trip_sos"("trip_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "trips_live_token_key" ON "trips"("live_token");

-- AddForeignKey
ALTER TABLE "trip_waypoints" ADD CONSTRAINT "trip_waypoints_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_sos" ADD CONSTRAINT "trip_sos_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Invariants
ALTER TABLE "trips" ADD CONSTRAINT "trips_distance_m_non_negative" CHECK ("distance_m" >= 0);
ALTER TABLE "trips" ADD CONSTRAINT "trips_climb_m_non_negative" CHECK ("climb_m" >= 0);
ALTER TABLE "trip_waypoints" ADD CONSTRAINT "trip_waypoints_n_positive" CHECK ("n" >= 1);
ALTER TABLE "trip_waypoints" ADD CONSTRAINT "trip_waypoints_xp_non_negative" CHECK ("xp_awarded" >= 0);
