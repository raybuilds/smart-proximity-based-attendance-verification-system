const RENDER_API_KEY = "rnd_TqX1SUtDkgl2K2rIqD60SUpn6i8O";
const SERVICE_ID = "srv-cui2t75628sdc804f5e0";

async function run() {
  try {
    console.log("Triggering manual redeploy on Render...");
    const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RENDER_API_KEY}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const data = await res.json();
    console.log("Render Deploy Trigger Response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed:", err.message);
  }
}
run();
