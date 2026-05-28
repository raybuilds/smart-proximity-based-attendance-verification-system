const port = Number(process.env.PORT) || 5000;
const databaseUrl = process.env.DATABASE_URL || "";
const jwtSecret = process.env.JWT_SECRET || "";
const nodeEnv = process.env.NODE_ENV || "development";

module.exports = {
  port,
  databaseUrl,
  jwtSecret,
  nodeEnv,
  isDevelopment: nodeEnv === "development",
};
