import { Request, Response, NextFunction } from "express";

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/[<>]/g, "")
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>);
  }

  return value;
}

function sanitizeObject(obj: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};

  Object.entries(obj).forEach(([key, value]) => {
    sanitized[key] = sanitizeValue(value);
  });

  return sanitized;
}

export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  if (req.params && typeof req.params === "object") {
    Object.assign(req.params, sanitizeObject(req.params));
  }

  if (req.query && typeof req.query === "object") {
    Object.assign(req.query, sanitizeObject(req.query as Record<string, unknown>));
  }

  next();
}