# Demo Script - Attendance Verification System

This document outlines a 15-minute presentation script demonstrating the features of the Proximity-based Attendance Verification System for Students, Teachers, and Administrators.

---

## Story 1: Student Portal & Recovery (5 Minutes)

### Goal
Demonstrate how students track their attendance, view recovery plans when at risk, and mark proximity attendance.

1. **Login**:
   - Log in to the mobile app as a student:
     - **Email**: `student@attendance.local`
     - **Password**: `Password@123`
2. **Dashboard Overview**:
   - Point out the overall attendance percentage.
   - Explain the Chalk & Campus Forest Green headers and Cream backgrounds.
3. **Recovery Analytics**:
   - Navigate to **My Courses**.
   - Tap on **Compiler Design (CS405)**.
   - Point to the **Recovery Plan**: "Need 4 classes to reach 75%".
   - Highlight the **Trend Strip** (Recent history bar) and **timeline** showing historical sessions.
4. **Attendance Marking**:
   - Point to the active attendance card on the dashboard when a class is in progress.
   - Simulate joining the attendance loop (uses Bluetooth proximity verification to confirm real presence).

---

## Story 2: Teacher Portal & Live Session Management (5 Minutes)

### Goal
Demonstrate starting a class session, monitoring live check-ins, and manual override capabilities.

1. **Login**:
   - Log in as a teacher:
     - **Email**: `teacher@attendance.local`
     - **Password**: `Password@123`
2. **Dashboard Overview**:
   - Show statistics (total active courses, sessions conducted).
3. **Start Session**:
   - Navigate to **Start Session**.
   - Choose **Operating Systems (CS401)**, define proximity rules, and click **Start Session**.
   - Show the live check-in screen updating as students check in.
4. **Manual Corrections**:
   - Go to **Reports** -> **Operating Systems**.
   - Select a student, click **Manual Edit**, change status to **present**, select reason **Phone Issue**, and submit.
   - Point out the updated correction entry in the course timeline.

---

## Story 3: Admin Supervisory Oversight (5 Minutes)

### Goal
Demonstrate institutional analytics, user lockout, paginated audit centers, and course archival.

1. **Login**:
   - Log in as an administrator:
     - **Email**: `admin@attendance.local`
     - **Password**: `Password@123`
2. **Dashboard & Analytics**:
   - Point out overview cards (80 Students, 8 Teachers, 15 Active Courses).
   - Go to **Analytics** to view department attendance rankings and correction reason breakdowns.
3. **Audit Center**:
   - Go to **Audit Center** to see the chronological list of manual overrides.
   - Show filtering by reason (e.g. searching "Network Issue") and pagination controls.
4. **Course Archival**:
   - Navigate to **Course Archive**.
   - Select an active course, review statistics, and click **Archive Course**.
   - Navigate to **Archived Courses** tab, select the archived course to view historical read-only sessions, and click **Restore Course** to reactivate it.
