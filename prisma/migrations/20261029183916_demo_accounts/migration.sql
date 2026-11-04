-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_demo" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "demo_creations" (
    "id" UUID NOT NULL,
    "ip_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_creations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demo_creations_ip_hash_created_at_idx" ON "demo_creations"("ip_hash", "created_at");

-- Only a demo account may be without a password (ADR-006).
ALTER TABLE "users" ADD CONSTRAINT "users_password_unless_demo" CHECK ("is_demo" OR "password_hash" IS NOT NULL);
