const { z } = require("zod");

const startSessionSchema = z.object({});
const endSessionSchema = z.object({});

module.exports = {
  startSessionSchema,
  endSessionSchema,
};
