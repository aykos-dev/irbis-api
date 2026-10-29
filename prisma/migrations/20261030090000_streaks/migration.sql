-- CreateEnum
CREATE TYPE "StreakKind" AS ENUM ('flame', 'boot');

-- CreateTable
CREATE TABLE "activity_days" (
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "lessons" INTEGER NOT NULL DEFAULT 0,
    "check_ins" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "activity_days_pkey" PRIMARY KEY ("user_id","day")
);

-- CreateTable
CREATE TABLE "streak_states" (
    "user_id" UUID NOT NULL,
    "flame_count" INTEGER NOT NULL DEFAULT 0,
    "flame_last_day" DATE,
    "boot_count" INTEGER NOT NULL DEFAULT 0,
    "boot_last_week" DATE,
    "evaluated_through" DATE,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "streak_states_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "streak_freezes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "StreakKind" NOT NULL,
    "covers_date" DATE NOT NULL,
    "month" CHAR(7) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streak_freezes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "streak_freezes_user_id_month_idx" ON "streak_freezes"("user_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "streak_freezes_user_id_kind_covers_date_key" ON "streak_freezes"("user_id", "kind", "covers_date");

-- AddForeignKey
ALTER TABLE "activity_days" ADD CONSTRAINT "activity_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_states" ADD CONSTRAINT "streak_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_freezes" ADD CONSTRAINT "streak_freezes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Invariants
ALTER TABLE "activity_days" ADD CONSTRAINT "activity_days_counts_check" CHECK ("lessons" >= 0 AND "check_ins" >= 0);
ALTER TABLE "streak_states" ADD CONSTRAINT "streak_states_counts_check" CHECK ("flame_count" >= 0 AND "boot_count" >= 0);
ALTER TABLE "streak_states" ADD CONSTRAINT "streak_states_boot_monday_check" CHECK ("boot_last_week" IS NULL OR EXTRACT(ISODOW FROM "boot_last_week") = 1);
ALTER TABLE "streak_freezes" ADD CONSTRAINT "streak_freezes_month_check" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
