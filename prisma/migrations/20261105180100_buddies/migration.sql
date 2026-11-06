-- CreateEnum
CREATE TYPE "buddy_link_status" AS ENUM ('pending', 'accepted');

-- CreateTable
CREATE TABLE "buddy_links" (
    "id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "addressee_id" UUID NOT NULL,
    "status" "buddy_link_status" NOT NULL,
    "pair_key" VARCHAR(73) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "buddy_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buddy_availability" (
    "user_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "sat" BOOLEAN NOT NULL DEFAULT false,
    "sun" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "buddy_availability_pkey" PRIMARY KEY ("user_id","week_start")
);

-- CreateTable
CREATE TABLE "trip_ratings" (
    "id" UUID NOT NULL,
    "group_trip_id" UUID NOT NULL,
    "rater_id" UUID NOT NULL,
    "ratee_id" UUID NOT NULL,
    "reliable" INTEGER NOT NULL,
    "safety" INTEGER NOT NULL,
    "company" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trip_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buddy_links_pair_key_key" ON "buddy_links"("pair_key");

-- CreateIndex
CREATE INDEX "buddy_links_addressee_id_status_idx" ON "buddy_links"("addressee_id", "status");

-- CreateIndex
CREATE INDEX "buddy_links_requester_id_status_idx" ON "buddy_links"("requester_id", "status");

-- CreateIndex
CREATE INDEX "trip_ratings_ratee_id_idx" ON "trip_ratings"("ratee_id");

-- CreateIndex
CREATE INDEX "trip_ratings_rater_id_idx" ON "trip_ratings"("rater_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_ratings_group_trip_id_rater_id_ratee_id_key" ON "trip_ratings"("group_trip_id", "rater_id", "ratee_id");

-- AddForeignKey
ALTER TABLE "buddy_links" ADD CONSTRAINT "buddy_links_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buddy_links" ADD CONSTRAINT "buddy_links_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buddy_availability" ADD CONSTRAINT "buddy_availability_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_ratings" ADD CONSTRAINT "trip_ratings_group_trip_id_fkey" FOREIGN KEY ("group_trip_id") REFERENCES "group_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_ratings" ADD CONSTRAINT "trip_ratings_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_ratings" ADD CONSTRAINT "trip_ratings_ratee_id_fkey" FOREIGN KEY ("ratee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Invariants Prisma cannot express.
ALTER TABLE "trip_ratings" ADD CONSTRAINT "trip_ratings_scores_check" CHECK ("reliable" BETWEEN 1 AND 5 AND "safety" BETWEEN 1 AND 5 AND "company" BETWEEN 1 AND 5);
ALTER TABLE "trip_ratings" ADD CONSTRAINT "trip_ratings_not_self_check" CHECK ("rater_id" <> "ratee_id");
ALTER TABLE "buddy_links" ADD CONSTRAINT "buddy_links_not_self_check" CHECK ("requester_id" <> "addressee_id");
