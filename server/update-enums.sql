-- Update PipelineStage enum values to lowercase
-- First, add the new lowercase values to the enum
ALTER TYPE "PipelineStage" ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE "PipelineStage" ADD VALUE IF NOT EXISTS 'installing';
ALTER TYPE "PipelineStage" ADD VALUE IF NOT EXISTS 'broken';
ALTER TYPE "PipelineStage" ADD VALUE IF NOT EXISTS 'reserved';
ALTER TYPE "PipelineStage" ADD VALUE IF NOT EXISTS 'unassigned';

-- Update existing data to use new lowercase values
UPDATE "Host" SET "pipelineStage" = 'active' WHERE "pipelineStage" = 'Active';
UPDATE "Host" SET "pipelineStage" = 'installing' WHERE "pipelineStage" = 'Installing';
UPDATE "Host" SET "pipelineStage" = 'broken' WHERE "pipelineStage" = 'Broken';
UPDATE "Host" SET "pipelineStage" = 'reserved' WHERE "pipelineStage" = 'Reserved';
UPDATE "Host" SET "pipelineStage" = 'unassigned' WHERE "pipelineStage" = 'Unassigned';

-- Note: We cannot remove the old enum values yet as PostgreSQL doesn't support it directly
-- But the new schema will only use the lowercase values 