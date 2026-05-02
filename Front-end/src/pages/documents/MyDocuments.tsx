import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Eye, FileText, Image, Loader2, Upload, XCircle, Clock3, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type DocumentType = "profile_photo" | "enrollment_proof" | "driver_license" | "general";

interface UserDocument {
  id: number;
  type: DocumentType;
  status: "pending" | "approved" | "rejected";
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  moderationReason?: string | null;
}

const studentTypes = [
  { value: "profile_photo", label: "Foto de perfil", description: "Imagem para identificação no sistema." },
  { value: "enrollment_proof", label: "Comprovante de matrícula", description: "PDF ou imagem comprovando vínculo com a instituição." },
  { value: "general", label: "Documento geral", description: "Documento complementar solicitado pela administração." },
];

const driverTypes = [
  { value: "profile_photo", label: "Foto de perfil", description: "Imagem para identificação no sistema." },
  { value: "driver_license", label: "CNH", description: "PDF ou imagem da Carteira Nacional de Habilitação." },
  { value: "general", label: "Documento geral", description: "Documento complementar solicitado pela administração." },
];

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function statusMeta(status: UserDocument["status"]) {
  const meta = {
    pending: { label: "Pendente", icon: Clock3, className: "text-amber-600 border-amber-500/30 bg-amber-500/10" },
    approved: { label: "Aprovado", icon: CheckCircle2, className: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" },
    rejected: { label: "Rejeitado", icon: XCircle, className: "text-destructive border-destructive/30 bg-destructive/10" },
  };
  return meta[status] ?? meta.pending;
}

function documentLabel(type: DocumentType) {
  const all = [...studentTypes, ...driverTypes];
  return all.find((item) => item.value === type)?.label ?? type;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "Tamanho não informado";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateSelectedFile(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Formato inválido. Envie PDF, PNG, JPG, JPEG ou WEBP.";
  if (file.size > MAX_FILE_SIZE) return "Arquivo muito grande. O limite é 8 MB.";
  return null;
}

function viewUrl(id: number) { return `/api/documents/${id}/view`; }
function downloadUrl(id: number) { return `/api/documents/${id}/download`; }

export default function MyDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [type, setType] = useState<DocumentType>(user?.role === "driver" ? "driver_license" : "enrollment_proof");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<UserDocument | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const options = user?.role === "driver" ? driverTypes : studentTypes;
  const selectedType = useMemo(() => options.find((option) => option.value === type), [options, type]);
  const latestByType = useMemo(() => {
    const grouped = new Map<DocumentType, UserDocument>();
    documents.forEach((document) => {
      const current = grouped.get(document.type);
      if (!current || new Date(document.createdAt) > new Date(current.createdAt)) grouped.set(document.type, document);
    });
    return grouped;
  }, [documents]);

  async function loadDocuments() {
    try {
      setLoading(true);
      const { data } = await api.get("/documents/my");
      setDocuments(data ?? []);
    } catch {
      toast({ title: "Erro ao carregar documentos", description: "Não foi possível buscar seus documentos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDocuments(); }, []);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(nextFile?: File | null) {
    if (!nextFile) return;
    const error = validateSelectedFile(nextFile);
    if (error) {
      toast({ title: "Arquivo inválido", description: error, variant: "destructive" });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(nextFile);
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      toast({ title: "Selecione um arquivo", description: "Escolha ou arraste um documento antes de enviar.", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast({ title: "Documento enviado", description: "Seu arquivo foi enviado para análise." });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await loadDocuments();
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error?.response?.data?.error ?? "Não foi possível enviar o documento.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> Meus Documentos</h1>
        <p className="text-sm text-muted-foreground">Envie documentos em PDF ou imagem e acompanhe a análise da administração.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <form onSubmit={handleUpload} className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="space-y-2">
            <Label>Tipo de documento</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {options.map((option) => {
                const latest = latestByType.get(option.value as DocumentType);
                const selected = type === option.value;
                const status = latest ? statusMeta(latest.status) : null;
                return (
                  <button key={option.value} type="button" onClick={() => setType(option.value as DocumentType)} className={cn("rounded-xl border p-3 text-left transition-all bg-background hover:border-primary/40", selected ? "border-primary ring-2 ring-primary/15" : "border-border")}>
                    <p className="font-heading font-semibold text-sm text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{option.description}</p>
                    {status && <span className={cn("inline-flex items-center gap-1 mt-2 text-[11px] rounded-full border px-2 py-0.5", status.className)}><status.icon className="w-3 h-3" /> {status.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Arquivo</Label>
            <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files?.[0]); }} className={cn("w-full rounded-2xl border-2 border-dashed p-6 text-center transition-all bg-background", dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf" className="hidden" onChange={(event) => selectFile(event.target.files?.[0])} />
              {file ? <div className="space-y-3">{previewUrl ? <img src={previewUrl} alt="Prévia do documento" className="mx-auto h-28 w-28 rounded-xl object-cover border border-border" /> : <div className="mx-auto h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-8 h-8 text-primary" /></div>}<div><p className="font-medium text-foreground break-all">{file.name}</p><p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p></div><span className="text-xs text-primary font-medium">Clique para trocar o arquivo</span></div> : <div className="space-y-2"><div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center"><Upload className="w-7 h-7 text-primary" /></div><p className="font-heading font-semibold text-foreground">Clique para escolher ou arraste o arquivo aqui</p><p className="text-xs text-muted-foreground">PDF, PNG, JPG, JPEG ou WEBP até 8 MB.</p></div>}
            </button>
          </div>

          {file && <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-2 text-sm text-muted-foreground"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><p>Você está enviando <strong className="text-foreground">{file.name}</strong> como <strong className="text-foreground">{selectedType?.label}</strong>.</p></div>}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={uploading || !file} className="w-full sm:w-auto">{uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} {uploading ? "Enviando..." : "Enviar documento"}</Button>
            {file && <Button type="button" variant="outline" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}>Remover seleção</Button>}
          </div>
        </form>

        <aside className="bg-card border border-border rounded-xl p-4 space-y-3 h-fit">
          <h2 className="font-heading font-semibold text-foreground">Orientações</h2>
          <div className="space-y-3 text-sm text-muted-foreground"><p>Confira se o documento está legível antes de enviar.</p><p>Fotos devem mostrar o documento inteiro, sem cortes.</p><p>Após o envio, a administração poderá aprovar ou rejeitar o arquivo.</p></div>
        </aside>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3"><h2 className="font-heading font-semibold text-foreground">Histórico</h2><span className="text-xs text-muted-foreground">{documents.length} documento{documents.length === 1 ? "" : "s"}</span></div>
        {loading ? <div className="p-6 text-sm text-muted-foreground text-center flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div> : documents.length === 0 ? <div className="p-8 text-sm text-muted-foreground text-center"><Image className="w-10 h-10 mx-auto mb-3" /> Nenhum documento enviado ainda.</div> : <div className="divide-y divide-border">{documents.map((document) => { const meta = statusMeta(document.status); const Icon = meta.icon; return <div key={document.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div className="min-w-0 flex items-start gap-3"><div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-primary" /></div><div className="min-w-0"><p className="font-medium text-foreground break-all">{document.fileName}</p><p className="text-xs text-muted-foreground">{documentLabel(document.type)} · {formatBytes(document.sizeBytes)} · {new Date(document.createdAt).toLocaleString("pt-BR")}</p>{document.status === "rejected" && document.moderationReason && <p className="text-xs text-destructive mt-1">Motivo: {document.moderationReason}</p>}</div></div><div className="flex flex-wrap items-center gap-2"><span className={cn("inline-flex items-center gap-1 text-xs font-medium rounded-full border px-2 py-1 w-fit", meta.className)}><Icon className="w-3.5 h-3.5" /> {meta.label}</span><Button size="sm" variant="outline" onClick={() => setSelectedPreview(document)}><Eye className="w-4 h-4 mr-1" /> Visualizar</Button><Button size="sm" variant="outline" onClick={() => window.open(downloadUrl(document.id), "_blank")}><Download className="w-4 h-4 mr-1" /> Baixar</Button></div></div>; })}</div>}
      </div>

      {selectedPreview && <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedPreview(null)}><div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}><div className="p-4 border-b border-border flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-heading font-semibold text-foreground truncate">{selectedPreview.fileName}</p><p className="text-xs text-muted-foreground">{documentLabel(selectedPreview.type)}</p></div><Button variant="ghost" size="sm" onClick={() => setSelectedPreview(null)}>Fechar</Button></div><div className="p-4 bg-background max-h-[72vh] overflow-auto">{selectedPreview.mimeType?.startsWith("image/") ? <img src={viewUrl(selectedPreview.id)} alt={selectedPreview.fileName} className="max-w-full mx-auto rounded-xl border border-border" /> : selectedPreview.mimeType === "application/pdf" ? <iframe src={viewUrl(selectedPreview.id)} title={selectedPreview.fileName} className="w-full h-[70vh] rounded-xl border border-border bg-white" /> : <div className="p-8 text-center text-sm text-muted-foreground">Visualização indisponível para este formato. Use o botão baixar.</div>}</div></div></div>}
    </div>
  );
}
