-- Create unique index to ensure at most one active session per course
CREATE UNIQUE INDEX "one_active_session_per_course"
ON "AttendanceSession" ("courseId")
WHERE "isActive" = true;