-- CreateEnum
CREATE TYPE "PortfolioSnapshotSourceType" AS ENUM ('MANUAL', 'CSV_IMPORT', 'BROKER_SYNC', 'OTHER');

-- CreateEnum
CREATE TYPE "PortfolioAssetCategoryType" AS ENUM ('CASH', 'EQUITY', 'ETF', 'CRYPTO', 'FUND', 'OTHER');

-- CreateTable
CREATE TABLE "PortfolioSnapshotRecord" (
    "id" TEXT NOT NULL,
    "portfolioName" TEXT,
    "sourceType" "PortfolioSnapshotSourceType",
    "sourceLabel" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "valuationCurrency" TEXT,
    "totalValue" DECIMAL(65,30) NOT NULL,
    "cashValue" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioSnapshotRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioPositionRecord" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "quantity" DECIMAL(65,30),
    "marketValue" DECIMAL(65,30) NOT NULL,
    "portfolioWeight" DECIMAL(65,30),
    "costBasis" DECIMAL(65,30),
    "pnlPercent" DECIMAL(65,30),
    "category" "PortfolioAssetCategoryType",
    "sourceAccountId" TEXT,
    "notes" TEXT,

    CONSTRAINT "PortfolioPositionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioSnapshotRecord_snapshotDate_idx" ON "PortfolioSnapshotRecord"("snapshotDate");

-- CreateIndex
CREATE INDEX "PortfolioSnapshotRecord_createdAt_idx" ON "PortfolioSnapshotRecord"("createdAt");

-- CreateIndex
CREATE INDEX "PortfolioPositionRecord_snapshotId_idx" ON "PortfolioPositionRecord"("snapshotId");

-- CreateIndex
CREATE INDEX "PortfolioPositionRecord_symbol_idx" ON "PortfolioPositionRecord"("symbol");

-- AddForeignKey
ALTER TABLE "PortfolioPositionRecord" ADD CONSTRAINT "PortfolioPositionRecord_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PortfolioSnapshotRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
