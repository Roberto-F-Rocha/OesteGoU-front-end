import { prisma } from "../lib/prisma";
import { validateFile, basicContentScan } from "../middlewares/uploadSecurity";
import { moderateUploadedFile } from "../services/contentModerationService";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

const allowedDocumentTypes = ["profile_photo", "enrollment_proof", "driver_license", "general"];

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

    const doc = await prisma.userDocument.create({
      data: {
        userId: user.id,
        type,
        fileName: req.file.originalname,
        fileData: req.file.buffer,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        status: type === "profile_photo" ? "approved" : "pending",
        moderationStatus: moderation.provider === "external" ? "approved" : "not_required",
      },
    });

    if (type === "profile_photo") {
      await prisma.user.update({
        where: { id: user.id },
        data: { photo: `db:${doc.id}` },
      });
    }

    await createAuditLog({
      userId: user.id,
      cityId: user.cityId,
      action: "create",
      entity: "UserDocument",
      entityId: doc.id,
      description: "Upload de documento (banco)",
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
