const NEON_API_KEY = "napi_1utawy1yqi798hhsotu5agh55fgz55wliew3eg6yy181bbyftzezt6m0rs0pb97u";
const NEON_PROJECT_ID = "withered-hill-78457482";

async function getConnectionString() {
  console.log("=== Fetching Connection Details from Neon ===");
  try {
    // Get branches
    const branchesRes = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches`, {
      headers: { "Authorization": `Bearer ${NEON_API_KEY}`, "Accept": "application/json" }
    });
    const branchesData = await branchesRes.json();
    const prodBranch = branchesData.branches.find(b => b.name === "production") || branchesData.branches[0];

    // Get connection URI
    const connRes = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/connection_uri?branch_id=${prodBranch.id}&role_name=neondb_owner&database_name=neondb`, {
      headers: { "Authorization": `Bearer ${NEON_API_KEY}`, "Accept": "application/json" }
    });
    if (!connRes.ok) {
      throw new Error(`Connection URI query failed with status: ${connRes.status}`);
    }
    const connData = await connRes.json();
    console.log("Connection URI:", connData.uri);
  } catch (err) {
    console.error("Failed to fetch connection details:", err.message);
  }
}

getConnectionString();
