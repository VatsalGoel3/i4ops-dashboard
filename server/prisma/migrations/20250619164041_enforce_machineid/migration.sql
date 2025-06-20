/*
  Warnings:

  - A unique constraint covering the columns `[machineId]` on the table `VM` will be added. If there are existing duplicate values, this will fail.
  - Made the column `machineId` on table `VM` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ip` on table `VM` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "VM_name_hostId_key";

-- AlterTable
ALTER TABLE "VM" ALTER COLUMN "machineId" SET NOT NULL,
ALTER COLUMN "ip" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "VM_machineId_key" ON "VM"("machineId");
