const { prisma } = require("../../config/database");
const { HTTP_STATUS } = require("../../utils/constants");
const { invalidateTeacherDashboardCache } = require("../reports/reports.service");

function normalizeInputString(val) {
  if (val === undefined || val === null) return null;
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  return trimmed === "" ? null : trimmed.toUpperCase();
}

async function getEligibleStudentCount(course) {
  if (!course.department && !course.year && !course.section) {
    return prisma.student.count();
  }

  const where = {};
  if (course.department) {
    where.department = {
      equals: course.department,
      mode: "insensitive",
    };
  }
  if (course.year) {
    where.year = course.year;
  }
  if (course.section) {
    where.section = {
      equals: course.section,
      mode: "insensitive",
    };
  }

  return prisma.student.count({ where });
}

async function getTeacherByUserId(userId) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
  });
  if (!teacher) {
    const error = new Error("Teacher profile not found");
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }
  return teacher;
}

async function createCourse(userId, data) {
  const teacher = await getTeacherByUserId(userId);
  const trimmedName = data.name.trim();

  // Prevent duplicate course names for ACTIVE courses for the same teacher
  const existingCourse = await prisma.course.findFirst({
    where: {
      teacherId: teacher.id,
      name: trimmedName,
      isArchived: false,
    },
  });

  if (existingCourse) {
    const error = new Error("Course name already exists for this teacher");
    error.statusCode = HTTP_STATUS.CONFLICT;
    throw error;
  }

  const dept = normalizeInputString(data.department);
  const sec = normalizeInputString(data.section);
  const sem = data.year !== undefined ? (data.year || null) : null;
  const courseCode = normalizeInputString(data.code);

  const course = await prisma.course.create({
    data: {
      name: trimmedName,
      code: courseCode,
      teacherId: teacher.id,
      department: dept,
      year: sem,
      section: sec,
    },
  });

  const count = await getEligibleStudentCount(course);

  invalidateTeacherDashboardCache(userId);

  return {
    ...course,
    eligibleStudentCount: count,
  };
}

async function getCourses(userId, includeArchived = false) {
  const teacher = await getTeacherByUserId(userId);

  const where = {
    teacherId: teacher.id,
  };

  if (!includeArchived) {
    where.isArchived = false;
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Lifecycle in-memory cache for counts
  const countCache = {};

  const coursesWithCounts = await Promise.all(
    courses.map(async (course) => {
      const cacheKey = `${course.department || ""}-${course.year || ""}-${course.section || ""}`;
      
      if (countCache[cacheKey] === undefined) {
        countCache[cacheKey] = await getEligibleStudentCount(course);
      }

      return {
        ...course,
        eligibleStudentCount: countCache[cacheKey],
      };
    })
  );

  return coursesWithCounts;
}

async function getCourseById(userId, courseId) {
  const teacher = await getTeacherByUserId(userId);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }

  if (course.teacherId !== teacher.id) {
    const error = new Error("You do not have permission to access this course");
    error.statusCode = HTTP_STATUS.FORBIDDEN;
    throw error;
  }

  const count = await getEligibleStudentCount(course);

  return {
    ...course,
    eligibleStudentCount: count,
  };
}

