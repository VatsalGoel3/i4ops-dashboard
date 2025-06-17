/*
  Warnings:

  - A unique constraint covering the columns `[machineId]` on the table `VM` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "VM" ADD COLUMN     "machineId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VM_machineId_key" ON "VM"("machineId");
