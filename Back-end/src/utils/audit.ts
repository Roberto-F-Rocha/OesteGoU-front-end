import { prisma } from "../lib/prisma";

interface AuditParams {
  userId?: number | null;
  cityId?: number | null;
  action: "login" | "logout" | "create" | "update" | "delete" | "view" | "approve" | "reject" | "cancel" | "access" | "error";
  entity?: string;
  entityId?: string | number | null;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
}

export async function createAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        cityId: params.cityId ?? undefined,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ? String(params.entityId) : undefined,
        description: params.description,
        metadata: params.metadata,
        ipAddress: params.ipAddress ?? undefined,
        userAgent: params.userAgent ?? undefined,
        path: params.path ?? undefined,
        method: params.method ?? undefined,
        statusCode: params.statusCode ?? undefined,
      },
    });
  } catch (error) {
    console.error("Erro ao registrar auditoria:", error);
  }
}

export function getRequestAuditData(req: any, res?: any) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.headers?.["user-agent"] || null,
    path: req.originalUrl || req.url || null,
    method: req.method || null,
    statusCode: res?.statusCode || null,
  };
}
