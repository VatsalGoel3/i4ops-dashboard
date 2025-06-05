-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "pipelineStage" TEXT NOT NULL DEFAULT 'unassigned',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "VM" ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "pipelineStage" TEXT NOT NULL DEFAULT 'unassigned',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
