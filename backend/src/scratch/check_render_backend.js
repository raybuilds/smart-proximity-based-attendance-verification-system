const http = require("https");

function checkUrl(url) {
  return new Promise((resolve) => {
    console.log(`Checking URL: ${url}`);
    const req = http.get(url, { timeout: 15000 }, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on("error", (err) => {
      resolve({ error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ error: "Timeout after 15 seconds" });
    });
  });
}

async function run() {
  const rootResult = await checkUrl("https://attendance-system-backend-unu2.onrender.com/");
  console.log("Root Check Result:", JSON.stringify(rootResult, null, 2));

  const apiResult = await checkUrl("https://attendance-system-backend-unu2.onrender.com/api/test");
  console.log("API Test Check Result:", JSON.stringify(apiResult, null, 2));
}

run();
