const NEON_API_KEY = "napi_1utawy1yqi798hhsotu5agh55fgz55wliew3eg6yy181bbyftzezt6m0rs0pb97u";
const NEON_PROJECT_ID = "withered-hill-78457482";
const PRODUCTION_BRANCH_ID = "br-soft-firefly-aq2bwdso";

async function resetProductionPassword() {
  console.log("=== Resetting neondb_owner Password on production Branch ===");
  try {
    const res = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${PRODUCTION_BRANCH_ID}/roles/neondb_owner/reset_password`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NEON_API_KEY}`,
        "Accept": "application/json",
        "Content-Length": 0
      }
    });
    if (!res.ok) {
      throw new Error(`Password reset failed with status: ${res.status}`);
    }
    const data = await res.json();
    const newPassword = data.role.password;
    console.log("Password reset successful!");
    console.log("New Password:", newPassword);

    // Fetch endpoints to construct database host
    const epRes = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/endpoints`, {
      headers: {
        "Authorization": `Bearer ${NEON_API_KEY}`,
        "Accept": "application/json"
      }
    });
    const epData = await epRes.json();
    const endpoint = epData.endpoints.find(e => e.id === "ep-misty-base-aqo6i25n");
    const host = endpoint.host;

    const connectionString = `postgresql://neondb_owner:${newPassword}@${host}/neondb?channel_binding=require&sslmode=require`;
    console.log("\n=== Production connection string (Direct/Standard) ===");
    console.log(connectionString);

    const pooledConnectionString = `postgresql://neondb_owner:${newPassword}@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require`;
    console.log("\n=== Production connection string (Pooled/PgBouncer) ===");
    console.log(pooledConnectionString);
  } catch (err) {
    console.error("Failed to reset password:", err.message);
  }
}

resetProductionPassword();
