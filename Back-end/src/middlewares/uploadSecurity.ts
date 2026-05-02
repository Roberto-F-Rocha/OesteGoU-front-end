const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

function hasAllowedExtension(fileName = "") {
  const lower = fileName.toLowerCase();
  return allowedExtensions.some((ext) => lower.endsWith(ext));
}

export async function validateFile(file) {
  if (!file) throw new Error("Arquivo não enviado");

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Arquivo excede 8MB");
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error("Tipo de arquivo não permitido. Envie PDF, PNG, JPG, JPEG ou WEBP.");
  }

  if (!hasAllowedExtension(file.originalname)) {
    throw new Error("Extensão de arquivo não permitida. Envie PDF, PNG, JPG, JPEG ou WEBP.");
  }

  return true;
}

export function basicContentScan(file) {
  if (file.mimetype === "application/pdf") return true;

  const suspiciousPatterns = ["<script>", "<?php", "eval(", "base64,"];
  const content = file.buffer.toString("utf-8").toLowerCase();

  for (const pattern of suspiciousPatterns) {
    if (content.includes(pattern.toLowerCase())) {
      throw new Error("Arquivo contém conteúdo suspeito");
    }
  }

  return true;
}
