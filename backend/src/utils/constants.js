const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN: "admin",
};

const APP = {
  NAME: "Smart Proximity-Based Attendance Verification System",
  API_PREFIX: "/api",
  DEFAULT_PORT: 5000,
};

const QR = {
  EXPIRY_MS: 15000,
  NONCE_LENGTH: 16,
};

const WIFI = {
  DEMO_SSID: "ATTENDANCE_TEACHER",
  DEMO_BSSID: "AA:BB:CC:DD:EE:FF",
  MIN_RSSI: -70,
};

module.exports = {
  HTTP_STATUS,
  ROLES,
  APP,
  QR,
  WIFI,
};
