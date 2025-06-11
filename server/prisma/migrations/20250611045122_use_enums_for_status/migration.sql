/*
  Warnings:

  - The `status` column on the `Host` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `pipelineStage` column on the `Host` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `VM` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `pipelineStage` column on the `VM` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "HostStatus" AS ENUM ('up', 'down');

-- CreateEnum
CREATE TYPE "VMStatus" AS ENUM ('running', 'stopped', 'offline');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('unassigned', 'installing', 'working', 'broken');

-- AlterTable
ALTER TABLE "Host" DROP COLUMN "status",
ADD COLUMN     "status" "HostStatus" NOT NULL DEFAULT 'up',
DROP COLUMN "pipelineStage",
ADD COLUMN     "pipelineStage" "PipelineStage" NOT NULL DEFAULT 'unassigned';

-- AlterTable
ALTER TABLE "VM" DROP COLUMN "status",
ADD COLUMN     "status" "VMStatus" NOT NULL DEFAULT 'stopped',
DROP COLUMN "pipelineStage",
ADD COLUMN     "pipelineStage" "PipelineStage" NOT NULL DEFAULT 'unassigned';