async function updateCourse(userId, courseId, data) {
  const teacher = await getTeacherByUserId(userId);
  const trimmedName = data.name.trim();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Acquire Course lock
    const courseLock = await tx.$queryRaw`SELECT * FROM "Course" WHERE id = ${courseId} FOR UPDATE`;
    const course = courseLock[0];

    if (!course) {
      const error = new Error("Course not found");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (course.teacherId !== teacher.id) {
      const error = new Error("You do not have permission to modify this course");
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    // Prevent eligibility changes during active sessions
    const dept = normalizeInputString(data.department);
    const sec = normalizeInputString(data.section);
    const sem = data.year !== undefined ? (data.year || null) : course.year;

    const deptChanged = dept !== course.department;
    const semChanged = sem !== course.year;
    const secChanged = sec !== course.section;

    if (deptChanged || semChanged || secChanged) {
      const activeSession = await tx.attendanceSession.findFirst({
        where: {
          courseId,
          isActive: true,
        },
      });

      if (activeSession) {
        const error = new Error("Course eligibility rules cannot be modified while an attendance session is active.");
        error.statusCode = 409;
        throw error;
      }
    }

    // Prevent duplicate active course names
    if (course.name !== trimmedName) {
      const existingCourse = await tx.course.findFirst({
        where: {
          teacherId: teacher.id,
          name: trimmedName,
          isArchived: false,
        },
      });

      if (existingCourse) {
        const error = new Error("Course name already exists for this teacher");
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }
    }

    const updatedCourse = await tx.course.update({
      where: { id: courseId },
      data: {
        name: trimmedName,
        code: normalizeInputString(data.code),
        department: dept,
        year: sem,
        section: sec,
      },
    });

    if (deptChanged || semChanged || secChanged) {
      const { backfillCourseStudents } = require("../attendance/backfill.service");
      await backfillCourseStudents(tx, courseId, { department: dept, year: sem, section: sec });
    }

    return updatedCourse;
  });

  const count = await getEligibleStudentCount(result);

  invalidateTeacherDashboardCache(userId);

  return {
    ...result,
    eligibleStudentCount: count,
  };
}

async function deleteCourse(userId, courseId, data = {}) {
  const teacher = await getTeacherByUserId(userId);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Acquire Course lock
    const courseLock = await tx.$queryRaw`SELECT * FROM "Course" WHERE id = ${courseId} FOR UPDATE`;
    const course = courseLock[0];

    if (!course) {
      const error = new Error("Course not found");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (course.teacherId !== teacher.id) {
      const error = new Error("You do not have permission to delete this course");
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    // Block soft archival if active session exists
    const activeSession = await tx.attendanceSession.findFirst({
      where: {
        courseId,
        isActive: true,
      },
    });

    if (activeSession) {
      const error = new Error("Courses with active attendance sessions cannot be archived.");
      error.statusCode = 409;
      throw error;
    }

    const archiveReason = data.archiveReason !== undefined ? normalizeInputString(data.archiveReason) : null;

    const updated = await tx.course.update({
      where: { id: courseId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archiveReason,
      },
    });

    return updated;
  });

  const count = await getEligibleStudentCount(result);

  invalidateTeacherDashboardCache(userId);

  return {
    ...result,
    eligibleStudentCount: count,
  };
}

async function unarchiveCourse(userId, courseId) {
  const teacher = await getTeacherByUserId(userId);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Acquire Course lock
    const courseLock = await tx.$queryRaw`SELECT * FROM "Course" WHERE id = ${courseId} FOR UPDATE`;
    const course = courseLock[0];

    if (!course) {
      const error = new Error("Course not found");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (course.teacherId !== teacher.id) {
      const error = new Error("You do not have permission to modify this course");
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    if (!course.isArchived) {
      const error = new Error("Course is not archived");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    // Check if another ACTIVE course with same name exists
    const activeDuplicate = await tx.course.findFirst({
      where: {
        teacherId: teacher.id,
        name: course.name,
        isArchived: false,
      },
    });

    if (activeDuplicate) {
      const error = new Error("An active course with this name already exists.");
      error.statusCode = 409;
      throw error;
    }

    const updated = await tx.course.update({
      where: { id: courseId },
      data: {
        isArchived: false,
        archivedAt: null,
        archiveReason: null,
      },
    });

    return updated;
  });

  const count = await getEligibleStudentCount(result);

  invalidateTeacherDashboardCache(userId);

  return {
    ...result,
    eligibleStudentCount: count,
  };
}

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  unarchiveCourse,
  getEligibleStudentCount,
};

