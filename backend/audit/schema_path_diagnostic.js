// backend/audit/schema_path_diagnostic.js
// Verify Prisma schema path resolution and capture Prisma version + migration attempt.

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

(async () => {
  const reportsDir = path.join(__dirname, 'diagnostic_reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const auditRunId = process.env.AUDIT_RUN_ID || ('DIAG_' + Date.now());
  const relativeSchemaPath = '../prisma/schema.prisma';
  const cwd = process.cwd();
  const resolvedSchemaPath = path.resolve(relativeSchemaPath);
  const fileExists = fs.existsSync(resolvedSchemaPath);

  const report = {
    auditRunId,
    cwd,
    relativeSchemaPath,
    resolvedSchemaPath,
    fileExists,
    prismaVersion: null,
    migration: {
      stdout: null,
      stderr: null,
      exitCode: null,
      errorStack: null
    },
    errors: []
  };

  // Capture Prisma version
  try {
    const versionOut = execSync('npx prisma --version', { stdio: ['ignore', 'pipe', 'pipe'] });
    report.prismaVersion = versionOut.toString().trim();
  } catch (e) {
    report.prismaVersion = e.stdout?.toString() || e.stderr?.toString() || null;
    report.errors.push('Failed to get Prisma version: ' + (e.message || e));
  }

  // If schema file missing, write report and exit early.
  if (!fileExists) {
    const reportPath = path.join(reportsDir, `schema_path_diagnostic_${auditRunId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.error('Schema file does not exist at resolved path. Diagnostic report written to', reportPath);
    process.exit(1);
  }

  // Attempt migration capture
  try {
    const out = execSync('npx prisma migrate deploy --schema "../prisma/schema.prisma"', {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    report.migration.stdout = out.toString();
    report.migration.exitCode = 0;
  } catch (e) {
    report.migration.stdout = e.stdout?.toString() || '';
    report.migration.stderr = e.stderr?.toString() || '';
    report.migration.exitCode = e.status;
    report.migration.errorStack = e.stack;
    report.errors.push('Migration command failed');
  }

  const reportPath = path.join(reportsDir, `schema_path_diagnostic_${auditRunId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('Schema path diagnostic written to', reportPath);
})();
