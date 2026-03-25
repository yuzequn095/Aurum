-- CreateEnum
CREATE TYPE "AIConversationMessageRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "AIConversationRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceSnapshotId" TEXT,
    "sourceReportId" TEXT,
    "sourceFinancialHealthScoreId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversationMessageRecord" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "role" "AIConversationMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversationMessageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIConversationRecord_userId_updatedAt_idx" ON "AIConversationRecord"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AIConversationRecord_sourceSnapshotId_idx" ON "AIConversationRecord"("sourceSnapshotId");

-- CreateIndex
CREATE INDEX "AIConversationRecord_sourceReportId_idx" ON "AIConversationRecord"("sourceReportId");

-- CreateIndex
CREATE INDEX "AIConversationRecord_sourceFinancialHealthScoreId_idx" ON "AIConversationRecord"("sourceFinancialHealthScoreId");

-- CreateIndex
CREATE INDEX "AIConversationMessageRecord_conversationId_createdAt_idx" ON "AIConversationMessageRecord"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIConversationMessageRecord_conversationId_sortOrder_key" ON "AIConversationMessageRecord"("conversationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "AIConversationRecord" ADD CONSTRAINT "AIConversationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversationRecord" ADD CONSTRAINT "AIConversationRecord_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "PortfolioSnapshotRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversationRecord" ADD CONSTRAINT "AIConversationRecord_sourceReportId_fkey" FOREIGN KEY ("sourceReportId") REFERENCES "AIReportRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversationRecord" ADD CONSTRAINT "AIConversationRecord_sourceFinancialHealthScoreId_fkey" FOREIGN KEY ("sourceFinancialHealthScoreId") REFERENCES "FinancialHealthScoreRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversationMessageRecord" ADD CONSTRAINT "AIConversationMessageRecord_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
