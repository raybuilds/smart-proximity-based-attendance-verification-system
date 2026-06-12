// backend/audit/tests/instant_classroom_spike_k6.js
// k6 script for simulating instant classroom spike (100 students within 5 seconds).

import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';
import exec from 'k6/execution';

const successRate = new Rate('success_rate');
const manifest = JSON.parse(open('../reports/active_seed_manifest.json'));

export const options = {
  scenarios: {
    classroom_spike: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 100,
      maxDuration: '5s'
    }
  },
  thresholds: {
    success_rate: ['rate>=0.99']
  }
};

export default function () {
  const backendUrl = __ENV.BACKEND_URL || 'http://localhost:5000';
  const sessionCode = __ENV.SESSION_CODE || 'SPIKTEST_SESSION';
  const nonce = __ENV.QR_NONCE || 'SPIKTEST_NONCE';
  
  // Retrieve credentials dynamically based on virtual user ID
  const studentIndex = exec.vu.idInInstance - 1;
  const student = manifest.students[studentIndex] || {};
  const token = student.proximityToken || __ENV.PROXIMITY_TOKEN || 'SPIKTEST_TOKEN';
  const jwtToken = student.token || __ENV.JWT_TOKEN || '';

  const payload = JSON.stringify({
    sessionCode: sessionCode,
    nonce: nonce,
    proximityToken: token
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    }
  };

  const res = http.post(`${backendUrl}/api/student-attendance/scan`, payload, params);

  const success = check(res, {
    'status is 200': (r) => r.status === 200
  });

  successRate.add(success);
}
