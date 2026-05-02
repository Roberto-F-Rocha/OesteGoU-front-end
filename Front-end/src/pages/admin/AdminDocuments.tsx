import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Search } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { downloadProtectedFile, openProtectedFile } from "@/lib/protectedFile";

interface Props {
  adminCity: string;
  adminState: string;
}

interface AdminDocument {
  id: number;
  fileName: string;
  originalName?: string | null;
  type?: "student_document" | "driver_cnh" | "photo" | string;
  mimeType?: string | null;
  size?: number | null;
  createdAt?: string;
  user?: {
    id: number;
    nome: string;
    email: string;
    role: "admin" | "student" | "driver";
  } | null;
}

function formatFileSize(size?: number | null) {
  if (!size) return "Tamanho não informado";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function documentTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    student_document: "Declaração de matrícula",
    driver_cnh: "CNH",
    photo: "Foto",
  };

  return type ? labels[type] ?? type : "Documento";
}

export default function AdminDocuments({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function loadDocuments() {
    try {
      setLoading(true);
      const { data } = await api.get("/documents");
      setDocuments(data ?? []);
    } catch {
      toast({
        title: "Erro ao carregar documentos",
        description: "Não foi possível buscar os documentos enviados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return documents;

    const q = query.toLowerCase();

    return documents.filter((doc) => {
      const fileName = doc.originalName ?? doc.fileName ?? "";
      const ownerName = doc.user?.nome ?? "";
      const ownerEmail = doc.user?.email ?? "";
      const type = documentTypeLabel(doc.type);

      return (
        fileName.toLowerCase().includes(q) ||
        ownerName.toLowerCase().includes(q) ||
        ownerEmail.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q)
      );
    });
  }, [documents, query]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Documentos"
        description={`Documentos enviados pelos usuários de ${adminCity} / ${adminState}.`}
        icon={FileText}
      />

      <div className="bg-card border border-border rounded-xl p-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por usuário, e-mail, arquivo ou tipo..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Carregando documentos...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum documento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((doc) => {
                  const fileName = doc.originalName ?? doc.fileName;

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">{fileName}</p>
                            <p className="text-xs text-muted-foreground">{doc.mimeType ?? "Tipo não informado"}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="text-sm text-foreground">{doc.user?.nome ?? "Usuário não informado"}</p>
                          <p className="text-xs text-muted-foreground">{doc.user?.email ?? "E-mail não informado"}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary">{documentTypeLabel(doc.type)}</Badge>
                      </TableCell>

                      <TableCell>{formatFileSize(doc.size)}</TableCell>

                      <TableCell>
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("pt-BR") : "Não informado"}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openProtectedFile(`/documents/${doc.id}/view`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Visualizar
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadProtectedFile(`/documents/${doc.id}/download`, fileName)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Baixar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}