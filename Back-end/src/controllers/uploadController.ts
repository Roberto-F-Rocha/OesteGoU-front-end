import { prisma } from "../lib/prisma";
import { validateFile, basicContentScan } from "../middlewares/uploadSecurity";

export async function uploadDocument(req, res) {
  try {
    const user = req.user;

    await validateFile(req.file);
    basicContentScan(req.file);

    const doc = await prisma.userDocument.create({
      data: {
        userId: user.id,
        type: req.body.type,
        fileName: req.file.originalname,
        filePath: `uploads/${Date.now()}-${req.file.originalname}`,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    });

    return res.json(doc);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}