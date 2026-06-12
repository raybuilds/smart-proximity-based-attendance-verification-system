-- CreateTable
CREATE TABLE "UsedProximityToken" (
    "id" SERIAL NOT NULL,
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedProximityToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsedProximityToken_jti_key" ON "UsedProximityToken"("jti");

-- CreateIndex
CREATE INDEX "UsedProximityToken_expiresAt_idx" ON "UsedProximityToken"("expiresAt");
