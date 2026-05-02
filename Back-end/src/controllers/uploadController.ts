import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { validateFile, basicContentScan } from "../middlewares/uploadSecurity";
import { moderateUploadedFile } from "../services/contentModerationService";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

const uploadDir = path.resolve(process.cwd(), "uploads");

function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

function safeFileName(originalName: string) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, "-");
  return `${Date.now()}-${base}${ext}`;
}

export async function uploadDocument(req, res) {
  try {
    const user = req.user;

    await validateFile(req.file);
    basicContentScan(req.file);

    // FUTURO: moderação externa (já preparado)
    const moderation = await moderateUploadedFile(req.file);

    if (!moderation.approved) {
      return res.status(400).json({
        error: moderation.reason,
      });
    }

    ensureUploadDir();

    const fileName = safeFileName(req.file.originalname);
    const fullPath = path.join(uploadDir, fileName);
    const relativePath = `uploads/${fileName}`;

    fs.writeFileSync(fullPath, req.file.buffer);

    const doc = await prisma.userDocument.create({
      data: {
        userId: user.id,
        type: req.body.type,
        fileName: req.file.originalname,
        filePath: relativePath,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    });

    await createAuditLog({
      userId: user.id,
      cityId: user.cityId,
      action: "create",
      entity: "UserDocument",
      entityId: doc.id,
      description: "Upload de documento",
      ...getRequestAuditData(req, res),
    });

    return res.status(201).json(doc);
  } catch (err) {
    return res.status(400).json({
      error: err.message || "Erro no upload",
    });
  }
}