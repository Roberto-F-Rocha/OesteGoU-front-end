import { useEffect, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type DocumentType = "profile_photo" | "enrollment_proof" | "driver_license" | "general";

interface UserDocument {
  id: number;
  type: DocumentType;
  status: "pending" | "approved" | "rejected";
  fileName: string;
  createdAt: string;
}

const studentTypes = [
  { value: "profile_photo", label: "Foto de perfil" },
  { value: "enrollment_proof", label: "Comprovante de matrícula" },
  { value: "general", label: "Documento geral" },
];

const driverTypes = [
  { value: "profile_photo", label: "Foto de perfil" },
  { value: "driver_license", label: "CNH" },
  { value: "general", label: "Documento geral" },
];

function statusLabel(status: UserDocument["status"]) {
  const labels = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado" };
  return labels[status] ?? status;
}

export default function MyDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [type, setType] = useState<DocumentType>(user?.role === "driver" ? "driver_license" : "enrollment_proof");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const options = user?.role === "driver" ? driverTypes : studentTypes;

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

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      toast({ title: "Selecione um arquivo", variant: "destructive" });
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
      await loadDocuments();
    } catch {
      toast({ title: "Erro no upload", description: "Não foi possível enviar o documento.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> Meus Documentos</h1>
        <p className="text-sm text-muted-foreground">Envie e acompanhe seus documentos cadastrados.</p>
      </div>

      <form onSubmit={handleUpload} className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de documento</Label>
            <select value={type} onChange={(e) => setType(e.target.value as DocumentType)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Arquivo</Label>
            <Input type="file" accept="image/*,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </div>
        </div>
        <Button type="submit" disabled={uploading} className="w-full sm:w-auto"><Upload className="w-4 h-4 mr-2" /> {uploading ? "Enviando..." : "Enviar documento"}</Button>
      </form>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border"><h2 className="font-heading font-semibold text-foreground">Histórico</h2></div>
        {loading ? <div className="p-6 text-sm text-muted-foreground text-center">Carregando...</div> : documents.length === 0 ? <div className="p-6 text-sm text-muted-foreground text-center">Nenhum documento enviado ainda.</div> : (
          <div className="divide-y divide-border">
            {documents.map((document) => (
              <div key={document.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0"><p className="font-medium text-foreground truncate">{document.fileName}</p><p className="text-xs text-muted-foreground">{document.type} · {new Date(document.createdAt).toLocaleDateString("pt-BR")}</p></div>
                <span className="text-xs font-medium rounded-full border border-border px-2 py-1 w-fit">{statusLabel(document.status)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
