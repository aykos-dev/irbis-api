-- CreateTable
CREATE TABLE "lesson_completions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ(3) NOT NULL,
    "wrong_count" INTEGER NOT NULL,
    "perfect" BOOLEAN NOT NULL,
    "xp" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_completions_user_id_completed_at_idx" ON "lesson_completions"("user_id", "completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_completions_user_id_lesson_id_key" ON "lesson_completions"("user_id", "lesson_id");

-- AddForeignKey
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Invariants
ALTER TABLE "lesson_completions"
  ADD CONSTRAINT "lesson_completions_wrong_count_check" CHECK ("wrong_count" >= 0),
  ADD CONSTRAINT "lesson_completions_xp_check" CHECK ("xp" >= 0);
