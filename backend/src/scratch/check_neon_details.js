const NEON_API_KEY = "napi_1utawy1yqi798hhsotu5agh55fgz55wliew3eg6yy181bbyftzezt6m0rs0pb97u";
const NEON_PROJECT_ID = "withered-hill-78457482";

async function checkDetails() {
  console.log("=== Querying Neon DB Details ===");
  try {
    // 1. List branches to get active branch ID for production
    const branchesRes = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches`, {
      headers: { "Authorization": `Bearer ${NEON_API_KEY}`, "Accept": "application/json" }
    });
    const branchesData = await branchesRes.json();
    const prodBranch = branchesData.branches.find(b => b.name === "production") || branchesData.branches[0];
    console.log(`Using branch: ${prodBranch.name} (${prodBranch.id})`);

    // 2. List databases for this branch
    const dbRes = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${prodBranch.id}/databases`, {
      headers: { "Authorization": `Bearer ${NEON_API_KEY}`, "Accept": "application/json" }
    });
    const dbData = await dbRes.json();
    console.log("\n=== Databases ===");
    for (const db of dbData.databases) {
      console.log(`Name: ${db.name}, Owner: ${db.owner_name}`);
    }

    // 3. List roles for this branch
    const rolesRes = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${prodBranch.id}/roles`, {
      headers: { "Authorization": `Bearer ${NEON_API_KEY}`, "Accept": "application/json" }
    });
    const rolesData = await rolesRes.json();
    console.log("\n=== Roles ===");
    for (const r of rolesData.roles) {
      console.log(`Name: ${r.name}`);
    }
  } catch (err) {
    console.error("Failed to query Neon details:", err.message);
  }
}

checkDetails();
