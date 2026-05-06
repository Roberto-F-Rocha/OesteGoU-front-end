import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Search,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  downloadProtectedFile,
  openProtectedFile,
} from "@/lib/protectedFile";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  adminCity?: string;
  adminState?: string;
}

interface AdminDocument {
  id: number;
  fileName: string;
  filePath?: string | null;
  type?:
    | "profile_photo"
    | "enrollment_proof"
    | "driver_license"
    | "general"
    | string;
  mimeType?: string | null;
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

function statusBadgeVariant(status?: string) {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
}

export default function AdminDocuments({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const cityName = adminCity ?? user?.city?.name;
  const stateName = adminState ?? user?.city?.state;

  async function loadDocuments() {
    try {
      setLoading(true);

      const { data } = await api.get<AdminDocument[]>("/admin/documents");

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
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return documents;

    return documents.filter((doc) => {
      const fileName = doc.fileName ?? "";
      const ownerName = doc.user?.nome ?? "";
      const ownerEmail = doc.user?.email ?? "";
      const type = documentTypeLabel(doc.type);
      const city = doc.user?.city?.name ?? "";

      return (
        fileName.toLowerCase().includes(normalizedQuery) ||
        ownerName.toLowerCase().includes(normalizedQuery) ||
        ownerEmail.toLowerCase().includes(normalizedQuery) ||
        type.toLowerCase().includes(normalizedQuery) ||
        city.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [documents, query]);

  async function reviewDocument(
    documentId: number,
    status: "approved" | "rejected",
  ) {
    const reason =
      status === "rejected"
        ? window.prompt("Informe o motivo da rejeição:")
        : undefined;

    if (status === "rejected" && !reason?.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Para rejeitar um documento, informe o motivo.",
        variant: "destructive",
      });
      return;
    }

    try {
      setReviewingId(documentId);

      await api.patch(`/admin/documents/${documentId}/review`, {
        status,
        reason: reason?.trim(),
      });

      toast({
        title:
          status === "approved" ? "Documento aprovado" : "Documento rejeitado",
        description:
          status === "approved"
            ? "O usuário será notificado sobre a aprovação."
            : "O usuário será notificado sobre a rejeição.",
      });

      await loadDocuments();
    } catch {
      toast({
        title: "Erro ao revisar documento",
        description: "Não foi possível atualizar o status do documento.",
        variant: "destructive",
      });
    } finally {
      setReviewingId(null);
    }
  }

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
            placeholder="Buscar por usuário, e-mail, cidade, arquivo ou tipo..."
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
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    Carregando documentos...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhum documento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="max-w-[260px]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />

                        <div className="min-w-0">
                          <p
                            className="truncate font-medium text-foreground"
                            title={doc.fileName}
                          >
                            {doc.fileName}
                          </p>
                          <p
                            className="truncate text-xs text-muted-foreground"
                            title={doc.mimeType ?? undefined}
                          >
                            {doc.mimeType ?? "Tipo não informado"}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-[240px]">
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm text-foreground"
                          title={doc.user?.nome ?? undefined}
                        >
                          {doc.user?.nome ?? "Usuário não informado"}
                        </p>
                        <p
                          className="truncate text-xs text-muted-foreground"
                          title={doc.user?.email ?? undefined}
                        >
                          {doc.user?.email ?? "E-mail não informado"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {documentTypeLabel(doc.type)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={statusBadgeVariant(doc.status)}
                        className="whitespace-nowrap"
                      >
                        {statusLabel(doc.status)}
                      </Badge>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {doc.createdAt
                        ? new Date(doc.createdAt).toLocaleDateString("pt-BR")
                        : "Não informado"}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openProtectedFile(`/documents/${doc.id}/view`)
                          }
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            downloadProtectedFile(
                              `/documents/${doc.id}/download`,
                              doc.fileName,
                            )
                          }
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Baixar
                        </Button>

                        {doc.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={reviewingId === doc.id}
                              onClick={() =>
                                reviewDocument(doc.id, "approved")
                              }
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Aprovar
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={reviewingId === doc.id}
                              onClick={() =>
                                reviewDocument(doc.id, "rejected")
                              }
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rejeitar
                            </Button>
                          </>
                        )}
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