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
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  adminCity?: string;
  adminState?: string;
}

interface AdminDocument {
  id: number;
  fileName: string;
  filePath?: string | null;
  type?: "profile_photo" | "enrollment_proof" | "driver_license" | "general" | string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  status?: "pending" | "approved" | "rejected" | string;
  moderationStatus?: string | null;
  moderationReason?: string | null;
  createdAt?: string;
  user?: {
    id: number;
    nome: string;
    email: string;
    role: "admin" | "student" | "driver";
    city?: { name: string; state: string } | null;
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
    profile_photo: "Foto de perfil",
    enrollment_proof: "Comprovante de matrícula",
    driver_license: "CNH",
    general: "Documento geral",
  };

  return type ? labels[type] ?? type : "Documento";
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
  };

  return status ? labels[status] ?? status : "Pendente";
}

export default function AdminDocuments({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const cityName = adminCity ?? user?.city?.name;
  const stateName = adminState ?? user?.city?.state;

  async function loadDocuments() {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/documents");
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar documentos",
        description:
          error?.response?.status === 403
            ? "Seu usuário não tem permissão ou não possui cidade vinculada para acessar os documentos."
            : error?.response?.status === 401
              ? "Sua sessão expirou. Faça login novamente."
              : "Não foi possível buscar os documentos enviados.",
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
      const fileName = doc.fileName ?? "";
      const ownerName = doc.user?.nome ?? "";
      const ownerEmail = doc.user?.email ?? "";
      const type = documentTypeLabel(doc.type);
      const city = doc.user?.city?.name ?? "";

      return (
        fileName.toLowerCase().includes(q) ||
        ownerName.toLowerCase().includes(q) ||
        ownerEmail.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q) ||
        city.toLowerCase().includes(q)
      );
    });
  }, [documents, query]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Documentos"
        description={
          cityName && stateName
            ? `Documentos enviados pelos usuários de ${cityName} / ${stateName}.`
            : "Documentos enviados pelos usuários cadastrados."
        }
        icon={FileText}
      />

      <div className="bg-card border border-border rounded-xl p-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por usuário, e-mail, arquivo, cidade ou tipo..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Carregando documentos...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum documento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{doc.fileName}</p>
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
                      <div>
                        <p className="text-sm text-foreground">{doc.user?.city?.name ?? cityName ?? "Não informada"}</p>
                        <p className="text-xs text-muted-foreground">{doc.user?.city?.state ?? stateName ?? "UF não informada"}</p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary">{documentTypeLabel(doc.type)}</Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={doc.status === "rejected" ? "destructive" : doc.status === "approved" ? "default" : "secondary"}>
                        {statusLabel(doc.status)}
                      </Badge>
                    </TableCell>

                    <TableCell>{formatFileSize(doc.sizeBytes)}</TableCell>

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
                          onClick={() => downloadProtectedFile(`/documents/${doc.id}/download`, doc.fileName)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
