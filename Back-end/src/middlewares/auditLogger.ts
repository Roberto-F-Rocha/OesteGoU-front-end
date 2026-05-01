import { createAuditLog, getRequestAuditData } from "../utils/audit";

export function auditLogger(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", async () => {
    const user = req.user;
    const isRead = req.method === "GET";
    const isError = res.statusCode >= 400;

    await createAuditLog({
      userId: user?.id ?? null,
      cityId: user?.cityId ?? null,
      action: isError ? "error" : isRead ? "view" : "access",
      entity: "http_request",
      description: `${req.method} ${req.originalUrl}`,
      metadata: {
        durationMs: Date.now() - startedAt,
        query: req.query,
        params: req.params,
      },
      ...getRequestAuditData(req, res),
    });
  });

  next();
}
