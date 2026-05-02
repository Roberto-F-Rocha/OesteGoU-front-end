import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { validateFile, basicContentScan } from "../middlewares/uploadSecurity";
import { moderateUploadedFile } from "../services/contentModerationService";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

const uploadDir = path.resolve(process.cwd(), "uploads");
const allowedDocumentTypes = ["profile_photo", "enrollment_proof", "driver_license", "general"];

function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

function safeFileName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, "-");
  return `${Date.now()}-${base}${ext}`;
}

export async function uploadDocument(req, res) {
  try {
    const user = req.user;
    const type = req.body?.type || "general";

    if (!allowedDocumentTypes.includes(type)) {
      return res.status(400).json({ error: "Tipo de documento inválido" });
    }

    await validateFile(req.file);
    basicContentScan(req.file);

    const moderation = await moderateUploadedFile(req.file);

    if (!moderation.approved) {
      await createAuditLog({
        userId: user.id,
        cityId: user.cityId,
        action: "reject",
        entity: "UserDocument",
        description: moderation.reason || "Upload reprovado",
        metadata: { type, provider: moderation.provider },
        ...getRequestAuditData(req, res),
      });

      return res.status(400).json({ error: moderation.reason || "Arquivo reprovado" });
    }

    ensureUploadDir();

    const fileName = safeFileName(req.file.originalname);
    const fullPath = path.join(uploadDir, fileName);
    const relativePath = `uploads/${fileName}`;

    fs.writeFileSync(fullPath, req.file.buffer);

    const doc = await prisma.userDocument.create({
      data: {
        userId: user.id,
        type,
        fileName: req.file.originalname,
        filePath: relativePath,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        status: type === "profile_photo" ? "approved" : "pending",
        moderationStatus: moderation.provider === "external" ? "approved" : "not_required",
      },
    });

    if (type === "profile_photo") {
      await prisma.user.update({
        where: { id: user.id },
        data: { photo: relativePath },
      });
    }

    await createAuditLog({
      userId: user.id,
      cityId: user.cityId,
      action: "create",
      entity: "UserDocument",
      entityId: doc.id,
      description: "Upload de documento",
      metadata: { type, sizeBytes: req.file.size },
      ...getRequestAuditData(req, res),
    });

    return res.status(201).json(doc);
  } catch (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : "Erro no upload",
    });
  }
}
