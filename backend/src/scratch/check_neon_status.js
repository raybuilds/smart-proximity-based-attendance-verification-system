const NEON_API_KEY = "napi_1utawy1yqi798hhsotu5agh55fgz55wliew3eg6yy181bbyftzezt6m0rs0pb97u";
const NEON_PROJECT_ID = "withered-hill-78457482";

async function checkNeon() {
  console.log("=== Querying Neon API ===");
  try {
    // 1. Get project details
    const projRes = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}`, {
      headers: {
        "Authorization": `Bearer ${NEON_API_KEY}`,
        "Accept": "application/json"
      }
    });
    if (!projRes.ok) {
      throw new Error(`Project query failed with status: ${projRes.status}`);
    }
    const projData = await projRes.json();
    console.log("Project Name:", projData.project.name);
    console.log("Database Host:", projData.project.database_host);

    // 2. Get branches
    const branchesRes = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches`, {
      headers: {
        "Authorization": `Bearer ${NEON_API_KEY}`,
        "Accept": "application/json"
      }
    });
    if (!branchesRes.ok) {
      throw new Error(`Branches query failed with status: ${branchesRes.status}`);
    }
    const branchesData = await branchesRes.json();
    console.log("\n=== Active Branches ===");
    for (const b of branchesData.branches) {
      console.log(`ID: ${b.id}, Name: ${b.name}, State: ${b.state}, Primary: ${b.primary}`);
    }

    // 3. Get endpoints
    const endpointsRes = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/endpoints`, {
      headers: {
        "Authorization": `Bearer ${NEON_API_KEY}`,
        "Accept": "application/json"
      }
    });
    if (!endpointsRes.ok) {
      throw new Error(`Endpoints query failed with status: ${endpointsRes.status}`);
    }
    const endpointsData = await endpointsRes.json();
    console.log("\n=== Active Endpoints ===");
    for (const ep of endpointsData.endpoints) {
      console.log(`ID: ${ep.id}, Host: ${ep.host}, Type: ${ep.type}, Current State: ${ep.current_state}`);
    }
  } catch (err) {
    console.error("Neon API query failed:", err.message);
  }
}

checkNeon();
