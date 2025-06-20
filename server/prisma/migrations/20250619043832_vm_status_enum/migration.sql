/*
  Warnings:

  - The values [up,down] on the enum `VMStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VMStatus_new" AS ENUM ('running', 'stopped', 'offline');
ALTER TABLE "VM" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "VM" ALTER COLUMN "status" TYPE "VMStatus_new" USING ("status"::text::"VMStatus_new");
ALTER TYPE "VMStatus" RENAME TO "VMStatus_old";
ALTER TYPE "VMStatus_new" RENAME TO "VMStatus";
DROP TYPE "VMStatus_old";
ALTER TABLE "VM" ALTER COLUMN "status" SET DEFAULT 'offline';
COMMIT;

-- AlterTable
ALTER TABLE "VM" ALTER COLUMN "status" SET DEFAULT 'offline';
