-- Rename Columns in Student, Course, and AttendanceSession tables
ALTER TABLE "Student" RENAME COLUMN "semester" TO "year";
ALTER TABLE "Course" RENAME COLUMN "semester" TO "year";
ALTER TABLE "AttendanceSession" RENAME COLUMN "semesterSnapshot" TO "yearSnapshot";

-- Drop the old index and recreate it on the renamed 'year' column
DROP INDEX IF EXISTS "Student_department_semester_section_idx";
CREATE INDEX "Student_department_year_section_idx" ON "Student"("department", "year", "section");
