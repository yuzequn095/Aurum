-- CreateTable
CREATE TABLE "FinancialHealthScoreRecord" (
    "id" TEXT NOT NULL,
    "sourceSnapshotId" TEXT NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "insight" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialHealthScoreRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialHealthScoreRecord_createdAt_idx" ON "FinancialHealthScoreRecord"("createdAt");

-- CreateIndex
CREATE INDEX "FinancialHealthScoreRecord_sourceSnapshotId_idx" ON "FinancialHealthScoreRecord"("sourceSnapshotId");

-- AddForeignKey
ALTER TABLE "FinancialHealthScoreRecord" ADD CONSTRAINT "FinancialHealthScoreRecord_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "PortfolioSnapshotRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
