-- AlterEnum
ALTER TYPE "XpSource" ADD VALUE 'path_chest';

-- CreateTable
CREATE TABLE "path_months" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "level" INTEGER NOT NULL,
    "chest_opened_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "path_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_nodes" (
    "id" UUID NOT NULL,
    "path_month_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "place_id" UUID NOT NULL,
    "visited_at" TIMESTAMPTZ(3),

    CONSTRAINT "path_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_forecasts" (
    "key" VARCHAR(50) NOT NULL,
    "daily" JSONB NOT NULL,
    "fetched_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "point_forecasts_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "path_months_user_id_month_key" ON "path_months"("user_id", "month");

-- CreateIndex
CREATE INDEX "path_nodes_place_id_idx" ON "path_nodes"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "path_nodes_path_month_id_position_key" ON "path_nodes"("path_month_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "path_nodes_path_month_id_place_id_key" ON "path_nodes"("path_month_id", "place_id");

-- AddForeignKey
ALTER TABLE "path_months" ADD CONSTRAINT "path_months_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_nodes" ADD CONSTRAINT "path_nodes_path_month_id_fkey" FOREIGN KEY ("path_month_id") REFERENCES "path_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_nodes" ADD CONSTRAINT "path_nodes_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariants
ALTER TABLE "path_months" ADD CONSTRAINT "path_months_month_format" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
ALTER TABLE "path_months" ADD CONSTRAINT "path_months_level_range" CHECK ("level" BETWEEN 1 AND 7);
ALTER TABLE "path_nodes" ADD CONSTRAINT "path_nodes_position_positive" CHECK ("position" >= 1);
