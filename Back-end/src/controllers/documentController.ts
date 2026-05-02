import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

function documentLabel(type) {
  const labels = {
    profile_photo: "foto de perfil",
    enrollment_proof: "comprovante de matrícula",
    driver_license: "CNH",
    general: "documento geral",
  };
  return labels[type] ?? "documento";
}

async function notifyUser(userId, title, message, type = "info", metadata = {}) {
  return prisma.notification.create({ data: { userId, title, message, type, metadata } });
}

function ensureAdmin(req, res) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Acesso permitido apenas para administradores" });
    return false;
  }
  return true;
}

function canAccessDocument(req, document) {
  const cityIds = req.allowedCities ?? [req.user.cityId];
  const isOwner = document.userId === req.user.id;
  const isAdminAllowed = req.user.role === "admin" && document.user?.cityId && cityIds.includes(document.user.cityId);
  return isOwner || isAdminAllowed;
}

function sendDocumentFile(res, document, inline = false) {
  if (document.fileData) {
    const buffer = Buffer.isBuffer(document.fileData) ? document.fileData : Buffer.from(document.fileData);
    res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(document.fileName)}"`);
    return res.send(buffer);
  }

  if (document.filePath) {
    const absolutePath = path.resolve(process.cwd(), document.filePath);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: "Arquivo físico não encontrado" });
    if (inline) {
      res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(document.fileName)}"`);
      return fs.createReadStream(absolutePath).pipe(res);
    }
    return res.download(absolutePath, document.fileName);
  }

  return res.status(404).json({ error: "Arquivo não encontrado no banco" });
}

export async function getMyDocuments(req, res) {
  const userId = req.user.id;

  const documents = await prisma.userDocument.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      fileName: true,
      filePath: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      moderationStatus: true,
      moderationReason: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.json(documents);
}

export async function listAdminDocuments(req, res) {
  if (!ensureAdmin(req, res)) return;
  const cityIds = req.allowedCities ?? [req.user.cityId];
  const { status, type } = req.query;

  const documents = await prisma.userDocument.findMany({
    where: {
      user: { cityId: { in: cityIds } },
      ...(status ? { status: String(status) } : {}),
      ...(type ? { type: String(type) } : {}),
    },
    include: {
      user: { select: { id: true, nome: true, email: true, role: true, cityId: true, city: true } },
      reviewedBy: { select: { id: true, nome: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return res.json(documents);
}

export async function reviewDocument(req, res) {
  if (!ensureAdmin(req, res)) return;
  const id = Number(req.params.id);
  const { status, reason } = req.body;
  const cityIds = req.allowedCities ?? [req.user.cityId];

  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "Status inválido" });

  const document = await prisma.userDocument.findUnique({ where: { id }, include: { user: true } });
  if (!document || !document.user.cityId || !cityIds.includes(document.user.cityId)) return res.status(404).json({ error: "Documento não encontrado" });

  const updated = await prisma.userDocument.update({
    where: { id },
    data: {
      status,
      moderationReason: status === "rejected" ? reason || "Documento rejeitado pela administração" : null,
      reviewedById: req.user.id,
      reviewedAt: new Date(),
    },
    include: {
      user: { select: { id: true, nome: true, email: true, role: true, cityId: true, city: true } },
      reviewedBy: { select: { id: true, nome: true, email: true } },
    },
  });

  if (status === "approved" && document.type === "profile_photo") {
    await prisma.user.update({ where: { id: document.userId }, data: { photo: document.fileData ? `db:${document.id}` : document.filePath } });
  }

  await notifyUser(
    document.userId,
    status === "approved" ? "Documento aprovado" : "Documento rejeitado",
    status === "approved" ? `Seu ${documentLabel(document.type)} foi aprovado pela administração.` : `Seu ${documentLabel(document.type)} foi rejeitado. ${reason ? `Motivo: ${reason}` : "Envie um novo arquivo para análise."}`,
    status === "approved" ? "success" : "warning",
    { documentId: document.id, documentType: document.type, status },
  );

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: status === "approved" ? "approve" : "reject",
    entity: "UserDocument",
    entityId: id,
    description: status === "approved" ? "Documento aprovado" : "Documento rejeitado",
    metadata: { documentId: id, documentType: document.type, reason },
    ...getRequestAuditData(req, res),
  });

  return res.json(updated);
}

export async function downloadDocument(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });

  const document = await prisma.userDocument.findUnique({ where: { id }, include: { user: true } });
  if (!document) return res.status(404).json({ error: "Documento não encontrado" });
  if (!canAccessDocument(req, document)) return res.status(403).json({ error: "Acesso negado" });

  return sendDocumentFile(res, document, false);
}

export async function viewDocument(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });

  const document = await prisma.userDocument.findUnique({ where: { id }, include: { user: true } });
  if (!document) return res.status(404).json({ error: "Documento não encontrado" });
  if (!canAccessDocument(req, document)) return res.status(403).json({ error: "Acesso negado" });

  return sendDocumentFile(res, document, true);
}
