-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('QR', 'MANUAL');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "correctionReason" TEXT,
ADD COLUMN     "method" "AttendanceMethod" NOT NULL DEFAULT 'QR',
ADD COLUMN     "modifiedAt" TIMESTAMP(3),
ADD COLUMN     "modifiedByTeacherId" INTEGER;

-- CreateTable
CREATE TABLE "AttendanceCorrection" (
    "id" SERIAL NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "previousMethod" "AttendanceMethod",
    "newMethod" "AttendanceMethod",
    "correctionReason" TEXT NOT NULL,
    "modifiedByTeacherId" INTEGER NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceCorrection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
