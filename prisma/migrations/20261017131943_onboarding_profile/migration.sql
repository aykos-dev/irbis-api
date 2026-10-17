-- CreateEnum
CREATE TYPE "experience" AS ENUM ('beginner', 'weekend', 'experienced');

-- CreateEnum
CREATE TYPE "interest" AS ENUM ('peaks', 'caves', 'lakes', 'camping', 'trails');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "experience" "experience",
ADD COLUMN     "interests" "interest"[] DEFAULT ARRAY[]::"interest"[];
