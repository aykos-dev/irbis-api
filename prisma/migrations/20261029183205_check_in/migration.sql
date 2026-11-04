-- CreateTable
CREATE TABLE "check_ins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy_m" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL,
    "month" CHAR(7) NOT NULL,
    "counted" BOOLEAN NOT NULL,
    "xp_awarded" INTEGER NOT NULL DEFAULT 0,
    "path_visited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "check_ins_user_id_place_id_month_idx" ON "check_ins"("user_id", "place_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_user_id_client_id_key" ON "check_ins"("user_id", "client_id");

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Invariants
-- One counted check-in per user, place and Tashkent month; later ones are stored as not counted.
CREATE UNIQUE INDEX "check_ins_counted_user_place_month_key" ON "check_ins"("user_id", "place_id", "month") WHERE "counted";
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_xp_non_negative" CHECK ("xp_awarded" >= 0);
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_accuracy_non_negative" CHECK ("accuracy_m" >= 0);
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_month_format" CHECK ("month" ~ '^[0-9]{4}-[0-9]{2}$');
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_not_counted_no_xp" CHECK ("counted" OR "xp_awarded" = 0);

-- Default check-in config (also upserted by the seed): place detail reads radiusMByType.
INSERT INTO "game_config" ("key", "value", "updated_at") VALUES
  ('checkIn.config', '{"xpByDifficulty":[40,60,80,100,120],"radiusMByType":{"peak":300,"waterfall":300,"cave":200,"lake":1000,"canyon":1000,"camping":1000,"trail":1000},"maxAccuracyM":50,"maxAgeHours":72,"demoPerIpPerDay":5}', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
