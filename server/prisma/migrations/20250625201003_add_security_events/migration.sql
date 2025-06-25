-- CreateEnum
CREATE TYPE "SecuritySeverity" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "SecurityRule" AS ENUM ('egress', 'brute_force', 'sudo', 'oom_kill', 'other');

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" SERIAL NOT NULL,
    "vmId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "SecuritySeverity" NOT NULL,
    "rule" "SecurityRule" NOT NULL,
    "ackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityEvent_vmId_idx" ON "SecurityEvent"("vmId");

-- CreateIndex
CREATE INDEX "SecurityEvent_timestamp_idx" ON "SecurityEvent"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");

-- CreateIndex
CREATE INDEX "SecurityEvent_ackAt_idx" ON "SecurityEvent"("ackAt");

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_vmId_fkey" FOREIGN KEY ("vmId") REFERENCES "VM"("id") ON DELETE CASCADE ON UPDATE CASCADE;
