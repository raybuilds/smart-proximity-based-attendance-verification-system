// backend/audit/generateAuditRunId.js
// Cryptographically secure Audit Run ID generator with uniform character distribution.
// Format: LOADTEST_YYYYMMDD_XXXXXX where X is an uppercase alphanumeric character.

const crypto = require('crypto');
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ALPHABET_LENGTH = ALPHABET.length;
// Largest multiple of ALPHABET_LENGTH less than 256 to avoid modulo bias.
const MAX_VALID_BYTE = Math.floor(256 / ALPHABET_LENGTH) * ALPHABET_LENGTH; // 252 for length 36

function generateAuditRunId() {
  // Get current date in UTC as YYYYMMDD
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;

  let id = '';
  while (id.length < 6) {
    // Generate enough random bytes; 6 bytes per loop is sufficient.
    const bytes = crypto.randomBytes(6);
    for (const byte of bytes) {
      if (byte >= MAX_VALID_BYTE) {
        // Reject biased byte, continue to next byte.
        continue;
      }
      const idx = byte % ALPHABET_LENGTH;
      id += ALPHABET[idx];
      if (id.length === 6) break;
    }
  }
  return `LOADTEST_${datePart}_${id}`;
}

module.exports = { generateAuditRunId };
