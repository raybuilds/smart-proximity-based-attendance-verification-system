const http = require("http");

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function get(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data ? JSON.parse(data) : null,
        });
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function post(path, payload) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const postData = JSON.stringify(payload);
    
    const req = http.request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function getWithToken(path, token) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    http.get(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data ? JSON.parse(data) : null,
        });
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function runSmokeTests() {
  console.log("==========================================");
  console.log("   ATTENDANCE SYSTEM BACKEND SMOKE TEST   ");
  console.log("==========================================\n");

  let passes = 0;
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passes++;
    } else {
      console.error(`[FAIL] ${message}`);
      failures++;
    }
  }

  try {
    // 1. Validate /health endpoint
    console.log("Checking health check status...");
    const health = await get("/health");
    assert(health.statusCode === 200, "Health endpoint returns HTTP 200");
    assert(health.data?.success === true, "Health endpoint returns success state");
    assert(health.data?.database === "connected", "Database connection is healthy");
    assert(health.data?.pid !== undefined && health.data?.pid !== null, "Health response includes process PID");

    // 1b. Validate /ready endpoint
    console.log("\nChecking readiness status...");
    const ready = await get("/health/ready");
    assert(ready.statusCode === 200, "Ready endpoint returns HTTP 200");
    assert(ready.data?.ready === true, "Ready endpoint returns true status");

    // 2. Validate login endpoint (bad request validation check)
    console.log("\nChecking authorization validator checks...");
    const badLogin = await post("/auth/login", { email: "fake@gmail.com", password: "invalidpassword" });
    assert(
      badLogin.statusCode === 401 || badLogin.statusCode === 400,
      `Login rejects incorrect login data (received: ${badLogin.statusCode})`
    );

    // 3. Validate base test connection route
    console.log("\nChecking testing index response...");
    const testIndex = await get("/test");
    assert(testIndex.statusCode === 200, "Test index endpoint returns HTTP 200");
    assert(testIndex.data?.message !== undefined, "Test index response includes testing message text");

    // 4. Validate successful login flow (JWT token returned)
    console.log("\nChecking successful login verification...");
    const login = await post("/auth/login", { email: "teacher@attendance.local", password: "Password@123" });
    assert(login.statusCode === 200, "Login returns HTTP 200 with valid credentials");
    assert(login.data?.success === true || login.data?.token !== undefined, "Login response contains JWT bearer token");
    const token = login.data?.token;

    if (token) {
      // 5. Validate protected endpoint routing authorization
      console.log("\nChecking protected endpoint authentication...");
      const protectedRes = await getWithToken("/protected", token);
      assert(protectedRes.statusCode === 200, "Protected endpoint returns HTTP 200 with valid token");
      assert(protectedRes.data?.success === true, "Protected response contains success payload");

      // 6. Validate authenticated courses database retrieval
      console.log("\nChecking course database retrieval...");
      const coursesRes = await getWithToken("/courses", token);
      assert(coursesRes.statusCode === 200, "Courses list endpoint returns HTTP 200 with valid token");
      assert(Array.isArray(coursesRes.data?.courses), "Courses response contains list array");
    } else {
      console.error("[FAIL] Stale token returned, skipping authenticated tests");
      failures++;
    }

  } catch (error) {
    console.error("\n[CRITICAL ERROR] Smoke tests failed to reach the server:", error.message);
    failures++;
  }

  console.log("\n==========================================");
  console.log(`Summary: ${passes} Passed, ${failures} Failed`);
  console.log("==========================================");

  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTests();
