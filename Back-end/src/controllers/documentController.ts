import { prisma } from "../lib/prisma";

export async function getMyDocuments(req, res) {
  const userId = req.user.id;

  const documents = await prisma.userDocument.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      type: true,
      fileName: true,
      filePath: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      moderationStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.json(documents);
}
