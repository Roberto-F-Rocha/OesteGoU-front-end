import { useEffect, useRef, useState } from "react";
import { FileText, Upload, Loader2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export type DocumentType = "profile_photo" | "enrollment_proof" | "driver_license" | "general";

interface DocumentUploadProps {
  type: DocumentType;
  title: string;
  description: string;
  accept?: string;
}

interface UserDocument {
  id: number;
  type: DocumentType;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  status: "pending" | "approved" | "rejected";
  moderationStatus?: string;
  createdAt: string;
}

function statusMeta(status: UserDocument["status"]) {
  if (status === "approved") return { label: "Aprovado", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
  if (status === "rejected") return { label: "Rejeitado", icon: AlertTriangle, className: "bg-destructive/15 text-destructive border-destructive/30" };
  return { label: "Pendente", icon: Clock, className: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
}

function formatBytes(size: number) {
  if (!size) return "0 KB";
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function DocumentUpload({ type, title, description, accept = "image/*,application/pdf" }: DocumentUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function loadDocuments() {
    try {
      setLoading(true);
      const { data } = await api.get("/documents/my");
      setDocuments((data ?? []).filter((doc: UserDocument) => doc.type === type));
    } catch {
      toast({
        title: "Erro ao carregar documentos",
        description: "Não foi possível buscar seus documentos enviados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [type]);

  async function handleFile(file?: File) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo permitido é 5MB.", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast({ title: "Documento enviado", description: "O arquivo foi enviado com sucesso." });
      if (inputRef.current) inputRef.current.value = "";
      await loadDocuments();
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error?.response?.data?.error ?? "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  const latest = documents[0];
  const StatusIcon = latest ? statusMeta(latest.status).icon : FileText;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <StatusIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {latest && (
          <Badge variant="outline" className={statusMeta(latest.status).className}>
            {statusMeta(latest.status).label}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : latest ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground truncate">{latest.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(latest.sizeBytes)} · enviado em {new Date(latest.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          Nenhum documento enviado ainda.
        </div>
      )}

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
      <Button type="button" variant="outline" className="w-full" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        {latest ? "Enviar novo arquivo" : "Enviar arquivo"}
      </Button>
    </div>
  );
}
