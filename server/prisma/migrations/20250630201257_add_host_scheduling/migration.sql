/*
  Warnings:

  - The values [Active,Broken,Installing,Reserved,Unassigned] on the enum `PipelineStage` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PipelineStage_new" AS ENUM ('active', 'installing', 'broken', 'reserved', 'unassigned');
ALTER TABLE "Host" ALTER COLUMN "pipelineStage" DROP DEFAULT;
ALTER TABLE "Host" ALTER COLUMN "pipelineStage" TYPE "PipelineStage_new" USING ("pipelineStage"::text::"PipelineStage_new");
ALTER TYPE "PipelineStage" RENAME TO "PipelineStage_old";
ALTER TYPE "PipelineStage_new" RENAME TO "PipelineStage";
DROP TYPE "PipelineStage_old";
ALTER TABLE "Host" ALTER COLUMN "pipelineStage" SET DEFAULT 'unassigned';
COMMIT;

-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedUntil" TIMESTAMP(3),
ALTER COLUMN "pipelineStage" SET DEFAULT 'unassigned';
