const { z } = require("zod");

const qrService = require("./qr.service");

const sessionParamsSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
});

async function getCurrentQr(req, res, next) {
  try {
    const { sessionId } = sessionParamsSchema.parse(req.params);
    const qr = await qrService.getCurrentQrForSession(sessionId, req.user.sub);

    res.status(200).json({
      success: true,
      qr: {
        nonce: qr.nonce,
        expiresAt: qr.expiresAt,
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      error.statusCode = 400;
      error.message = error.issues[0]?.message || "Invalid session id";
    }

    next(error);
  }
}

module.exports = {
  getCurrentQr,
};
