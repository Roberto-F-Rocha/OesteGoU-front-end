import { api } from "@/lib/api";

export async function openProtectedFile(url: string) {
  const response = await api.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(response.data);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export async function downloadProtectedFile(url: string, fileName: string) {
  const response = await api.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName || "documento";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

export async function getProtectedFileObjectUrl(url: string) {
  const response = await api.get(url, { responseType: "blob" });
  return URL.createObjectURL(response.data);
}
