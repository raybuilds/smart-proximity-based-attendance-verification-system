-- DropIndex
DROP INDEX "Course_teacherId_name_key";

-- AlterTable
ALTER TABLE "AttendanceSession" ADD COLUMN     "departmentSnapshot" TEXT,
ADD COLUMN     "sectionSnapshot" TEXT,
ADD COLUMN     "semesterSnapshot" INTEGER;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "archiveReason" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "department" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "section" TEXT,
ADD COLUMN     "semester" INTEGER;

-- CreateIndex
CREATE INDEX "AttendanceSession_courseId_isActive_idx" ON "AttendanceSession"("courseId", "isActive");

-- CreateIndex
CREATE INDEX "Course_teacherId_isArchived_idx" ON "Course"("teacherId", "isArchived");

-- CreateIndex
CREATE INDEX "Student_department_semester_section_idx" ON "Student"("department", "semester", "section");
