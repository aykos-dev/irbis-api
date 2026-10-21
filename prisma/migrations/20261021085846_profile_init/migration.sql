-- CreateEnum
CREATE TYPE "home_region" AS ENUM ('tashkent_city', 'tashkent_region', 'andijan', 'bukhara', 'fergana', 'jizzakh', 'karakalpakstan', 'khorezm', 'namangan', 'navoiy', 'kashkadarya', 'samarkand', 'syrdarya', 'surkhandarya', 'other');

-- CreateEnum
CREATE TYPE "units" AS ENUM ('metric', 'imperial');

-- CreateEnum
CREATE TYPE "appearance" AS ENUM ('light', 'dark', 'auto');

-- CreateEnum
CREATE TYPE "notification_category" AS ENUM ('trips', 'social', 'rewards');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "appearance" "appearance" NOT NULL DEFAULT 'auto',
ADD COLUMN     "avatar_key" VARCHAR(255),
ADD COLUMN     "bio" VARCHAR(150),
ADD COLUMN     "daily_game_time" VARCHAR(5) NOT NULL DEFAULT '19:00',
ADD COLUMN     "deleted_at" TIMESTAMPTZ(3),
ADD COLUMN     "display_name" VARCHAR(40),
ADD COLUMN     "find_buddies" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "home_region" "home_region",
ADD COLUMN     "notify_daily_game" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_groups" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_offers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notify_social" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_streak" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "public_profile" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_home_region" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_stats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "units" "units" NOT NULL DEFAULT 'metric';

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "notification_category" NOT NULL,
    "kind" VARCHAR(50) NOT NULL,
    "title" JSONB NOT NULL,
    "body" JSONB,
    "data" JSONB,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_id_idx" ON "notifications"("user_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
