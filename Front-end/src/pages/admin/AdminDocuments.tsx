import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Eye, FileText, Filter, Loader2, Search, XCircle } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AdminDocument {
  id: number;
  type: string;
  status: "pending" | "approved" | "rejected";
  fileName: string;
  filePath?: string;
  mimeType?: string;
  sizeBytes?: number;
  moderationReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  user?: {
    id: number;
    nome: string;
    email: string;
    role: string;
    city?: { name: string; state: string } | null;
  };
  reviewedBy?: { nome: string; email: string } | null;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type TypeFilter = "all" | "profile_photo" | "enrollment_proof" | "driver_license" | "general";

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Rejeitados" },
];

const typeOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "Todos os tipos" },
  { value: "profile_photo", label: "Foto de perfil" },
  { value: "enrollment_proof", label: "Comprovante de matrícula" },
  { value: "driver_license", label: "CNH" },
  { value: "general", label: "Documento geral" },
];

function documentLabel(type: string) {
  return typeOptions.find((item) => item.value === type)?.label ?? type;
}

function statusMeta(status: AdminDocument["status"]) {
  const meta = {
    pending: { label: "Pendente", className: "border-amber-500/30 bg-amber-500/10 text-amber-600" },
    approved: { label: "Aprovado", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" },
    rejected: { label: "Rejeitado", className: "border-destructive/30 bg-destructive/10 text-destructive" },
  };
  return meta[status];
}

function formatBytes(bytes?: number) {
  if (!bytes) return "Tamanho não informado";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadUrl(id: number) {
  return `/api/documents/${id}/download`;
}

export default function AdminDocuments() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [preview, setPreview] = useState<AdminDocument | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");

  async function loadDocuments() {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      const { data } = await api.get("/admin/documents", { params });
      setDocuments(data ?? []);
      setSelectedIds([]);
    } catch {
      toast({ title: "Erro ao carregar documentos", description: "Não foi possível buscar os documentos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDocuments(); }, [statusFilter, typeFilter]);

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((doc) => `${doc.fileName} ${doc.user?.nome ?? ""} ${doc.user?.email ?? ""} ${documentLabel(doc.type)}`.toLowerCase().includes(q));
  }, [documents, search]);

  const counts = useMemo(() => ({
    total: documents.length,
    pending: documents.filter((doc) => doc.status === "pending").length,
    approved: documents.filter((doc) => doc.status === "approved").length,
    rejected: documents.filter((doc) => doc.status === "rejected").length,
  }), [documents]);

  const pendingSelected = selectedIds
    .map((id) => documents.find((doc) => doc.id === id))
    .filter((doc): doc is AdminDocument => Boolean(doc && doc.status === "pending"));

  function toggleSelected(id: number) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function selectVisiblePending() {
    const ids = filteredDocuments.filter((doc) => doc.status === "pending").map((doc) => doc.id);
    setSelectedIds(ids);
  }

  async function reviewDocument(id: number, status: "approved" | "rejected", reason?: string) {
    try {
      setReviewing(true);
      await api.patch(`/admin/documents/${id}/review`, { status, reason });
      toast({ title: status === "approved" ? "Documento aprovado" : "Documento rejeitado" });
      await loadDocuments();
    } catch (error: any) {
      toast({ title: "Erro ao revisar", description: error?.response?.data?.error ?? "Não foi possível revisar o documento.", variant: "destructive" });
    } finally {
      setReviewing(false);
    }
  }

  async function rejectDocument(id: number) {
    const reason = window.prompt("Informe o motivo da rejeição:");
    if (!reason) return;
    await reviewDocument(id, "rejected", reason);
  }

  async function approveSelected() {
    if (pendingSelected.length === 0) return;
    try {
      setReviewing(true);
      await Promise.all(pendingSelected.map((doc) => api.patch(`/admin/documents/${doc.id}/review`, { status: "approved" })));
      toast({ title: "Documentos aprovados", description: `${pendingSelected.length} documento(s) aprovados.` });
      await loadDocuments();
    } catch {
      toast({ title: "Erro na aprovação em lote", description: "Alguns documentos não puderam ser aprovados.", variant: "destructive" });
    } finally {
      setReviewing(false);
    }
  }

  async function rejectSelected() {
    if (pendingSelected.length === 0) return;
    const reason = window.prompt("Informe o motivo da rejeição em lote:");
    if (!reason) return;
    try {
      setReviewing(true);
      await Promise.all(pendingSelected.map((doc) => api.patch(`/admin/documents/${doc.id}/review`, { status: "rejected", reason })));
      toast({ title: "Documentos rejeitados", description: `${pendingSelected.length} documento(s) rejeitados.` });
      await loadDocuments();
    } catch {
      toast({ title: "Erro na rejeição em lote", description: "Alguns documentos não puderam ser rejeitados.", variant: "destructive" });
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Documentos"
        description="Analise, aprove e rejeite documentos enviados pelos alunos e motoristas."
        icon={FileText}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Listados" value={counts.total} />
        <SummaryCard label="Pendentes" value={counts.pending} tone="warning" />
        <SummaryCard label="Aprovados" value={counts.approved} tone="success" />
        <SummaryCard label="Rejeitados" value={counts.rejected} tone="danger" />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <div className="space-y-2">
              <Label>Status</Label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Busca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Aluno, e-mail ou arquivo..." className="pl-9" />
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={loadDocuments}><Filter className="w-4 h-4 mr-2" /> Atualizar</Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">{pendingSelected.length} documento(s) pendente(s) selecionado(s)</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={selectVisiblePending}>Selecionar pendentes visíveis</Button>
            <Button size="sm" onClick={approveSelected} disabled={reviewing || pendingSelected.length === 0}><CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar lote</Button>
            <Button size="sm" variant="destructive" onClick={rejectSelected} disabled={reviewing || pendingSelected.length === 0}><XCircle className="w-4 h-4 mr-1" /> Rejeitar lote</Button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando documentos...</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum documento encontrado.</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredDocuments.map((doc) => {
              const meta = statusMeta(doc.status);
              const selected = selectedIds.includes(doc.id);
              return (
                <div key={doc.id} className={cn("p-4 grid grid-cols-1 xl:grid-cols-[32px_1fr_auto] gap-3 items-start", selected && "bg-primary/[0.03]")}> 
                  <input type="checkbox" checked={selected} disabled={doc.status !== "pending"} onChange={() => toggleSelected(doc.id)} className="mt-1 h-4 w-4" />
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading font-semibold text-foreground break-all">{doc.fileName}</p>
                      <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                      <Badge variant="secondary">{documentLabel(doc.type)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {doc.user?.nome ?? "Usuário não informado"} · {doc.user?.email ?? "sem e-mail"} · {doc.user?.city ? `${doc.user.city.name}/${doc.user.city.state}` : "cidade não informada"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatBytes(doc.sizeBytes)} · enviado em {new Date(doc.createdAt).toLocaleString("pt-BR")}</p>
                    {doc.moderationReason && <p className="text-xs text-destructive">Motivo: {doc.moderationReason}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button size="sm" variant="outline" onClick={() => setPreview(doc)}><Eye className="w-4 h-4 mr-1" /> Preview</Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(downloadUrl(doc.id), "_blank")}><Download className="w-4 h-4 mr-1" /> Baixar</Button>
                    {doc.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => reviewDocument(doc.id, "approved")} disabled={reviewing}><CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar</Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectDocument(doc.id)} disabled={reviewing}><XCircle className="w-4 h-4 mr-1" /> Rejeitar</Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading font-semibold text-foreground truncate">{preview.fileName}</p>
                <p className="text-xs text-muted-foreground">{documentLabel(preview.type)} · {preview.user?.nome}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>Fechar</Button>
            </div>
            <div className="p-4 bg-background max-h-[72vh] overflow-auto">
              {preview.mimeType?.startsWith("image/") ? (
                <img src={downloadUrl(preview.id)} alt={preview.fileName} className="max-w-full mx-auto rounded-xl border border-border" />
              ) : preview.mimeType === "application/pdf" ? (
                <iframe src={downloadUrl(preview.id)} title={preview.fileName} className="w-full h-[70vh] rounded-xl border border-border bg-white" />
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">Preview indisponível para este formato. Use o botão baixar.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" | "success" | "danger" }) {
  const colors = {
    default: "text-foreground",
    warning: "text-amber-600",
    success: "text-emerald-600",
    danger: "text-destructive",
  }[tone];

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-heading font-bold", colors)}>{value}</p>
    </div>
  );
}
