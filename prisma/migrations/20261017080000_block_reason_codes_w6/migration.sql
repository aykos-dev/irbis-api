-- Block reason categories now match the admin block dialog (W6). Postgres cannot drop enum
-- values, so swap the type and map the old categories onto the new ones.
ALTER TYPE "block_reason_code" RENAME TO "block_reason_code_old";
CREATE TYPE "block_reason_code" AS ENUM ('spam', 'harassment', 'unsafe', 'fake_content', 'other');

ALTER TABLE "users" ALTER COLUMN "block_reason_code" TYPE "block_reason_code"
  USING (CASE "block_reason_code"::text
    WHEN 'abuse' THEN 'harassment'
    WHEN 'safety' THEN 'unsafe'
    WHEN 'impersonation' THEN 'fake_content'
    ELSE "block_reason_code"::text END)::"block_reason_code";

ALTER TABLE "admin_audit_logs" ALTER COLUMN "reason_code" TYPE "block_reason_code"
  USING (CASE "reason_code"::text
    WHEN 'abuse' THEN 'harassment'
    WHEN 'safety' THEN 'unsafe'
    WHEN 'impersonation' THEN 'fake_content'
    ELSE "reason_code"::text END)::"block_reason_code";

DROP TYPE "block_reason_code_old";
