import { fileTypeFromBuffer } from "file-type";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export async function validateFile(file) {
  if (!file) throw new Error("Arquivo não enviado");

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Arquivo excede 5MB");
  }

  const type = await fileTypeFromBuffer(file.buffer);

  if (!type || !allowedMimeTypes.includes(type.mime)) {
    throw new Error("Tipo de arquivo não permitido");
  }

  return true;
}

export function basicContentScan(file) {
  const suspiciousPatterns = [
    "<script>",
    "<?php",
    "eval(",
    "base64,",
  ];

  const content = file.buffer.toString("utf-8");

  for (const pattern of suspiciousPatterns) {
    if (content.includes(pattern)) {
      throw new Error("Arquivo contém conteúdo suspeito");
    }
  }

  return true;
}
