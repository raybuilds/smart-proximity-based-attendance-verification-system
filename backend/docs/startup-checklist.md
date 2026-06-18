# Developer Startup Checklist

Follow these steps deterministically to bring up the Attendance Verification System locally in development:

## 1. Start PostgreSQL Database
Ensure your PostgreSQL database service is running locally on port `5432` with database context `postgres` (or as configured in `.env`).
```bash
# Verify connection target in backend/.env
DATABASE_URL="postgresql://postgres@127.0.0.1:5432/postgres"
```

## 2. Start Backend Server
Navigate to the `backend` directory, terminate background ghost processes, and launch the server:
```bash
cd backend
npm run dev:clean
```
You should see:
```text
[BOOT]
PID: <PROCESS_ID>
PORT: 5000
ENV: development
DATABASE: connected
```

## 3. Verify Server Status
Run the smoke test checking tool to ensure API routing and DB validation:
```bash
npm run health-check
```
Both `/api/health` and `/api/ready` should return **PASS** status.

## 4. Run Mobile Application
Start Metro Bundler clearing the development bundle caching:
```bash
cd mobile
npx expo start -c
```
Launch on iOS Simulator, Android Emulator, or scan the QR code via Expo Go on physical devices (ensure you are on the same Wi-Fi/local network subnet).

## 5. Login
Access the dashboards using the default seeded demo credentials:
* **Teacher Login**: `teacher@attendance.local` / `Password@123`
* **Student Login**: `student@attendance.local` / `Password@123`
* **Admin Login**: `admin@attendance.local` / `Password@123`
