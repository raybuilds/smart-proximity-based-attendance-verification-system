const jwt = require("jsonwebtoken");

const config = require("../config");

function authenticate(req, res, next) {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      const error = new Error("Authorization token is required");
      error.statusCode = 401;
      throw error;
    }

    const token = authorizationHeader.split(" ")[1];
    const decodedToken = jwt.verify(token, config.jwtSecret);

    req.user = decodedToken;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      error.statusCode = 401;
      error.message = "Invalid or expired token";
    }

    next(error);
  }
}

module.exports = {
  authenticate,
};
