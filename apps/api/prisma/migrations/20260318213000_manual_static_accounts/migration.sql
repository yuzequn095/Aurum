-- AlterTable
ALTER TABLE "ConnectedSourceAccountRecord"
ADD COLUMN "assetType" "PortfolioAssetCategoryType",
ADD COLUMN "assetSubType" TEXT,
ADD COLUMN "institutionOrIssuer" TEXT;

-- CreateTable
CREATE TABLE "ManualStaticValuationRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceAccountId" TEXT NOT NULL,
    "valuationDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "marketValue" DECIMAL(65,30) NOT NULL,
    "quantity" DECIMAL(65,30),
    "unitPrice" DECIMAL(65,30),
    "symbol" TEXT,
    "assetName" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualStaticValuationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualStaticValuationRecord_userId_createdAt_idx" ON "ManualStaticValuationRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ManualStaticValuationRecord_sourceId_valuationDate_idx" ON "ManualStaticValuationRecord"("sourceId", "valuationDate");

-- CreateIndex
CREATE INDEX "ManualStaticValuationRecord_sourceAccountId_valuationDate_createdAt_idx" ON "ManualStaticValuationRecord"("sourceAccountId", "valuationDate", "createdAt");

-- AddForeignKey
ALTER TABLE "ManualStaticValuationRecord" ADD CONSTRAINT "ManualStaticValuationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualStaticValuationRecord" ADD CONSTRAINT "ManualStaticValuationRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ConnectedSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualStaticValuationRecord" ADD CONSTRAINT "ManualStaticValuationRecord_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "ConnectedSourceAccountRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
