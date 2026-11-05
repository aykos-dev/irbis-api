-- AlterEnum
ALTER TYPE "admin_action" ADD VALUE 'cancel_group_trip';

-- AlterTable
ALTER TABLE "group_messages" ADD COLUMN     "group_trip_id" UUID;

-- CreateIndex
CREATE INDEX "group_messages_group_trip_id_idx" ON "group_messages"("group_trip_id");

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_trip_id_fkey" FOREIGN KEY ("group_trip_id") REFERENCES "group_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A trip card is either seeded (trip_data) or live (group_trip_id).
ALTER TABLE "group_messages" DROP CONSTRAINT "group_messages_kind_check";
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_kind_check" CHECK (
  ("kind" = 'text' AND "trip_data" IS NULL AND "group_trip_id" IS NULL)
  OR ("kind" = 'trip' AND "body" IS NULL AND ("trip_data" IS NOT NULL OR "group_trip_id" IS NOT NULL))
);
