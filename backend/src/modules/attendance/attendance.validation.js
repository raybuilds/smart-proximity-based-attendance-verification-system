const { z } = require("zod");

const startSessionSchema = z.object({
  courseId: z.number({ required_error: "courseId is required" }),
  rssiThreshold: z.number().int().optional(),
});
const endSessionSchema = z.object({});

module.exports = {
  startSessionSchema,
  endSessionSchema,
};
