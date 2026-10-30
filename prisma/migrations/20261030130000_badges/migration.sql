-- CreateTable
CREATE TABLE "badge_awards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "earned_at" TIMESTAMPTZ(3) NOT NULL,
    "showcase_order" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "badge_awards_user_id_key_key" ON "badge_awards"("user_id", "key");

-- CreateIndex
CREATE INDEX "badge_awards_user_id_earned_at_idx" ON "badge_awards"("user_id", "earned_at");

-- AddForeignKey
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Invariants
-- One badge per user; the showcase has at most four slots, each used once.
CREATE UNIQUE INDEX "badge_awards_showcase_order_key" ON "badge_awards"("user_id", "showcase_order") WHERE "showcase_order" IS NOT NULL;
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_showcase_order_check" CHECK ("showcase_order" IS NULL OR "showcase_order" BETWEEN 1 AND 4);
