-- CreateEnum
CREATE TYPE "AIDailyMarketBriefCadence" AS ENUM ('DAILY', 'WEEKDAYS', 'WEEKLY');

-- CreateEnum
CREATE TYPE "AIDailyMarketBriefScope" AS ENUM (
  'PORTFOLIO_AWARE',
  'MARKET_OVERVIEW'
);

-- CreateEnum
CREATE TYPE "AIDailyMarketBriefDeliveryChannel" AS ENUM (
  'IN_APP',
  'EMAIL_PLACEHOLDER'
);

-- CreateTable
CREATE TABLE "AIDailyMarketBriefPreferenceRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "cadence" "AIDailyMarketBriefCadence" NOT NULL DEFAULT 'DAILY',
  "deliveryTimeLocal" TEXT NOT NULL DEFAULT '08:00',
  "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  "reportScope" "AIDailyMarketBriefScope" NOT NULL DEFAULT 'PORTFOLIO_AWARE',
  "deliveryChannel" "AIDailyMarketBriefDeliveryChannel" NOT NULL DEFAULT 'IN_APP',
  "sourceSnapshotId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AIDailyMarketBriefPreferenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIDailyMarketBriefPreferenceRecord_userId_key"
ON "AIDailyMarketBriefPreferenceRecord"("userId");

-- CreateIndex
CREATE INDEX "AIDailyMarketBriefPreferenceRecord_sourceSnapshotId_idx"
ON "AIDailyMarketBriefPreferenceRecord"("sourceSnapshotId");

-- AddForeignKey
ALTER TABLE "AIDailyMarketBriefPreferenceRecord"
ADD CONSTRAINT "AIDailyMarketBriefPreferenceRecord_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDailyMarketBriefPreferenceRecord"
ADD CONSTRAINT "AIDailyMarketBriefPreferenceRecord_sourceSnapshotId_fkey"
FOREIGN KEY ("sourceSnapshotId") REFERENCES "PortfolioSnapshotRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
