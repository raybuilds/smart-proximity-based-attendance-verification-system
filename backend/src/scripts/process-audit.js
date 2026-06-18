const http = require("http");

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

function getHealth() {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}/health`, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          data: data ? JSON.parse(data) : null,
        });
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function runAudit() {
  console.log("==========================================");
  console.log("    PROCESS & PERFORMANCE METRICS AUDIT   ");
  console.log("==========================================\n");

  try {
    const response = await getHealth();
    const health = response.data;
    
    if (response.statusCode === 200 && health) {
      console.log(`Running Process PID:   ${health.pid}`);
      console.log(`Node Engine Version:   ${process.version}`);
      console.log(`Server Active Uptime:  ${health.uptime} seconds`);
      console.log(`Database Connection:   ${health.database.toUpperCase()}`);
      console.log("\nMemory Profiles:");
      console.log(`  - System RSS allocation: ${health.memory.rss}`);
      console.log(`  - Heap allocation size:  ${health.memory.heapTotal}`);
      console.log(`  - Heap size utilized:    ${health.memory.heapUsed}`);
      console.log("\nStatus: ACTIVE & RUNNING SUCCESSFULLY");
      process.exit(0);
    } else {
      console.error(`[ERROR] Server returned unhealthy state (${response.statusCode}):`, health);
      process.exit(1);
    }
  } catch (error) {
    console.error("[CRITICAL ERROR] The Node application is currently offline or unreachable.");
    console.error("Diagnostic tips:");
    console.error("  1. Verify the process is running: 'Get-Process node'");
    console.log("  2. Verify port binding constraints: 'netstat -ano | findstr :5000'");
    process.exit(1);
  }
}

runAudit();
