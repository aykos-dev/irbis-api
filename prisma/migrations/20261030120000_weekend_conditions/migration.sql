-- CreateTable
CREATE TABLE "weekend_conditions" (
    "place_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "ConditionStatus" NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekend_conditions_pkey" PRIMARY KEY ("place_id","date")
);

-- AddForeignKey
ALTER TABLE "weekend_conditions" ADD CONSTRAINT "weekend_conditions_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
