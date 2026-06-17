// backend/audit/run_audit.js
// Orchestrator for the audit suite.
// Performs safety checks, database branching, seeding, test execution, cleanup, and report aggregation.

if (process.platform === 'win32') {
  process.env.PATH = `${process.env.PATH};C:\\Program Files\\k6`;
}

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const https = require('https');
const http = require('http');
const { generateAuditRunId } = require('./generateAuditRunId');
const { createNeonBranch, deleteNeonBranch } = require('./neonBranch');

// Generate unique Audit Run ID for this execution
const auditRunId = generateAuditRunId();
process.env.AUDIT_RUN_ID = auditRunId;

const REQUIRED_FILES = [
  'teacher_isolation.test.js',
  'session_race_condition.test.js',
  'load_test.js',
  'instant_classroom_spike.test.js',
  'render_cold_start.test.js',
  'replay_protection.test.js',
  'token_collision.test.js',
  'dashboard_consistency.test.js',
  'reporting_reliability.test.js',
  'session_closure.test.js',
  'database_integrity.test.js'
];

function getNeonEndpoints(projId, key) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'console.neon.tech',
      port: 443,
      path: `/api/v2/projects/${projId}/endpoints`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Accept': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Failed to list endpoints: ${res.statusCode} - ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function resetNeonRolePassword(projId, key, bId, roleName = 'neondb_owner') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'console.neon.tech',
      port: 443,
      path: `/api/v2/projects/${projId}/branches/${bId}/roles/${roleName}/reset_password`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Accept': 'application/json',
        'Content-Length': 0
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Failed to reset password: ${res.statusCode} - ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function switchNeonEndpointBranch(projId, key, endpointId, targetBranchId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      endpoint: {
        branch_id: targetBranchId
      }
    });
    const options = {
      hostname: 'console.neon.tech',
      port: 443,
      path: `/api/v2/projects/${projId}/endpoints/${endpointId}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Failed to switch endpoint: ${res.statusCode} - ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function startBackendServer(testEnv) {
  return new Promise((resolve, reject) => {
    console.log('\n--- STARTING BACKEND SERVER ---');
    const serverProcess = spawn('node', ['src/app.js'], {
      env: { ...testEnv, PORT: '5000' },
      cwd: path.join(__dirname, '..')
    });

    let resolved = false;
    let stdoutBuffer = '';
    let stderrBuffer = '';

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      stdoutBuffer += msg + '\n';
      console.log(`[Server Out] ${msg}`);
    });

    serverProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      stderrBuffer += msg + '\n';
      console.error(`[Server Err] ${msg}`);
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to spawn backend server:', err);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    serverProcess.on('exit', (code) => {
      console.log(`Backend server process exited with code ${code}`);
      if (!resolved) {
        resolved = true;
        reject(new Error(`Backend server exited prematurely with code ${code}. Stderr: ${stderrBuffer}`));
      }
    });

    // Poll health check endpoint
    let attempts = 0;
    const maxAttempts = 30;
    const interval = setInterval(() => {
      attempts++;
      const req = http.get('http://localhost:5000/api/health', (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          console.log('Backend server is online and healthy.');
          if (!resolved) {
            resolved = true;
            resolve(serverProcess);
          }
        } else {
          console.log(`Health check returned status ${res.statusCode}. Retrying...`);
        }
      });

      req.on('error', (err) => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          serverProcess.kill();
          if (!resolved) {
            resolved = true;
            reject(new Error(`Backend server health check failed after ${maxAttempts} attempts: ${err.message}`));
          }
        }
      });

      req.end();
    }, 500);
  });
}

async function main() {
  console.log(`Starting Audit Suite... (Audit Run ID: ${auditRunId})\n`);

  const reportsDir = path.join(__dirname, 'reports');
  const snapshotsDir = path.join(__dirname, 'snapshots');
  const testsDir = path.join(__dirname, 'tests');

  // Verify/create directories
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });

  const missingDependencies = [];
  const fileInventory = {};
  const scriptInventory = {};

  // 1. Check if k6 is installed
  try {
    execSync('k6 version', { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    missingDependencies.push('k6 command-line tool (not found on PATH)');
  }

  // 2. Check LOAD_TEST_BRANCH
  const loadTestBranch = process.env.LOAD_TEST_BRANCH;
  if (!loadTestBranch) {
    missingDependencies.push('LOAD_TEST_BRANCH environment variable (missing or empty)');
  } else {
    const forbiddenBranches = ['production', 'main', 'master', 'default', 'primary'];
    const lowerBranch = loadTestBranch.toLowerCase();
    if (forbiddenBranches.includes(lowerBranch) || !lowerBranch.startsWith('load-test-')) {
      missingDependencies.push(`LOAD_TEST_BRANCH "${loadTestBranch}" is not allowed. For security, it cannot be one of [${forbiddenBranches.join(', ')}] and must start with "load-test-".`);
    }
  }

  // 3. Check Neon branch creation requirements
  const neonProjectId = process.env.NEON_PROJECT_ID;
  const neonApiKey = process.env.NEON_API_KEY;
  if (!neonProjectId) {
    missingDependencies.push('NEON_PROJECT_ID environment variable (missing or empty)');
  }
  if (!neonApiKey) {
    missingDependencies.push('NEON_API_KEY environment variable (missing or empty)');
  }

  // 4. Check if DATABASE_URL is production
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    missingDependencies.push('DATABASE_URL environment variable (missing or empty)');
  } else {
    const lowerDbUrl = dbUrl.toLowerCase();
    if (lowerDbUrl.includes('prod') || lowerDbUrl.includes('live') || lowerDbUrl.includes('production') || lowerDbUrl.includes('main')) {
      missingDependencies.push('DATABASE_URL points to a production database (contains prod/live/production/main)');
    }
  }

  // 5. Verify required files exist
  for (const fileName of REQUIRED_FILES) {
    const filePath = path.join(testsDir, fileName);
    const exists = fs.existsSync(filePath);
    fileInventory[fileName] = exists ? 'PRESENT' : 'MISSING';
    if (!exists) {
      missingDependencies.push(`Missing required test file: tests/${fileName}`);
    }
  }

  // 6. Verify npm scripts
  try {
    const pkgJsonPath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const scripts = pkg.scripts || {};
      const expectedScripts = [
        'audit:snapshot',
        'audit:verify',
        'audit:test:id',
        'audit:test:teacher',
        'audit:test:race',
        'audit:test:load',
        'audit:test:spike',
        'audit:test:coldstart',
        'audit:test:replay',
        'audit:test:collision',
        'audit:test:dashboard',
        'audit:test:reporting',
        'audit:test:closure',
        'audit:test:integrity',
        'audit:run'
      ];
      for (const script of expectedScripts) {
        scriptInventory[script] = scripts[script] ? 'REGISTERED' : 'MISSING';
        if (!scripts[script]) {
          missingDependencies.push(`Missing package.json script: ${script}`);
        }
      }
    } else {
      missingDependencies.push('package.json not found in backend directory');
    }
  } catch (err) {
    missingDependencies.push(`Error parsing package.json: ${err.message}`);
  }

  const readinessVerdict = missingDependencies.length === 0 ? 'PASS' : 'FAIL';

  // Write Readiness Report
  const timestamp = new Date().toISOString();
  const fileInventoryMarkdown = Object.entries(fileInventory)
    .map(([file, status]) => `| \`${file}\` | ${status === 'PRESENT' ? '✅ PRESENT' : '❌ MISSING'} |`)
    .join('\n');

  const scriptInventoryMarkdown = Object.entries(scriptInventory)
    .map(([script, status]) => `| \`${script}\` | ${status === 'REGISTERED' ? '✅ REGISTERED' : '❌ MISSING'} |`)
    .join('\n');

  const readinessReportContent = `# Audit Readiness Report

- **Audit Run ID**: ${auditRunId}
- **Timestamp**: ${timestamp}
- **Readiness Verdict**: **${readinessVerdict}**

## Missing Dependencies & Safety Violations
${missingDependencies.length > 0 ? missingDependencies.map(dep => `- [ ] ${dep}`).join('\n') : '- None. All safety checks passed.'}

## File Inventory
| File Name | Status |
| :--- | :--- |
${fileInventoryMarkdown}

## NPM Script Inventory
| NPM Script | Status |
| :--- | :--- |
${scriptInventoryMarkdown}
`;
  fs.writeFileSync(path.join(reportsDir, `readiness_report_${auditRunId}.md`), readinessReportContent);

  if (readinessVerdict === 'FAIL') {
    console.error('Readiness checks failed. Safety block active.');
    process.exit(1);
  }

  console.log('Readiness checks passed. Proceeding with database branch lifecycle...');

  // Lifecycle variables
  let branchId = null;
  let branchDeleted = false;
  let auditFailed = false;
  let auditError = null;
  let serverProcess = null;
  const startTime = Date.now();

  const isDryRun = process.argv.includes('--dry-run');

  const endpointId = 'ep-misty-base-aqo6i25n';
  const originalBranchId = 'br-soft-firefly-aq2bwdso'; // Production branch to restore
  const mainBranchId = 'br-ancient-lake-aqmie01x';
  const dynamicBranchName = `load-test-${auditRunId.toLowerCase()}`;

  try {
    let testEnv = { ...process.env, AUDIT_RUN_ID: auditRunId };

    if (!isDryRun) {
      // 1. Temporarily point the endpoint to the 'main' branch to manage roles on it
      console.log(`Switching endpoint "${endpointId}" to point to main branch "${mainBranchId}"...`);
      await switchNeonEndpointBranch(neonProjectId, neonApiKey, endpointId, mainBranchId);
      console.log('Waiting 15 seconds for endpoint propagation...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      // 2. Reset neondb_owner password on main branch to get the credentials
      console.log('Obtaining neondb_owner password from main branch...');
      const pwdRes = await resetNeonRolePassword(neonProjectId, neonApiKey, mainBranchId, 'neondb_owner');
      const dbPassword = pwdRes.role.password;

      // 3. Create disposable Neon branch branching from main branch (which inherits the known password)
      console.log(`Creating disposable branch "${dynamicBranchName}"...`);
      const branchRes = await createNeonBranch(neonProjectId, neonApiKey, dynamicBranchName, mainBranchId);
      branchId = branchRes.branch.id;
      console.log(`Neon branch created successfully with ID: ${branchId}`);
      console.log('Waiting 15 seconds for branch initialization...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      // 4. Temporarily switch endpoint to point to our new branch
      console.log(`Switching endpoint "${endpointId}" to point to new branch "${branchId}"...`);
      await switchNeonEndpointBranch(neonProjectId, neonApiKey, endpointId, branchId);
      console.log('Waiting 15 seconds for endpoint propagation...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      // 5. Fetch endpoints to verify host
      console.log('Fetching endpoints to verify host...');
      const endpointsRes = await getNeonEndpoints(neonProjectId, neonApiKey);
      const endpointObj = (endpointsRes.endpoints || []).find(e => e.id === endpointId);
      const host = endpointObj.host;

      // 6. Construct DATABASE_URL with connection_limit=1
      const newDbUrl = `postgresql://neondb_owner:${dbPassword}@${host}/neondb?sslmode=require&connection_limit=1`;
      testEnv.DATABASE_URL = newDbUrl;
      console.log('DATABASE_URL redirected to target Neon branch database.');

      // 7. Deploy migrations to the branch database
      console.log('\nDeploying schema migrations to the target branch database...');
      execSync('cmd.exe /c "npx prisma migrate deploy --schema C:/Projects/AttendanceSystem/backend/prisma/schema.prisma"', {
          env: testEnv,
          stdio: 'inherit'
        });
    } else {
      branchId = `br-mock-${auditRunId.toLowerCase()}`;
      console.log(`[Dry-Run] Mock Neon branch created with ID: ${branchId}`);
    }

    // Pre-audit Snapshot
    console.log('\nStep 1: Running Pre-Audit Snapshot...');
    execSync('node audit/pre_audit_snapshot.js', { env: testEnv, stdio: 'inherit' });

    // Seed Audit Data
    console.log('\nStep 2: Seeding Audit Database Data...');
    execSync('node audit/seed_audit_data.js', { env: testEnv, stdio: 'inherit' });

    // Seed Validation Step
    console.log('\nStep 3: Running Database Seed Validation...');
    execSync('node audit/validate_seed_data.js', { env: testEnv, stdio: 'inherit' });

    // Start backend server
    if (!isDryRun) {
      serverProcess = await startBackendServer(testEnv);
    }

    // Teacher Isolation Test
    console.log('\nStep 4: Executing Teacher Isolation Test...');
    execSync('node audit/tests/teacher_isolation.test.js', { env: testEnv, stdio: 'inherit' });

    // Session Race Condition Test
    console.log('\nStep 5: Executing Session Race-Condition Test...');
    execSync('node audit/tests/session_race_condition.test.js', { env: testEnv, stdio: 'inherit' });

    // Replay Protection Test
    console.log('\nStep 6: Executing Replay Protection Test...');
    execSync('node audit/tests/replay_protection.test.js', { env: testEnv, stdio: 'inherit' });

    // Token Collision Test
    console.log('\nStep 7: Executing Token Collision Test...');
    execSync('node audit/tests/token_collision.test.js', { env: testEnv, stdio: 'inherit' });

    // Instant Classroom Spike Test
    console.log('\nStep 8: Executing Instant Classroom Spike Test...');
    execSync('node audit/tests/instant_classroom_spike.test.js', { env: testEnv, stdio: 'inherit' });

    // Main Load Test
    console.log('\nStep 9: Executing Main Load Test...');
    execSync('node audit/tests/load_test.js', { env: testEnv, stdio: 'inherit' });

    // Render Cold Start Test
    console.log('\nStep 10: Executing Render Cold-Start Test...');
    execSync('node audit/tests/render_cold_start.test.js', { env: testEnv, stdio: 'inherit' });

    // Dashboard Consistency Test
    console.log('\nStep 11: Executing Dashboard Consistency Test...');
    execSync('node audit/tests/dashboard_consistency.test.js', { env: testEnv, stdio: 'inherit' });

    // Reporting Reliability Test
    console.log('\nStep 12: Executing Reporting Reliability Test...');
    execSync('node audit/tests/reporting_reliability.test.js', { env: testEnv, stdio: 'inherit' });

    // Session Closure Test
    console.log('\nStep 13: Executing Session Closure Test...');
    execSync('node audit/tests/session_closure.test.js', { env: testEnv, stdio: 'inherit' });

    // Database Integrity Test
    console.log('\nStep 14: Executing Database Integrity Test...');
    execSync('node audit/tests/database_integrity.test.js', { env: testEnv, stdio: 'inherit' });

    // Post-Cleanup Verification
    console.log('\nStep 15: Executing Post-Cleanup Verification...');
    execSync('node audit/post_cleanup_verify.js', { env: testEnv, stdio: 'inherit' });

  } catch (error) {
    console.error('\nAudit execution encountered a critical error:', error.message);
    auditFailed = true;
    auditError = error;
  } finally {
    // ALWAYS RESTORE ENDPOINT TO PRODUCTION AND CLEANUP DISPOSABLE BRANCH
    console.log('\n--- STARTING TEARDOWN & CLEANUP ---');

    // 0. Stop backend server
    if (serverProcess) {
      console.log('Stopping backend server...');
      serverProcess.kill('SIGINT');
      console.log('Backend server stopped.');
    }

    // 1. Switch endpoint back to original production branch
    if (!isDryRun) {
      console.log(`Restoring endpoint "${endpointId}" to original branch "${originalBranchId}"...`);
      try {
        await switchNeonEndpointBranch(neonProjectId, neonApiKey, endpointId, originalBranchId);
        console.log('Endpoint restored successfully.');
      } catch (restoreErr) {
        console.error('CRITICAL: Failed to restore endpoint to original branch:', restoreErr.message);
      }
    }

    // 2. Delete temporary branch
    let deletionResult = 'N/A';
    if (branchId && !isDryRun) {
      console.log(`Deleting temporary branch "${branchId}"...`);
      try {
        await deleteNeonBranch(neonProjectId, neonApiKey, branchId);
        branchDeleted = true;
        deletionResult = 'SUCCESS';
        console.log('Temporary branch deleted.');
      } catch (err) {
        deletionResult = `FAILED: ${err.message}`;
        console.error('Failed to delete Neon branch:', err.message);
      }
    } else {
      branchDeleted = true;
      deletionResult = 'DRY_RUN_MOCK_SUCCESS';
    }

    const cleanupDuration = Date.now() - startTime;

    // Generate branch cleanup report
    const cleanupReportContent = `# Branch Cleanup Report

- **Audit Run ID**: ${auditRunId}
- **Branch Created**: ${dynamicBranchName}
- **Branch ID**: ${branchId}
- **Branch Deleted**: ${branchDeleted ? 'YES' : 'NO'}
- **Deletion Result**: ${deletionResult}
- **Cleanup Duration**: ${cleanupDuration} ms
`;
    const cleanupReportPath = path.join(reportsDir, `branch_cleanup_report_${auditRunId}.md`);
    fs.writeFileSync(cleanupReportPath, cleanupReportContent);
    console.log(`Branch cleanup report generated at: ${cleanupReportPath}`);

    // If audit execution failed, exit non-zero now after completing teardown
    if (auditFailed) {
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error during orchestrator runtime:', err);
  process.exit(1);
});
