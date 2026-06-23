export function getSessionEligibility(session) {
  if (!session) return null;
  if (
    (session.departmentSnapshot !== undefined && session.departmentSnapshot !== null) ||
    (session.yearSnapshot !== undefined && session.yearSnapshot !== null) ||
    (session.sectionSnapshot !== undefined && session.sectionSnapshot !== null)
  ) {
    return {
      department: session.departmentSnapshot,
      year: session.yearSnapshot,
      section: session.sectionSnapshot,
    };
  }
  return session.course || null;
}

export function getHistoricalEligibility(session) {
  if (!session) return null;
  if (
    (session.departmentSnapshot !== undefined && session.departmentSnapshot !== null) ||
    (session.yearSnapshot !== undefined && session.yearSnapshot !== null) ||
    (session.sectionSnapshot !== undefined && session.sectionSnapshot !== null)
  ) {
    return {
      department: session.departmentSnapshot,
      year: session.yearSnapshot,
      section: session.sectionSnapshot,
    };
  }

  return session.course || null;
}

export function formatEligibility(course) {
  if (!course) return "No eligibility rules";
  const { department, year, section } = course;
  if (!department && !year && !section) {
    return "No eligibility rules";
  }

  const parts = [];
  if (department) parts.push(department);
  if (year) parts.push(`Sem ${year}`);
  if (section) parts.push(`Sec ${section}`);

  return parts.join(" • ");
}
