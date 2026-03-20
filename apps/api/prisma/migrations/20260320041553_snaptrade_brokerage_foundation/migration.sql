-- CreateTable
CREATE TABLE "ConnectedProviderUserRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedProviderUserRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectedProviderUserRecord_providerKey_providerUserId_idx" ON "ConnectedProviderUserRecord"("providerKey", "providerUserId");

-- CreateIndex
CREATE INDEX "ConnectedProviderUserRecord_userId_createdAt_idx" ON "ConnectedProviderUserRecord"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedProviderUserRecord_userId_providerKey_key" ON "ConnectedProviderUserRecord"("userId", "providerKey");

-- AddForeignKey
ALTER TABLE "ConnectedProviderUserRecord" ADD CONSTRAINT "ConnectedProviderUserRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
