const { HTTP_STATUS } = require("../utils/constants");

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user?.role) {
      const error = new Error("Authenticated user role is required");
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      return next(error);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error("You do not have permission to access this resource");
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      return next(error);
    }

    next();
  };
}

module.exports = {
  requireRole,
};
