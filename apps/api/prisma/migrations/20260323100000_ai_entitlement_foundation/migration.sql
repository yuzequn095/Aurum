-- CreateEnum
CREATE TYPE "AIEntitlementStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AIEntitlementFeatureKey" AS ENUM (
  'AI_QUICK_CHAT',
  'AI_CONVERSATIONS_SAVE',
  'AI_CONVERSATIONS_REPLY',
  'AI_REPORT_SNAPSHOT_PORTFOLIO_REPORT',
  'AI_REPORT_MONTHLY_FINANCIAL_REVIEW',
  'AI_REPORT_DAILY_MARKET_BRIEF',
  'AI_ANALYSIS_FINANCIAL_HEALTH_SCORE',
  'AI_ANALYSIS_PORTFOLIO_ANALYSIS',
  'AI_PLANNING_BUDGET',
  'AI_PLANNING_GOALS'
);

-- CreateTable
CREATE TABLE "AIEntitlementRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planKey" TEXT,
  "status" "AIEntitlementStatus" NOT NULL DEFAULT 'INACTIVE',
  "featureKeys" "AIEntitlementFeatureKey"[],
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AIEntitlementRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIEntitlementRecord_userId_key"
ON "AIEntitlementRecord"("userId");

-- CreateIndex
CREATE INDEX "AIEntitlementRecord_status_idx"
ON "AIEntitlementRecord"("status");

-- AddForeignKey
ALTER TABLE "AIEntitlementRecord"
ADD CONSTRAINT "AIEntitlementRecord_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
