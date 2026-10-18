-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('lesson', 'check_in', 'waypoint', 'discoverer', 'top_shots', 'post', 'game', 'campfire', 'qa_grant');

-- CreateEnum
CREATE TYPE "LevelFactKind" AS ENUM ('lesson', 'check_in', 'verified_spot');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "level_reached_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "xp_total" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "game_config" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "game_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "xp_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" "XpSource" NOT NULL,
    "ref_id" VARCHAR(200) NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_facts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "LevelFactKind" NOT NULL,
    "ref_id" VARCHAR(200) NOT NULL,
    "tier" VARCHAR(50),
    "difficulty" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_ups" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "from_level" INTEGER NOT NULL,
    "to_level" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen_at" TIMESTAMPTZ(3),

    CONSTRAINT "level_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "xp_entries_user_id_source_created_at_idx" ON "xp_entries"("user_id", "source", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "xp_entries_user_id_source_ref_id_key" ON "xp_entries"("user_id", "source", "ref_id");

-- CreateIndex
CREATE INDEX "level_facts_user_id_kind_idx" ON "level_facts"("user_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "level_facts_user_id_kind_ref_id_key" ON "level_facts"("user_id", "kind", "ref_id");

-- CreateIndex
CREATE INDEX "level_ups_user_id_seen_at_idx" ON "level_ups"("user_id", "seen_at");

-- AddForeignKey
ALTER TABLE "xp_entries" ADD CONSTRAINT "xp_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_facts" ADD CONSTRAINT "level_facts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_ups" ADD CONSTRAINT "level_ups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
