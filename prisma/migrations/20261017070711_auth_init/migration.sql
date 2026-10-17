-- CreateEnum
CREATE TYPE "role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "locale" AS ENUM ('uz', 'ru', 'en');

-- CreateEnum
CREATE TYPE "block_reason_code" AS ENUM ('spam', 'abuse', 'impersonation', 'safety', 'other');

-- CreateEnum
CREATE TYPE "sms_purpose" AS ENUM ('password_reset', 'phone_verify');

-- CreateEnum
CREATE TYPE "admin_action" AS ENUM ('block', 'unblock', 'set_password', 'set_recovery_phone', 'change_role');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(20) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "recovery_phone" TEXT,
    "recovery_phone_verified_at" TIMESTAMPTZ(3),
    "locale" "locale" NOT NULL,
    "role" "role" NOT NULL DEFAULT 'user',
    "blocked_at" TIMESTAMPTZ(3),
    "block_reason_code" "block_reason_code",
    "terms_accepted_at" TIMESTAMPTZ(3),
    "last_active_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "sms_purpose" NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "ip" VARCHAR(64) NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" "admin_action" NOT NULL,
    "reason_code" "block_reason_code",
    "note" VARCHAR(500) NOT NULL,
    "detail" VARCHAR(200),
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_created_at_id_idx" ON "users"("created_at", "id");

-- CreateIndex
CREATE INDEX "users_last_active_at_id_idx" ON "users"("last_active_at", "id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_blocked_at_idx" ON "users"("blocked_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replaced_by_id_key" ON "refresh_tokens"("replaced_by_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "sms_codes_user_id_purpose_created_at_idx" ON "sms_codes"("user_id", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_username_at_idx" ON "login_attempts"("username", "at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_at_idx" ON "login_attempts"("ip", "at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_user_id_at_id_idx" ON "admin_audit_logs"("user_id", "at", "id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_codes" ADD CONSTRAINT "sms_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invariants Prisma cannot express.
-- Usernames: 3-20 chars of a-z 0-9 . _, not starting or ending with a dot, stored lowercase, unique case-insensitively.
ALTER TABLE "users" ADD CONSTRAINT "users_username_format_check"
  CHECK ("username" = lower("username") AND "username" ~ '^[a-z0-9_]([a-z0-9._]{1,18})[a-z0-9_]$');
CREATE UNIQUE INDEX "users_username_lower_key" ON "users" (lower("username"));

-- A recovery phone and its verification time exist together (a pending phone lives in sms_codes).
ALTER TABLE "users" ADD CONSTRAINT "users_recovery_phone_pair_check"
  CHECK (("recovery_phone" IS NULL) = ("recovery_phone_verified_at" IS NULL));

-- A block always carries its reason category.
ALTER TABLE "users" ADD CONSTRAINT "users_block_pair_check"
  CHECK (("blocked_at" IS NULL) = ("block_reason_code" IS NULL));

ALTER TABLE "sms_codes" ADD CONSTRAINT "sms_codes_attempts_check" CHECK ("attempts" >= 0);
