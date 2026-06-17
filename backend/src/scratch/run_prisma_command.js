const { execSync } = require("child_process");

const connectionString = "postgresql://neondb_owner:npg_EXGRzWDFK01k@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

process.env.DATABASE_URL = connectionString;

function runPrisma() {
  console.log("=== Running Prisma db pull ===");
  try {
    const pullOut = execSync("npx prisma db pull", { encoding: "utf8" });
    console.log(pullOut);
  } catch (err) {
    console.error("Prisma db pull failed:", err.message);
    console.error(err.stdout);
    console.error(err.stderr);
  }

  console.log("\n=== Running Prisma migrate status ===");
  try {
    const statusOut = execSync("npx prisma migrate status", { encoding: "utf8" });
    console.log(statusOut);
  } catch (err) {
    console.error("Prisma migrate status failed:", err.message);
    console.error(err.stdout);
    console.error(err.stderr);
  }
}

runPrisma();
