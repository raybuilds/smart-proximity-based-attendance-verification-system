const { isDevelopment } = require("../config");

function notFoundMiddleware(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
    ...(isDevelopment && { stack: error.stack }),
  });
}

module.exports = {
  notFoundMiddleware,
  errorMiddleware,
};
