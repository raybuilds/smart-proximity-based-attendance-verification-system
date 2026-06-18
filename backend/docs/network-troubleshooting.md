# Network Troubleshooting Checklist

This troubleshooting guide helps diagnose and resolve mobile app connectivity issues or false-positive `Network Error` behaviors.

---

## NETWORK ERROR CHECKLIST

### 1. Verify Backend is Running
Check the status of the local server connection using your web browser or command line:
* URL: [http://localhost:5000/api/health](http://localhost:5000/api/health)
* Response should return: `"database": "connected"`

### 2. Verify Port Binding
Ensure no duplicate or orphaned processes are locking port `5000`:
* PowerShell command:
  ```powershell
  netstat -ano | findstr :5000
  ```
* If a duplicate process exists, terminate it cleanly or run:
  ```bash
  npm run dev:clean
  ```

### 3. Verify Database Readiness
Ensure the database is writable and accepting client queries:
* URL: [http://localhost:5000/api/health/ready](http://localhost:5000/api/health/ready)
* Response should return: `{"ready":true}`

### 4. Verify Expo hostUri IP Address
Dynamic IP shifts break Expo Go caches. Check the host URI logged in Metro on startup:
* Stale IP caches can be bypassed by stopping Expo and restarting with the clean start flag:
  ```bash
  npx expo start -c
  ```

### 5. Verify Wi-Fi Network Subnet
Your development computer and target mobile phone **MUST be on the same Wi-Fi subnet**.
* Ensure local client isolation is disabled in router access settings.

### 6. Disable VPN Software
Active corporate VPN connections override network routing tables, blocking mobile client HTTP requests. Disable active VPN tunnels before starting Expo Metro.

### 7. Core Test Credentials
Always use the seeded academic portal passwords for testing local dashboards:
* **Passwords**: `Password@123` (Case-sensitive)
* **Users**:
  * `teacher@attendance.local` (Teacher role)
  * `student@attendance.local` (Student role)
  * `admin@attendance.local` (Admin role)

### 8. Run Smoke Tests
Run the integrated validation checks to verify endpoints and JWT signing:
```bash
node src/scripts/smoke-test.js
```

### 9. Run Performance Audit
Query live backend resource metrics and PID status:
```bash
node src/scripts/process-audit.js
```
