const { execSync } = require("child_process");

const connectionString = "postgresql://neondb_owner:npg_qzde6oI8JlOE@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

process.env.DATABASE_URL = connectionString;

function deployMigrations() {
  console.log("=== Running Prisma migrate deploy ===");
  try {
    const deployOut = execSync("npx prisma migrate deploy", { encoding: "utf8" });
    console.log(deployOut);
  } catch (err) {
    console.error("Prisma migrate deploy failed:", err.message);
    console.error(err.stdout);
    console.error(err.stderr);
  }
}

deployMigrations();
