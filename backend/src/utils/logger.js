function info(message) {
  console.log(`[INFO] ${message}`);
}

function success(message) {
  console.log(`[SUCCESS] ${message}`);
}

function error(message, details) {
  if (details) {
    console.error(`[ERROR] ${message}`, details);
    return;
  }

  console.error(`[ERROR] ${message}`);
}

module.exports = {
  info,
  success,
  error,
};
