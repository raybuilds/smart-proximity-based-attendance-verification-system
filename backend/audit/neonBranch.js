// backend/audit/neonBranch.js
// Utility to handle database branching on Neon console.
// Handles creation, listing, and deletion of branches for isolated run lifecycles.

const https = require('https');

async function createNeonBranch(projectId, apiKey, branchName, parentBranch = 'main') {
  if (!projectId || !apiKey) {
    throw new Error('Neon Project ID and API Key are required to create a database branch.');
  }

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      branch: {
        name: branchName,
        parent_id: parentBranch
      }
    });

    const options = {
      hostname: 'console.neon.tech',
      port: 443,
      path: `/api/v2/projects/${projectId}/branches`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Failed to parse Neon API response: ${body}`));
          }
        } else {
          reject(new Error(`Neon API returned status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

async function listNeonBranches(projectId, apiKey) {
  if (!projectId || !apiKey) {
    throw new Error('Neon Project ID and API Key are required to list database branches.');
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'console.neon.tech',
      port: 443,
      path: `/api/v2/projects/${projectId}/branches`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Failed to parse Neon API list response: ${body}`));
          }
        } else {
          reject(new Error(`Neon API returned status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function deleteNeonBranch(projectId, apiKey, branchId) {
  if (!projectId || !apiKey || !branchId) {
    throw new Error('Neon Project ID, API Key, and Branch ID are required to delete a branch.');
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'console.neon.tech',
      port: 443,
      path: `/api/v2/projects/${projectId}/branches/${branchId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            resolve({ success: true, message: 'Branch deleted successfully.' });
          }
        } else {
          reject(new Error(`Neon API returned status ${res.statusCode} on deletion: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

module.exports = { createNeonBranch, listNeonBranches, deleteNeonBranch };
