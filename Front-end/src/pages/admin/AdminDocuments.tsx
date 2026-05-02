// SOMENTE TRECHOS ALTERADOS

import { openProtectedFile, downloadProtectedFile, getProtectedFileObjectUrl } from "@/lib/protectedFile";

// substituir botões

<Button size="sm" variant="outline" onClick={() => openProtectedFile(`/documents/${doc.id}/view`)}>
  <Eye className="w-4 h-4 mr-1" /> Visualizar
</Button>

<Button size="sm" variant="outline" onClick={() => downloadProtectedFile(`/documents/${doc.id}/download`, doc.fileName)}>
  <Download className="w-4 h-4 mr-1" /> Baixar
</Button>

// substituir preview IMG e PDF

<img src={await getProtectedFileObjectUrl(`/documents/${preview.id}/view`)} ... />

// OU usar useEffect para carregar
