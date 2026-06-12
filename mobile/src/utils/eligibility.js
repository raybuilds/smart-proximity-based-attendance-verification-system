export function getSessionEligibility(session) {
  if (!session) return null;
  if (
    (session.departmentSnapshot !== undefined && session.departmentSnapshot !== null) ||
    (session.semesterSnapshot !== undefined && session.semesterSnapshot !== null) ||
    (session.sectionSnapshot !== undefined && session.sectionSnapshot !== null)
  ) {
    return {
      department: session.departmentSnapshot,
      semester: session.semesterSnapshot,
      section: session.sectionSnapshot,
    };
  }
  return session.course || null;
}

export function getHistoricalEligibility(session) {
  if (!session) return null;
  if (
    (session.departmentSnapshot !== undefined && session.departmentSnapshot !== null) ||
    (session.semesterSnapshot !== undefined && session.semesterSnapshot !== null) ||
    (session.sectionSnapshot !== undefined && session.sectionSnapshot !== null)
  ) {
    return {
      department: session.departmentSnapshot,
      semester: session.semesterSnapshot,
      section: session.sectionSnapshot,
    };
  }

  return session.course || null;
}

export function formatEligibility(course) {
  if (!course) return "No eligibility rules";
  const { department, semester, section } = course;
  if (!department && !semester && !section) {
    return "No eligibility rules";
  }

  const parts = [];
  if (department) parts.push(department);
  if (semester) parts.push(`Sem ${semester}`);
  if (section) parts.push(`Sec ${section}`);

  return parts.join(" • ");
}
