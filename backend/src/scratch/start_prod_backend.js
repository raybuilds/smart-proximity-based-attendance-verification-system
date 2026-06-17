const { spawn } = require("child_process");
const path = require("path");

const connectionString = "postgresql://neondb_owner:npg_EXGRzWDFK01k@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const env = { ...process.env, DATABASE_URL: connectionString };

console.log("=== Starting Backend Server on Neon DB ===");
const child = spawn("node", ["src/app.js"], {
  cwd: path.resolve(__dirname, "../.."),
  env
});

child.stdout.on("data", (data) => {
  process.stdout.write(data);
});

child.stderr.on("data", (data) => {
  process.stderr.write(data);
});

child.on("close", (code) => {
  console.log(`Backend server exited with code ${code}`);
});
