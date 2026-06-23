const { z } = require("zod");
const { MIN_YEAR } = require("../../constants/academic");

const createCourseSchema = z.object({
  name: z
    .string({ required_error: "Course name is required" })
    .trim()
    .min(2, "Course name must be at least 2 characters")
    .max(100, "Course name cannot exceed 100 characters"),
  code: z
    .string()
    .trim()
    .max(20, "Course code cannot exceed 20 characters")
    .optional()
    .nullable(),
  department: z
    .string()
    .trim()
    .max(100, "Department cannot exceed 100 characters")
    .optional()
    .nullable(),
  year: z
    .preprocess((val) => {
      if (val === "" || val === undefined || val === null) return null;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? val : parsed;
    }, z.number().int().min(MIN_YEAR, `Year must be at least ${MIN_YEAR}`).nullable())
    .optional(),
  section: z
    .string()
    .trim()
    .max(20, "Section cannot exceed 20 characters")
    .optional()
    .nullable(),
});

const updateCourseSchema = z.object({
  name: z
    .string({ required_error: "Course name is required" })
    .trim()
    .min(2, "Course name must be at least 2 characters")
    .max(100, "Course name cannot exceed 100 characters"),
  code: z
    .string()
    .trim()
    .max(20, "Course code cannot exceed 20 characters")
    .optional()
    .nullable(),
  department: z
    .string()
    .trim()
    .max(100, "Department cannot exceed 100 characters")
    .optional()
    .nullable(),
  year: z
    .preprocess((val) => {
      if (val === "" || val === undefined || val === null) return null;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? val : parsed;
    }, z.number().int().min(MIN_YEAR, `Year must be at least ${MIN_YEAR}`).nullable())
    .optional(),
  section: z
    .string()
    .trim()
    .max(20, "Section cannot exceed 20 characters")
    .optional()
    .nullable(),
});

module.exports = {
  createCourseSchema,
  updateCourseSchema,
};

