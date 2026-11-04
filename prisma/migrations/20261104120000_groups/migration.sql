CREATE TYPE "group_visibility" AS ENUM ('public', 'private');
CREATE TYPE "group_member_role" AS ENUM ('owner', 'admin', 'member');
CREATE TYPE "group_member_status" AS ENUM ('invited', 'pending', 'active');

CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "visibility" "group_visibility" NOT NULL,
    "avatar_key" VARCHAR(255),
    "color" VARCHAR(7) NOT NULL DEFAULT '#0C807A',
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "groups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "groups_color_check" CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE "group_members" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "group_member_role" NOT NULL DEFAULT 'member',
    "status" "group_member_status" NOT NULL DEFAULT 'active',
    "invited_by_id" UUID,
    "last_read_at" TIMESTAMPTZ(3),
    "notifications_muted" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "groups_slug_key" ON "groups"("slug");
CREATE INDEX "groups_visibility_created_at_id_idx" ON "groups"("visibility", "created_at", "id");
CREATE INDEX "groups_created_by_id_idx" ON "groups"("created_by_id");
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");
CREATE UNIQUE INDEX "group_members_one_owner_per_group" ON "group_members"("group_id") WHERE "role" = 'owner' AND "status" = 'active';
CREATE INDEX "group_members_user_id_status_updated_at_idx" ON "group_members"("user_id", "status", "updated_at");
CREATE INDEX "group_members_group_id_status_role_idx" ON "group_members"("group_id", "status", "role");

ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
