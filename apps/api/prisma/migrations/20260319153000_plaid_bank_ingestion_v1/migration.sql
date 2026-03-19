-- CreateEnum
CREATE TYPE "ConnectedSourceSecretType" AS ENUM ('PROVIDER_CREDENTIALS');

-- AlterTable
ALTER TABLE "ConnectedSourceAccountRecord" ADD COLUMN     "officialName" TEXT;

-- AlterTable
ALTER TABLE "ConnectedSourceRecord" ADD COLUMN     "providerConnectionId" TEXT;

-- CreateTable
CREATE TABLE "ConnectedSourceSecretRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "secretType" "ConnectedSourceSecretType" NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedSourceSecretRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectedSourceSecretRecord_userId_createdAt_idx" ON "ConnectedSourceSecretRecord"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedSourceSecretRecord_sourceId_secretType_key" ON "ConnectedSourceSecretRecord"("sourceId", "secretType");

-- CreateIndex
CREATE INDEX "ConnectedSourceAccountRecord_sourceId_externalAccountId_idx" ON "ConnectedSourceAccountRecord"("sourceId", "externalAccountId");

-- CreateIndex
CREATE INDEX "ConnectedSourceRecord_providerKey_providerConnectionId_idx" ON "ConnectedSourceRecord"("providerKey", "providerConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedSourceRecord_userId_providerKey_providerConnection_key" ON "ConnectedSourceRecord"("userId", "providerKey", "providerConnectionId");

-- AddForeignKey
ALTER TABLE "ConnectedSourceSecretRecord" ADD CONSTRAINT "ConnectedSourceSecretRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedSourceSecretRecord" ADD CONSTRAINT "ConnectedSourceSecretRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ConnectedSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

