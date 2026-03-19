-- CreateEnum
CREATE TYPE "ConnectedSourceKind" AS ENUM ('MANUAL_STATIC', 'BANK', 'BROKERAGE', 'CRYPTO');

-- CreateEnum
CREATE TYPE "ConnectedSourceStatus" AS ENUM ('ACTIVE', 'NEEDS_ATTENTION', 'DISCONNECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConnectedSyncTriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'WEBHOOK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConnectedSyncStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL_SUCCESS');

-- CreateEnum
CREATE TYPE "PortfolioSnapshotIngestionMode" AS ENUM ('MANUAL_STATIC', 'CSV_IMPORT', 'CONNECTED_SYNC');

-- Historical compatibility owner for Milestone 11 public snapshot flows.
INSERT INTO "User" ("id", "createdAt", "updatedAt")
VALUES ('legacy_snapshot_owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- CreateTable
CREATE TABLE "ConnectedSourceRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ConnectedSourceKind" NOT NULL,
    "providerKey" TEXT,
    "displayName" TEXT NOT NULL,
    "status" "ConnectedSourceStatus" NOT NULL,
    "institutionName" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "metadata" JSONB,
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedSourceAccountRecord" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "displayName" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "maskLast4" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedSourceAccountRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedSyncRunRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "triggerType" "ConnectedSyncTriggerType" NOT NULL,
    "status" "ConnectedSyncStatus" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "normalizationVersion" TEXT,
    "rawPayloadRef" TEXT,
    "producedSnapshotId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedSyncRunRecord_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PortfolioSnapshotRecord"
ADD COLUMN "userId" TEXT,
ADD COLUMN "sourceId" TEXT,
ADD COLUMN "sourceSyncRunId" TEXT,
ADD COLUMN "ingestionMode" "PortfolioSnapshotIngestionMode",
ADD COLUMN "normalizationVersion" TEXT,
ADD COLUMN "sourceFingerprint" TEXT;

-- AlterTable
ALTER TABLE "PortfolioPositionRecord"
ADD COLUMN "assetKey" TEXT;

UPDATE "PortfolioSnapshotRecord"
SET "userId" = 'legacy_snapshot_owner'
WHERE "userId" IS NULL;

UPDATE "PortfolioSnapshotRecord"
SET "ingestionMode" = CASE
    WHEN "sourceType" = 'MANUAL' THEN 'MANUAL_STATIC'::"PortfolioSnapshotIngestionMode"
    WHEN "sourceType" = 'CSV_IMPORT' THEN 'CSV_IMPORT'::"PortfolioSnapshotIngestionMode"
    WHEN "sourceType" = 'BROKER_SYNC' THEN 'CONNECTED_SYNC'::"PortfolioSnapshotIngestionMode"
    ELSE NULL
END
WHERE "ingestionMode" IS NULL;

UPDATE "PortfolioPositionRecord"
SET "assetKey" = CASE
    WHEN COALESCE(BTRIM("symbol"), '') <> '' THEN 'symbol:' || UPPER(BTRIM("symbol"))
    WHEN COALESCE(BTRIM("name"), '') <> '' THEN 'name:' || LOWER(REGEXP_REPLACE(BTRIM("name"), '\s+', '_', 'g'))
    ELSE 'position:' || "id"
END
WHERE "assetKey" IS NULL;

-- AlterTable
ALTER TABLE "PortfolioSnapshotRecord"
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PortfolioPositionRecord"
ALTER COLUMN "assetKey" SET NOT NULL,
ALTER COLUMN "symbol" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ConnectedSourceRecord_userId_createdAt_idx" ON "ConnectedSourceRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ConnectedSourceRecord_userId_kind_idx" ON "ConnectedSourceRecord"("userId", "kind");

-- CreateIndex
CREATE INDEX "ConnectedSourceRecord_userId_status_idx" ON "ConnectedSourceRecord"("userId", "status");

-- CreateIndex
CREATE INDEX "ConnectedSourceAccountRecord_sourceId_isActive_idx" ON "ConnectedSourceAccountRecord"("sourceId", "isActive");

-- CreateIndex
CREATE INDEX "ConnectedSourceAccountRecord_sourceId_createdAt_idx" ON "ConnectedSourceAccountRecord"("sourceId", "createdAt");

-- CreateIndex
CREATE INDEX "ConnectedSyncRunRecord_userId_createdAt_idx" ON "ConnectedSyncRunRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ConnectedSyncRunRecord_sourceId_createdAt_idx" ON "ConnectedSyncRunRecord"("sourceId", "createdAt");

-- CreateIndex
CREATE INDEX "ConnectedSyncRunRecord_sourceId_status_idx" ON "ConnectedSyncRunRecord"("sourceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedSyncRunRecord_producedSnapshotId_key" ON "ConnectedSyncRunRecord"("producedSnapshotId");

-- CreateIndex
CREATE INDEX "PortfolioSnapshotRecord_userId_snapshotDate_idx" ON "PortfolioSnapshotRecord"("userId", "snapshotDate");

-- CreateIndex
CREATE INDEX "PortfolioSnapshotRecord_sourceId_idx" ON "PortfolioSnapshotRecord"("sourceId");

-- CreateIndex
CREATE INDEX "PortfolioSnapshotRecord_sourceSyncRunId_idx" ON "PortfolioSnapshotRecord"("sourceSyncRunId");

-- CreateIndex
CREATE INDEX "PortfolioPositionRecord_assetKey_idx" ON "PortfolioPositionRecord"("assetKey");

-- AddForeignKey
ALTER TABLE "ConnectedSourceRecord" ADD CONSTRAINT "ConnectedSourceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedSourceAccountRecord" ADD CONSTRAINT "ConnectedSourceAccountRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ConnectedSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedSyncRunRecord" ADD CONSTRAINT "ConnectedSyncRunRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedSyncRunRecord" ADD CONSTRAINT "ConnectedSyncRunRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ConnectedSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedSyncRunRecord" ADD CONSTRAINT "ConnectedSyncRunRecord_producedSnapshotId_fkey" FOREIGN KEY ("producedSnapshotId") REFERENCES "PortfolioSnapshotRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSnapshotRecord" ADD CONSTRAINT "PortfolioSnapshotRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSnapshotRecord" ADD CONSTRAINT "PortfolioSnapshotRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ConnectedSourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSnapshotRecord" ADD CONSTRAINT "PortfolioSnapshotRecord_sourceSyncRunId_fkey" FOREIGN KEY ("sourceSyncRunId") REFERENCES "ConnectedSyncRunRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
