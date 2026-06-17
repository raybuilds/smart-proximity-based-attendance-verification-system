// backend/audit/run_token_collision_diagnostic.js
// Diagnostic runner for token_collision.test.js – migration failure capture.
// Stops after migration step if it fails and writes migration_diagnostic_<auditRunId>.json.

const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');

(async () => {
  const reportsDir = path.join(__dirname, 'diagnostic_reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  // Load env vars from .env if present.
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

  const { createNeonBranch, deleteNeonBranch } = require('./neonBranch');
  const auditRunId = process.env.AUDIT_RUN_ID || ('DIAG_' + Date.now());

  // Minimal Neon helper implementations (copied from run_audit.js)
  const https = require('https');
  async function getNeonEndpoints(projId, key) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'console.neon.tech',
        port: 443,
        path: `/api/v2/projects/${projId}/endpoints`,
        method: 'GET',
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(body));
          else reject(new Error(`Failed to list endpoints: ${res.statusCode} - ${body}`));
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  async function resetNeonRolePassword(projId, key, branchId, roleName = 'neondb_owner') {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'console.neon.tech',
        port: 443,
        path: `/api/v2/projects/${projId}/branches/${branchId}/roles/${roleName}/reset_password`,
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', 'Content-Length': 0 }
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(body));
          else reject(new Error(`Failed to reset password: ${res.statusCode} - ${body}`));
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  async function switchNeonEndpointBranch(projId, key, endpointId, targetBranchId) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ endpoint: { branch_id: targetBranchId } });
      const options = {
        hostname: 'console.neon.tech',
        port: 443,
        path: `/api/v2/projects/${projId}/endpoints/${endpointId}`,
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          Accept: 'application/json'
        }
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(body));
          else reject(new Error(`Failed to switch endpoint: ${res.statusCode} - ${body}`));
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  const neonProjectId = process.env.NEON_PROJECT_ID;
  const neonApiKey = process.env.NEON_API_KEY;
  const endpointId = 'ep-misty-base-aqo6i25n';
  const mainBranchId = 'br-ancient-lake-aqmie01x';
  const originalBranchId = 'br-soft-firefly-aq2bwdso'; // Production branch to restore later
  const dynamicBranchName = `diag-${auditRunId.toLowerCase()}`;

  let branchId = null;
  const report = {
    auditRunId,
    branchId: null,
    branchName: dynamicBranchName,
    endpointId,
    schemaPath: path.resolve(__dirname, '../prisma/schema.prisma'),
    cwd: process.cwd(),
    databaseUrlHost: null,
    migration: {
      exitCode: null,
      stdout: null,
      stderr: null,
      errorMessage: null
    },
    errors: []
  };

  const testEnv = { ...process.env, AUDIT_RUN_ID: auditRunId };
  try {
    console.log('Using existing DATABASE_URL for diagnostic run.');

    // ----- Neon branch setup -----
    console.log('Switching endpoint to main branch to reset password...');
    await switchNeonEndpointBranch(neonProjectId, neonApiKey, endpointId, mainBranchId);
    await new Promise(r => setTimeout(r, 15000));
    const pwdRes = await resetNeonRolePassword(neonProjectId, neonApiKey, mainBranchId, 'neondb_owner');
    const dbPassword = pwdRes.role.password;

    console.log('Creating disposable Neon branch...');
    const branchRes = await createNeonBranch(neonProjectId, neonApiKey, dynamicBranchName, mainBranchId);
    branchId = branchRes.branch.id;
    report.branchId = branchId;
    await new Promise(r => setTimeout(r, 15000));

    console.log('Switching endpoint to disposable branch...');
    await switchNeonEndpointBranch(neonProjectId, neonApiKey, endpointId, branchId);
    await new Promise(r => setTimeout(r, 15000));

    const endpointsRes = await getNeonEndpoints(neonProjectId, neonApiKey);
    const endpointObj = (endpointsRes.endpoints || []).find(e => e.id === endpointId);
    const host = endpointObj.host;
    report.databaseUrlHost = host;
    const newDbUrl = `postgresql://neondb_owner:${dbPassword}@${host}/neondb?sslmode=require&connection_limit=1`;
    testEnv.DATABASE_URL = newDbUrl;

    // ---------- Migration step with detailed capture ----------
    console.log('Running Prisma migrate deploy...');
    try {
      const out = execSync(`cmd.exe /c "npx prisma migrate deploy --schema ${report.schemaPath}"`, {
        env: testEnv,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      report.migration.stdout = out.toString();
      report.migration.exitCode = 0;
    } catch (e) {
      report.migration.stdout = e.stdout?.toString() || '';
      report.migration.stderr = e.stderr?.toString() || '';
      report.migration.exitCode = e.status;
      report.migration.errorMessage = e.message;
      // Write migration diagnostic report and abort further steps
      const migrationReportPath = path.join(reportsDir, `migration_diagnostic_${auditRunId}.json`);
      fs.writeFileSync(migrationReportPath, JSON.stringify(report, null, 2), 'utf8');
      console.error('Migration failed – diagnostic report written to', migrationReportPath);
      // Cleanup before exit
      try {
        console.log('Restoring endpoint to original branch...');
        await switchNeonEndpointBranch(neonProjectId, neonApiKey, endpointId, originalBranchId);
        await new Promise(r => setTimeout(r, 15000));
      } catch (restoreErr) {
        report.errors.push('Endpoint restoration failed: ' + (restoreErr.message || restoreErr));
      }
      if (branchId) {
        try {
          await deleteNeonBranch(neonProjectId, neonApiKey, branchId);
          console.log('Diagnostic branch deleted.');
        } catch (delErr) {
          report.errors.push('Branch deletion failed: ' + (delErr.message || delErr));
        }
      }
      // Write final report (including cleanup status)
      fs.writeFileSync(migrationReportPath, JSON.stringify(report, null, 2), 'utf8');
      process.exit(1);
    }
    // If migration succeeded (unlikely given prior failure) we would continue – but per request we stop here.
    console.log('Migration succeeded – no diagnostic needed.');
    // Seed audit data before running token collision test
    console.log('Seeding audit data...');
    try {
      execSync('node ' + path.join(__dirname, 'seed_audit_data.js'), { env: testEnv, stdio: 'inherit' });
    } catch (seedErr) {
      console.error('Audit data seeding failed:', seedErr);
      // Abort further steps
      process.exit(1);
    }
    // Run token collision test after seeding
    console.log('Running token collision test...');
    try {
      const testOut = execSync(`node ${path.join(__dirname, 'tests', 'token_collision.test.js')}`, { env: testEnv, stdio: 'inherit' });
    } catch (testErr) {
      console.error('Token collision test failed:', testErr);
    }
  } catch (err) {
    console.error('Unexpected error in diagnostic runner:', err);
    report.errors.push(err.message || String(err));
    const migrationReportPath = path.join(reportsDir, `migration_diagnostic_${auditRunId}.json`);
    fs.writeFileSync(migrationReportPath, JSON.stringify(report, null, 2), 'utf8');
    process.exit(1);
  }
})();
