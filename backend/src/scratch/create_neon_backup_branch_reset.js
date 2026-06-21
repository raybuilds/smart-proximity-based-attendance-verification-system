const NEON_API_KEY = "napi_1utawy1yqi798hhsotu5agh55fgz55wliew3eg6yy181bbyftzezt6m0rs0pb97u";
const NEON_PROJECT_ID = "withered-hill-78457482";
const PRODUCTION_BRANCH_ID = "br-soft-firefly-aq2bwdso";

async function run() {
  try {
    const payload = {
      branch: {
        name: "full-demo-reset-backup",
        parent_id: PRODUCTION_BRANCH_ID
      }
    };
    
    console.log("Creating backup branch full-demo-reset-backup...");
    const res = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NEON_API_KEY}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("Branch Creation Response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Backup Branch Creation failed:", err.message);
  }
}
run();
