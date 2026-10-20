-- CreateEnum
CREATE TYPE "lesson_status" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "lesson_tiers" (
    "id" UUID NOT NULL,
    "key" VARCHAR(20) NOT NULL,
    "title" JSONB NOT NULL,
    "colour" VARCHAR(7) NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lesson_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "tier_id" UUID NOT NULL,
    "title" JSONB NOT NULL,
    "icon" VARCHAR(20) NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "lesson_status" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_questions" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "prompt" JSONB NOT NULL,
    "hint" JSONB,
    "options" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "explanation" JSONB NOT NULL,
    "wrong_explanation" JSONB,
    "image_key" VARCHAR(200),

    CONSTRAINT "lesson_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_tiers_key_key" ON "lesson_tiers"("key");

-- CreateIndex
CREATE INDEX "lessons_tier_id_status_order_idx" ON "lessons"("tier_id", "status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_questions_lesson_id_order_key" ON "lesson_questions"("lesson_id", "order");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "lesson_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_questions" ADD CONSTRAINT "lesson_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariants
ALTER TABLE "lesson_tiers" ADD CONSTRAINT "lesson_tiers_key_format" CHECK ("key" ~ '^[a-z0-9-]{1,20}$');
ALTER TABLE "lesson_tiers" ADD CONSTRAINT "lesson_tiers_colour_format" CHECK ("colour" ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE "lesson_questions" ADD CONSTRAINT "lesson_questions_correct_index_min" CHECK ("correct_index" >= 0);
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_published_at_set" CHECK ("status" = 'draft' OR "published_at" IS NOT NULL);

-- Seed the 6 tiers (idempotent by key; never overwrites admin edits)
INSERT INTO "lesson_tiers" ("id", "key", "title", "colour", "order", "updated_at") VALUES
  (gen_random_uuid(), '1', '{"uz":"Yoʻl asoslari","ru":"Основы тропы","en":"Trail Basics"}', '#58CC02', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '2', '{"uz":"Togʻga tayyor","ru":"Готов к горам","en":"Mountain Ready"}', '#1CB0A8', 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '3', '{"uz":"Tizma koʻnikmalari","ru":"Навыки хребта","en":"Ridge Skills"}', '#FF9600', 3, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '4', '{"uz":"Qor va qoyalar","ru":"Снег и скалы","en":"Snow & Scrambles"}', '#1899D6', 4, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'first-aid', '{"uz":"Birinchi yordam","ru":"Первая помощь","en":"First aid"}', '#FF4B4B', 5, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '5', '{"uz":"Yetakchilik","ru":"Лидерство","en":"Leadership"}', '#8C5A33', 6, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
