-- Create unique index to ensure at most one active session per teacher
CREATE UNIQUE INDEX "one_active_session_per_teacher"
ON "AttendanceSession" ("teacherId")
WHERE "isActive" = true;