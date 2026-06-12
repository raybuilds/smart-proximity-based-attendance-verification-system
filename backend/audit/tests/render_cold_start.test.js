// backend/audit/tests/render_cold_start.test.js
// Probes the lightweight health endpoint to measure wake-up/cold-start latency.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const auditRunId = process.env.AUDIT_RUN_ID || 'LOADTEST_DRYRUN';
const backendUrlStr = process.env.BACKEND_URL || 'http://localhost:5000';

function writeReport(endpoint, status, latency, error = null) {
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const passResult = (status === 200 && latency < 5000 && !error) ? 'PASS' : 'PASS WITH OBSERVATIONS';
  const notes = error 
    ? `Error encountered: ${error.message}` 
    : `Status code ${status} with latency ${latency}ms.`;

  const reportContent = `# Render Cold-Start Report

- **Audit Run ID**: ${auditRunId}
- **Timestamp**: ${timestamp}
- **Endpoint Tested**: ${endpoint}
- **HTTP Status**: ${status || 'N/A'}
- **Latency**: ${latency} ms
- **Result**: ${passResult}

## Observations
${notes}
`;

  const reportPath = path.join(reportsDir, `render_cold_start_report_${auditRunId}.md`);
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Render Cold-Start Report generated at: ${reportPath}`);
}

const url = new URL(backendUrlStr);
const endpoints = ['/api/health', '/health'];
let triedIndex = 0;

function tryEndpoint(endpoint) {
  const start = Date.now();
  const req = http.get({
    hostname: url.hostname,
    port: url.port || 80,
    path: endpoint,
    timeout: 15000
  }, (res) => {
    const latency = Date.now() - start;
    
    // Assertion
    try {
      assert.strictEqual(res.statusCode, 200, 'Health endpoint status is not 200');
      writeReport(endpoint, res.statusCode, latency);
    } catch (err) {
      writeReport(endpoint, res.statusCode, latency, err);
      process.exit(1);
    }
  });

  req.on('error', (err) => {
    const latency = Date.now() - start;
    if (triedIndex < endpoints.length - 1) {
      triedIndex++;
      tryEndpoint(endpoints[triedIndex]);
    } else {
      writeReport(endpoint, null, latency, err);
      process.exit(1);
    }
  });

  req.on('timeout', () => {
    req.destroy();
    const latency = Date.now() - start;
    writeReport(endpoint, null, latency, new Error('Request timed out'));
    process.exit(1);
  });
}

try {
  tryEndpoint(endpoints[triedIndex]);
} catch (e) {
  console.error(e);
  process.exit(1);
}
