CREATE TYPE "group_message_kind" AS ENUM ('text', 'trip');
CREATE TYPE "group_attachment_type" AS ENUM ('photo', 'place');

CREATE TABLE "group_messages" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "sender_id" UUID,
    "reply_to_id" UUID,
    "kind" "group_message_kind" NOT NULL DEFAULT 'text',
    "body" VARCHAR(2000),
    "trip_data" JSONB,
    "edited_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "group_messages_kind_check" CHECK (
      ("kind" = 'text' AND "trip_data" IS NULL)
      OR ("kind" = 'trip' AND "body" IS NULL AND "trip_data" IS NOT NULL)
    )
);

CREATE TABLE "group_message_attachments" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "type" "group_attachment_type" NOT NULL,
    "image_key" VARCHAR(255),
    "place_id" UUID,
    "order" INTEGER NOT NULL,
    CONSTRAINT "group_message_attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "group_message_attachments_value_check" CHECK (
      ("type" = 'photo' AND "image_key" IS NOT NULL AND "place_id" IS NULL)
      OR ("type" = 'place' AND "image_key" IS NULL AND "place_id" IS NOT NULL)
    ),
    CONSTRAINT "group_message_attachments_order_check" CHECK ("order" BETWEEN 0 AND 4)
);

CREATE TABLE "group_message_reactions" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_message_reactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "group_message_mentions" (
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    CONSTRAINT "group_message_mentions_pkey" PRIMARY KEY ("message_id", "user_id")
);

CREATE INDEX "group_messages_group_id_created_at_id_idx" ON "group_messages"("group_id", "created_at", "id");
CREATE INDEX "group_messages_sender_id_created_at_idx" ON "group_messages"("sender_id", "created_at");
CREATE INDEX "group_messages_reply_to_id_idx" ON "group_messages"("reply_to_id");
CREATE UNIQUE INDEX "group_message_attachments_message_id_order_key" ON "group_message_attachments"("message_id", "order");
CREATE INDEX "group_message_attachments_place_id_idx" ON "group_message_attachments"("place_id");
CREATE UNIQUE INDEX "group_message_reactions_message_id_user_id_emoji_key" ON "group_message_reactions"("message_id", "user_id", "emoji");
CREATE INDEX "group_message_reactions_message_id_created_at_idx" ON "group_message_reactions"("message_id", "created_at");
CREATE INDEX "group_message_mentions_user_id_message_id_idx" ON "group_message_mentions"("user_id", "message_id");

ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "group_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "group_message_attachments" ADD CONSTRAINT "group_message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "group_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_message_attachments" ADD CONSTRAINT "group_message_attachments_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_message_reactions" ADD CONSTRAINT "group_message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "group_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_message_reactions" ADD CONSTRAINT "group_message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_message_mentions" ADD CONSTRAINT "group_message_mentions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "group_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_message_mentions" ADD CONSTRAINT "group_message_mentions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
