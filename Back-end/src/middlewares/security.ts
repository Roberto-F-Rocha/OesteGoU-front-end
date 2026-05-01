import rateLimit from "express-rate-limit";
import helmet from "helmet";

export const securityMiddleware = helmet();

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Muitas tentativas de login. Tente novamente mais tarde.",
  },
});
