const NEON_API_KEY = "napi_1utawy1yqi798hhsotu5agh55fgz55wliew3eg6yy181bbyftzezt6m0rs0pb97u";
const NEON_PROJECT_ID = "withered-hill-78457482";

async function run() {
  try {
    const res = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches`, {
      headers: {
        "Authorization": `Bearer ${NEON_API_KEY}`,
        "Accept": "application/json"
      }
    });
    const data = await res.json();
    console.log("Neon Branches:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed:", err.message);
  }
}
run();
