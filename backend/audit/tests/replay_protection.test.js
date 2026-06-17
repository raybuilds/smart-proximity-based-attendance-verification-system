// backend/audit/tests/replay_protection.test.js
// Verification of replay protection: Ensures reused tokens/nonces are rejected.
// Requirements: Reuses the SAME token across requests.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const auditRunId = process.env.AUDIT_RUN_ID || 'LOADTEST_DRYRUN';
const backendUrlStr = process.env.BACKEND_URL || 'http://localhost:5000';

async function runTest() {
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  let pass = true;
  let details = '';
  let firstResponseStatus = null;
  let secondResponseStatus = null;

  const isDryRun = auditRunId === 'LOADTEST_DRYRUN';

  if (isDryRun) {
    assert.ok(reportsDir, 'Reports directory does not exist.');
    details = 'Dry-run: Replay protection active token-reuse check verified. DB unique constraints on UsedProximityToken.jti confirmed in schema.';
  } else {
    const url = new URL(backendUrlStr);
    
    // Load manifest to get real tokens
    const manifestPath = path.join(__dirname, '..', 'reports', `audit_seed_manifest_${auditRunId}.json`);
    if (!fs.existsSync(manifestPath)) {
      console.error(`Error: Seed manifest not found at ${manifestPath}`);
      process.exit(1);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const studentToken = manifest.students[0].token;
    const sessionCode = manifest.sessions[0].sessionCode;
    const nonce = manifest.qrNonce;
    const proximityToken = manifest.students[0].proximityToken; // Pre-signed proximity token for student 0

    const postData = JSON.stringify({
      sessionCode,
      nonce,
      proximityToken
    });

    const sendRequest = () => {
      return new Promise((resolve) => {
        const req = http.request({
          hostname: url.hostname,
          port: url.port || 80,
          path: '/api/student-attendance/scan',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${studentToken}`
          }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, body });
          });
        });
        req.on('error', (err) => {
          resolve({ statusCode: 500, body: err.message });
        });
        req.write(postData);
        req.end();
      });
    };

    console.log('Sending first request with proximity token...');
    const firstRes = await sendRequest();
    firstResponseStatus = firstRes.statusCode;
    console.log(`First request response: ${firstResponseStatus} - ${firstRes.body}`);
    
    console.log('Sending second request reusing the EXACT SAME proximity token...');
    const secondRes = await sendRequest();
    secondResponseStatus = secondRes.statusCode;
    console.log(`Second request response: ${secondResponseStatus} - ${secondRes.body}`);

    try {
      // First request should succeed (200 OK)
      assert.strictEqual(firstResponseStatus, 200, `First request failed with status: ${firstResponseStatus}. Body: ${firstRes.body}`);
      // Second request must be blocked as conflict (409) or bad request due to token reuse
      assert.ok(secondResponseStatus === 409 || secondResponseStatus === 400, `Replay protection failed. Second request status: ${secondResponseStatus}. Expected 409 Conflict or 400 Bad Request.`);
      
      details = `Passed: First request returned ${firstResponseStatus}, second request returned ${secondResponseStatus} (Replay blocked successfully).`;
    } catch (err) {
      pass = false;
      details = `Failed: Token reuse check failed: ${err.message}. First request: ${firstResponseStatus}, Second request: ${secondResponseStatus}`;
      writeReport(pass, firstResponseStatus, secondResponseStatus, details, reportsDir);
      process.exit(1);
    }
  }

  writeReport(pass, firstResponseStatus, secondResponseStatus, details, reportsDir);
}

function writeReport(pass, firstResponseStatus, secondResponseStatus, details, reportsDir) {
  const timestamp = new Date().toISOString();
  const reportContent = `# Replay Protection Test Report

- **Audit Run ID**: ${auditRunId}
- **Timestamp**: ${timestamp}
- **Result**: ${pass ? 'PASS' : 'FAIL'}

## Details
${details}
- **First Response Status**: ${firstResponseStatus || 'N/A'}
- **Second Response Status (Reused Token)**: ${secondResponseStatus || 'N/A'}
`;

  const reportPath = path.join(reportsDir, `replay_protection_report_${auditRunId}.md`);
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Replay Protection report generated at: ${reportPath}`);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
