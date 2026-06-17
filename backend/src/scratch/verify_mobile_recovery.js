const fs = require("fs");
const path = require("path");
const assert = require("assert");

const mobileScreensDir = path.join(__dirname, "../../../mobile/src/screens");
const targetScreens = [
  "TeacherDashboardScreen.js",
  "TeacherReportsScreen.js",
  "CourseDetailReportScreen.js",
  "DefaulterReportScreen.js"
];

function runVerification() {
  console.log("=========================================================================");
  console.log("  🛡️  MOBILE OFFLINE RECOVERY & UX HARDENING VERIFICATION SUITE 🛡️  ");
  console.log("=========================================================================\n");

  const results = {};

  for (const screen of targetScreens) {
    console.log(`--- Inspecting Screen: ${screen} ---`);
    const filePath = path.join(mobileScreensDir, screen);
    
    if (!fs.existsSync(filePath)) {
      console.error(`[FAIL] Screen file not found: ${screen}`);
      results[screen] = "FAIL (File not found)";
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const errors = [];

    // 1. RefreshControl Verification
    const hasRefreshControlImport = content.includes("RefreshControl");
    const hasRefreshControlUsage = content.includes("refreshControl") || content.includes("RefreshControl");
    if (!hasRefreshControlImport || !hasRefreshControlUsage) {
      errors.push("Missing RefreshControl import/usage for pull-to-refresh.");
    }

    // 2. Retry Button Verification
    const hasRetryButtonText = content.includes("Retry") || content.includes("retryButton");
    if (!hasRetryButtonText) {
      errors.push("Missing Retry button UI text or styles.");
    }

    // 3. Connectivity Listener Verification
    const hasNetInfoImport = content.includes("NetInfo") || content.includes("@react-native-community/netinfo");
    const hasNetInfoListener = content.includes("NetInfo.addEventListener");
    if (!hasNetInfoImport || !hasNetInfoListener) {
      errors.push("Missing NetInfo connection listener subscription.");
    }

    // 4. Loading Guards Verification
    const hasLoadingGuards = content.includes("loading || refreshing") || content.includes("isLoading || refreshing");
    if (!hasLoadingGuards) {
      errors.push("Missing concurrent fetch loading state guards.");
    }

    // 5. Request Cancellation Logic Verification
    const hasAbortController = content.includes("AbortController");
    const hasAbortCall = content.includes("abort()");
    if (!hasAbortController || !hasAbortCall) {
      errors.push("Missing AbortController setup or abort() calls on unmount/re-fetch.");
    }

    // 6. Memory Leak Guard / Mounted Reference Verification
    const hasMountedRef = content.includes("isMountedRef");
    if (!hasMountedRef) {
      errors.push("Missing isMountedRef check to prevent setState memory leaks on unmount.");
    }

    if (errors.length === 0) {
      console.log(`[PASS] Screen ${screen} conforms to all 6 recovery specifications.\n`);
      results[screen] = "PASS";
    } else {
      console.error(`[FAIL] Screen ${screen} has issues:\n` + errors.map(e => `  - ${e}`).join("\n") + "\n");
      results[screen] = `FAIL (${errors.length} issues)`;
    }
  }

  // Print results matrix
  console.log("==================================================");
  console.log("     MOBILE RECOVERY UX VERIFICATION MATRIX       ");
  console.log("==================================================");
  let passedCount = 0;
  let totalCount = 0;
  for (const [key, val] of Object.entries(results)) {
    totalCount++;
    if (val === "PASS") passedCount++;
    console.log(`${key.padEnd(30)}: [${val}]`);
  }
  console.log("--------------------------------------------------");
  console.log(`TOTAL: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  console.log("==================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification();
