/*
  Warnings:

  - The values [running,stopped,offline] on the enum `VMStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `assignedTo` on the `VM` table. All the data in the column will be lost.
  - You are about to drop the column `networkIp` on the `VM` table. All the data in the column will be lost.
  - You are about to drop the column `networkMac` on the `VM` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `VM` table. All the data in the column will be lost.
  - You are about to drop the column `pipelineStage` on the `VM` table. All the data in the column will be lost.
  - You are about to drop the column `xml` on the `VM` table. All the data in the column will be lost.
  - Added the required column `ip` to the `VM` table without a default value. This is not possible if the table is not empty.
  - Made the column `machineId` on table `VM` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VMStatus_new" AS ENUM ('up', 'down');
ALTER TABLE "VM" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "VM" ALTER COLUMN "status" TYPE "VMStatus_new" USING ("status"::text::"VMStatus_new");
ALTER TYPE "VMStatus" RENAME TO "VMStatus_old";
ALTER TYPE "VMStatus_new" RENAME TO "VMStatus";
DROP TYPE "VMStatus_old";
ALTER TABLE "VM" ALTER COLUMN "status" SET DEFAULT 'down';
COMMIT;

-- AlterTable
ALTER TABLE "VM" DROP COLUMN "assignedTo",
DROP COLUMN "networkIp",
DROP COLUMN "networkMac",
DROP COLUMN "notes",
DROP COLUMN "pipelineStage",
DROP COLUMN "xml",
ADD COLUMN     "ip" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'down',
ALTER COLUMN "machineId" SET NOT NULL;
