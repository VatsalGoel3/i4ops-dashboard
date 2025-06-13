/*
  Warnings:

  - The values [unassigned,installing,working,broken] on the enum `PipelineStage` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PipelineStage_new" AS ENUM ('Active', 'Broken', 'Installing', 'Reserved', 'Unassigned');
ALTER TABLE "VM" ALTER COLUMN "pipelineStage" DROP DEFAULT;
ALTER TABLE "Host" ALTER COLUMN "pipelineStage" DROP DEFAULT;
ALTER TABLE "Host" ALTER COLUMN "pipelineStage" TYPE "PipelineStage_new" USING ("pipelineStage"::text::"PipelineStage_new");
ALTER TABLE "VM" ALTER COLUMN "pipelineStage" TYPE "PipelineStage_new" USING ("pipelineStage"::text::"PipelineStage_new");
ALTER TYPE "PipelineStage" RENAME TO "PipelineStage_old";
ALTER TYPE "PipelineStage_new" RENAME TO "PipelineStage";
DROP TYPE "PipelineStage_old";
ALTER TABLE "VM" ALTER COLUMN "pipelineStage" SET DEFAULT 'Unassigned';
ALTER TABLE "Host" ALTER COLUMN "pipelineStage" SET DEFAULT 'Unassigned';
COMMIT;

-- AlterTable
ALTER TABLE "Host" ALTER COLUMN "pipelineStage" SET DEFAULT 'Unassigned';

-- AlterTable
ALTER TABLE "VM" ALTER COLUMN "pipelineStage" SET DEFAULT 'Unassigned';
