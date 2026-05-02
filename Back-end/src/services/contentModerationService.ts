type ModerationResult = {
  approved: boolean;
  reason?: string;
  provider: "local" | "external";
  categories?: Record<string, unknown>;
};

const EXTERNAL_MODERATION_URL = process.env.CONTENT_MODERATION_URL;
const EXTERNAL_MODERATION_API_KEY = process.env.CONTENT_MODERATION_API_KEY;

function scanBufferForEmbeddedPayload(buffer: Buffer) {
  const content = buffer.toString("utf8").toLowerCase();

  const blockedPatterns = [
    "<script",
    "javascript:",
    "<?php",
    "eval(",
    "document.cookie",
    "onerror=",
    "onload=",
  ];

  const found = blockedPatterns.find((pattern) => content.includes(pattern));

  if (found) {
    return {
      approved: false,
      reason: `Arquivo contém padrão suspeito: ${found}`,
      provider: "local" as const,
    };
  }

  return null;
}

async function callExternalModeration(file: Express.Multer.File): Promise<ModerationResult | null> {
  if (!EXTERNAL_MODERATION_URL) return null;

  const response = await fetch(EXTERNAL_MODERATION_URL, {
    method: "POST",
    headers: {
      "Content-Type": file.mimetype,
      ...(EXTERNAL_MODERATION_API_KEY
        ? { Authorization: `Bearer ${EXTERNAL_MODERATION_API_KEY}` }
        : {}),
    },
    body: file.buffer,
  });

  if (!response.ok) {
    return {
      approved: false,
      reason: "Falha na análise externa de conteúdo",
      provider: "external",
    };
  }

  const result = await response.json();

  const isUnsafe = Boolean(
    result.unsafe ||
      result.sexual ||
      result.nudity ||
      result.violence ||
      result.hate ||
      result.self_harm ||
      result.malware ||
      result.blocked
  );

  if (isUnsafe) {
    return {
      approved: false,
      reason: "Arquivo reprovado pela análise de conteúdo",
      provider: "external",
      categories: result,
    };
  }

  return {
    approved: true,
    provider: "external",
    categories: result,
  };
}

export async function moderateUploadedFile(file: Express.Multer.File): Promise<ModerationResult> {
  const localScan = scanBufferForEmbeddedPayload(file.buffer);

  if (localScan) return localScan;

  const externalResult = await callExternalModeration(file);

  if (externalResult) return externalResult;

  return {
    approved: true,
    provider: "local",
  };
}
