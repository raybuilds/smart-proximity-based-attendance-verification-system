-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "bssid" TEXT,
ADD COLUMN     "devicePlatform" TEXT,
ADD COLUMN     "rssi" INTEGER,
ADD COLUMN     "ssid" TEXT;
