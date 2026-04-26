import jwt from "jsonwebtoken";

export function signAccessToken(user: any) {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) throw new Error("JWT_ACCESS_SECRET não definido");

  return jwt.sign(
    { id: user.id, role: user.role },
    secret,
    { expiresIn: "15m" }
  );
}

export function signRefreshToken(user: any) {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) throw new Error("JWT_REFRESH_SECRET não definido");

  return jwt.sign(
    { id: user.id },
    secret,
    { expiresIn: "7d" }
  );
}