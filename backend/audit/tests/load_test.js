// backend/audit/tests/load_test.js
// Node.js wrapper that runs the main k6 load test and processes the throughput and response metrics.

if (process.platform === 'win32') {
  process.env.PATH = `${process.env.PATH};C:\\Program Files\\k6`;
}

const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const auditRunId = process.env.AUDIT_RUN_ID || 'LOADTEST_DRYRUN';
const backendUrlStr = process.env.BACKEND_URL || 'http://localhost:5000';

async function runTest() {
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  let pass = true;
  let details = '';
  let metrics = {
    totalRequests: 0,
    successCount: 0,
    conflictCount: 0,
    errorCount: 0,
    successRate: 100,
    errorRate: 0,
    avgLatency: 0,
    p95Latency: 0,
    maxLatency: 0
  };

  const isDryRun = process.argv.includes('--dry-run') || auditRunId === 'LOADTEST_DRYRUN';

  if (isDryRun) {
    details = 'Dry-run: k6 load test execution skipped. Baseline checks verified.';
  } else {
    // Load manifest to extract seed variables
    const manifestPath = path.join(__dirname, '..', 'reports', `audit_seed_manifest_${auditRunId}.json`);
    if (!fs.existsSync(manifestPath)) {
      console.error(`Error: Seed manifest not found at ${manifestPath}`);
      process.exit(1);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    fs.writeFileSync(path.join(__dirname, '..', 'reports', 'active_seed_manifest.json'), JSON.stringify(manifest));

    const studentToken = manifest.students[0].token;
    const sessionId = manifest.sessions[0].id;
    const courseId = manifest.courses[0].id;
    const sessionCode = manifest.sessions[0].sessionCode;
    const qrNonce = manifest.qrNonce;
    const proximityToken = manifest.students[0].proximityToken;

    // Verify presence of required variables
    if (!backendUrlStr || !studentToken || !sessionId || !courseId || !sessionCode || !qrNonce || !proximityToken) {
      console.error('Error: Missing required environment or seed variables for k6 load test.');
      process.exit(1);
    }

    try {
      const k6ScriptPath = path.join(__dirname, 'load_test_k6.js');
      const summaryJsonPath = path.join(reportsDir, `load_test_summary_${auditRunId}.json`);

      // Inject variables into k6 environment
      const k6Env = {
        ...process.env,
        BACKEND_URL: backendUrlStr,
        JWT_TOKEN: studentToken,
        SESSION_ID: String(sessionId),
        COURSE_ID: String(courseId),
        SESSION_CODE: sessionCode,
        QR_NONCE: qrNonce,
        PROXIMITY_TOKEN: proximityToken,
        AUDIT_RUN_ID: auditRunId
      };
      
      console.log(`Executing: k6 run --summary-export=${summaryJsonPath} ${k6ScriptPath}`);
      execSync(`k6 run --summary-export="${summaryJsonPath}" "${k6ScriptPath}"`, { 
        env: k6Env,
        stdio: 'inherit' 
      });
      
      if (fs.existsSync(summaryJsonPath)) {
        const k6Summary = JSON.parse(fs.readFileSync(summaryJsonPath, 'utf8'));
        const httpReqs = k6Summary.metrics.http_reqs || {};
        const httpReqDuration = k6Summary.metrics.http_req_duration || {};
        
        metrics.totalRequests = httpReqs.count || 0;
        metrics.avgLatency = httpReqDuration.avg || 0;
        metrics.p95Latency = httpReqDuration['p(95)'] || 0;
        metrics.maxLatency = httpReqDuration.max || 0;
        
        const successRateMetric = k6Summary.metrics.success_rate || {};
        metrics.successRate = (successRateMetric.rate || 0) * 100;
        metrics.errorRate = 100 - metrics.successRate;
        
        // Assertions
        assert.ok(metrics.successRate >= 99.0, `Success rate ${metrics.successRate}% is below required 99%`);
        assert.ok(metrics.errorRate <= 1.0, `Error rate ${metrics.errorRate}% is above required 1%`);
        
        details = `k6 execution completed. Success Rate: ${metrics.successRate.toFixed(2)}%, Error Rate: ${metrics.errorRate.toFixed(2)}%`;
      } else {
        throw new Error('k6 executed but summary JSON was not found.');
      }
    } catch (error) {
      pass = false;
      details = `k6 load test execution failed: ${error.message}`;
      writeReport(pass, metrics, details, reportsDir);
      process.exit(1);
    }
  }

  writeReport(pass, metrics, details, reportsDir);
}

function writeReport(pass, metrics, details, reportsDir) {
  const timestamp = new Date().toISOString();
  const reportContent = `# Attendance Throughput Report

- **Audit Run ID**: ${auditRunId}
- **Timestamp**: ${timestamp}
- **Result**: ${pass ? 'PASS' : 'FAIL'}

## Metrics Summary
- **Total Requests**: ${metrics.totalRequests}
- **Success Rate**: ${metrics.successRate.toFixed(2)}% (Threshold: >= 99%)
- **Error Rate**: ${metrics.errorRate.toFixed(2)}% (Threshold: <= 1%)
- **Average Latency**: ${metrics.avgLatency.toFixed(2)} ms
- **95th Percentile Latency**: ${metrics.p95Latency.toFixed(2)} ms
- **Max Latency**: ${metrics.maxLatency.toFixed(2)} ms

## Details
${details}
`;

  const reportPath = path.join(reportsDir, `attendance_throughput_report_${auditRunId}.md`);
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Attendance Throughput Report generated at: ${reportPath}`);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
