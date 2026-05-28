-- CreateTable
CREATE TABLE "SessionQRCode" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionQRCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionQRCode_nonce_key" ON "SessionQRCode"("nonce");

-- AddForeignKey
ALTER TABLE "SessionQRCode" ADD CONSTRAINT "SessionQRCode_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
