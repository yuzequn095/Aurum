-- CreateTable
CREATE TABLE "AIReportRecord" (
    "id" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "sourceSnapshotId" TEXT,
    "title" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIReportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIReportRecord_createdAt_idx" ON "AIReportRecord"("createdAt");

-- CreateIndex
CREATE INDEX "AIReportRecord_sourceRunId_idx" ON "AIReportRecord"("sourceRunId");

-- CreateIndex
CREATE INDEX "AIReportRecord_sourceSnapshotId_idx" ON "AIReportRecord"("sourceSnapshotId");

-- AddForeignKey
ALTER TABLE "AIReportRecord" ADD CONSTRAINT "AIReportRecord_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "PortfolioSnapshotRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
