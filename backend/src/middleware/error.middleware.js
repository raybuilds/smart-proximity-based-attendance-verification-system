const { isDevelopment } = require("../config");

function notFoundMiddleware(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";

  // Mask unexpected 500+ errors in production to avoid leaking sensitive data
  if (statusCode >= 500 && !isDevelopment) {
    message = "Internal server error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(isDevelopment && { stack: error.stack }),
  });
}

module.exports = {
  notFoundMiddleware,
  errorMiddleware,
};
