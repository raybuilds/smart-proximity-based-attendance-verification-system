// backend/audit/tests/load_test_k6.js
// k6 script for simulating classroom load (concurrent students scanning QR).

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import exec from 'k6/execution';

const successRate = new Rate('success_rate');
const manifest = JSON.parse(open('../reports/active_seed_manifest.json'));

export const options = {
  stages: [
    { duration: '15s', target: 50 }, // ramp up to 50 users
    { duration: '15s', target: 100 }, // ramp up to 100 users
    { duration: '5s', target: 0 }    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests must complete below 1000ms
    success_rate: ['rate>=0.99']       // success rate >= 99%
  }
};

export default function () {
  const backendUrl = __ENV.BACKEND_URL || 'http://localhost:5000';
  const sessionCode = __ENV.SESSION_CODE || 'LOADTEST_SESSION';
  const nonce = __ENV.QR_NONCE || 'LOADTEST_NONCE';

  // Retrieve credentials dynamically based on virtual user ID
  const studentIndex = (exec.vu.idInInstance - 1) % 100;
  const student = manifest.students[studentIndex] || {};
  const token = student.proximityToken || __ENV.PROXIMITY_TOKEN || 'LOADTEST_TOKEN';
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
    'status is 200 or 409': (r) => r.status === 200 || r.status === 409
  });

  successRate.add(success);
  sleep(0.5);
}
