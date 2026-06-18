# Demo Validation Checklist

This checklist tracks end-to-end verification of all key workflows for Students, Teachers, and Administrators using the professional demo dataset.

## 1. Student Workflow
- [ ] **Authentication**: Log in successfully using `student@attendance.local` (Password: `Password@123`).
- [ ] **Dashboard Overview**: Check aggregate attendance percentage card and presence metrics.
- [ ] **Active Session Joining**: Confirm that when an active session is running (e.g. course CS401), an active session join prompt appears on the dashboard.
- [ ] **My Courses Oversight**: View the student course roster. Check the attendance percentage for each course and color-coded risk levels.
- [ ] **Recovery Plan & Analytics**: Tap on Compiler Design (CS405) to review recovery plan calculations (e.g., "Need 4 classes to reach 75%").
- [ ] **Timeline View**: Review chronological timelines showing presence/absence history.
- [ ] **Trend Strip**: Verify the visual presence history bar showing recent status trends (e.g. GREEN for present, GREY for absent).
- [ ] **Streak Calculations**: Verify active presence streak metrics.

## 2. Teacher Workflow
- [ ] **Authentication**: Log in successfully using `teacher@attendance.local` (Password: `Password@123`).
- [ ] **Dashboard Analytics**: Verify stats summaries and best/worst performing course listings.
- [ ] **Course Management**: Verify course listings and creation page. Ensure archived courses do not appear in active lists.
- [ ] **Start/Stop Sessions**: Select an active course, start a session, verify live attendance update lists, and end the session.
- [ ] **Reports Page**: Review student rosters, aggregate performance stats, and manual corrections audit timelines.
- [ ] **Manual Corrections**: Adjust a student's record manually (e.g. select "Phone Issue" or "QR Scan Failed") and confirm audit log preservation.

## 3. Admin Workflow
- [ ] **Authentication**: Log in successfully using `admin@attendance.local` (Password: `Password@123`).
- [ ] **Institutional Dashboard**: Review institutional statistics counters (Students, Teachers, Active Courses, Active Sessions).
- [ ] **User Management**:
  - [ ] Search students & teachers.
  - [ ] Toggle status (activate/deactivate) and verify lockout protection.
- [ ] **Course Oversight**: Review active courses and archived courses lists.
- [ ] **Audit Center**: Review paginated manual correction records (30+ logs) with pagination controls.
- [ ] **Analytics Overview**: Check rankings for top departments and reasons breakdown logs.
- [ ] **Course Archival Lifecycle**:
  - [ ] Archive an active course (verify active session constraint).
  - [ ] Restore an archived course.
