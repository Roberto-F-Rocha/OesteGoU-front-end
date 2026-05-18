import { useEffect, useState } from "react";
import { Bell, History, Inbox, MessageSquare, Plus, Send, X } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { api } from "@/lib/api";

interface PushHistoryItem {
  id: number;
  title: string;
  message: string;
  url?: string | null;
  target: string;
  recipients: number;
  createdAt: string;
  city?: { name: string; state: string } | null;
  sentBy?: { nome: string; email: string } | null;
}

function targetLabel(target: string) {
  const labels: Record<string, string> = { all: "Todos", student: "Alunos", driver: "Motoristas", admin: "Administradores" };
  return labels[target] ?? target;
}

function EmptyCard({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

export default function AdminPush() {
  const { toast } = useToast();
  const { refreshNotifications } = useNotifications();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [history, setHistory] = useState<PushHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const studentSent = history.filter((item) => item.target === "student" || item.target === "all").reduce((total, item) => total + (item.target === "student" ? item.recipients : 0), 0);
  const driverSent = history.filter((item) => item.target === "driver" || item.target === "all").reduce((total, item) => total + (item.target === "driver" ? item.recipients : 0), 0);

  async function loadHistory() {
    try {
      const { data } = await api.get("/admin/push/history");
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Erro ao carregar histórico", description: "Não foi possível buscar o histórico de notificações.", variant: "destructive" });
    }
  }

  useEffect(() => {
    loadHistory();
    refreshNotifications();
  }, []);

  async function sendPush() {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Campos obrigatórios", description: "Informe título e mensagem.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post("/admin/push/send", { title: title.trim(), message: message.trim(), target });
      toast({ title: "Notificação enviada", description: `${data.sent ?? 0} usuário(s) receberam a notificação.` });
      setTitle("");
      setMessage("");
      setTarget("all");
      setShowCreateForm(false);
      await loadHistory();
      await refreshNotifications();
    } catch (error: any) {
      toast({ title: "Erro ao enviar notificação", description: error?.response?.data?.error ?? "Não foi possível enviar a notificação.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Notificações"
        description="Envie comunicados para alunos e motoristas e acompanhe o histórico dos envios realizados pela administração."
        icon={Bell}
        actions={<Button onClick={() => setShowCreateForm((value) => !value)}>{showCreateForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{showCreateForm ? "Fechar criação" : "Criar nova notificação"}</Button>}
      />

      {showCreateForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2"><Send className="w-5 h-5 text-primary" /><h2 className="font-heading font-semibold text-foreground">Criar nova notificação</h2></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Nova rota disponível" /></div>
            <div className="space-y-2"><Label>Público-alvo</Label><select value={target} onChange={(event) => setTarget(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="all">Todos</option><option value="student">Alunos</option><option value="driver">Motoristas</option><option value="admin">Administradores</option></select></div>
          </div>
          <div className="space-y-2"><Label>Mensagem</Label><Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ex.: Confira os horários atualizados." /></div>
          <Button onClick={sendPush} disabled={loading} className="w-full">{loading ? "Enviando..." : "Enviar notificação"}</Button>
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Inbox className="w-5 h-5 text-primary" /><h2 className="font-heading font-semibold text-foreground">Notificações enviadas</h2></div><Badge variant="secondary">{history.length}</Badge></div>
          {history.length === 0 ? <EmptyCard text="Nenhuma notificação enviada ainda." /> : <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">{history.map((item) => <div key={item.id} className="border border-border rounded-lg p-3 text-sm space-y-1"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"><p className="font-medium text-foreground">{item.title}</p><Badge variant="outline">{targetLabel(item.target)}</Badge></div><p className="text-muted-foreground">{item.message}</p><p className="text-xs text-muted-foreground">Destinatários: {item.recipients} · {new Date(item.createdAt).toLocaleString("pt-BR")}</p>{item.city && <p className="text-xs text-muted-foreground">Cidade: {item.city.name} / {item.city.state}</p>}</div>)}</div>}
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /><h2 className="font-heading font-semibold text-foreground">Resumo dos envios</h2></div>
            <div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-border bg-background/50 p-3"><p className="text-2xl font-heading font-bold text-foreground">{studentSent}</p><p className="text-xs text-muted-foreground">Para alunos</p></div><div className="rounded-xl border border-border bg-background/50 p-3"><p className="text-2xl font-heading font-bold text-foreground">{driverSent}</p><p className="text-xs text-muted-foreground">Para motoristas</p></div></div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><History className="w-5 h-5 text-primary" /><h2 className="font-heading font-semibold text-foreground">Prévia do último envio</h2></div><Badge variant="secondary">{history.length}</Badge></div>
            {history.length === 0 ? <EmptyCard text="Nenhuma notificação enviada ainda." /> : <div className="border border-border rounded-lg p-3 text-sm space-y-1"><p className="font-medium text-foreground">{history[0].title}</p><p className="text-muted-foreground">{history[0].message}</p><p className="text-xs text-muted-foreground">Alvo: {targetLabel(history[0].target)} · Destinatários: {history[0].recipients}</p></div>}
          </div>
        </div>
      </section>
    </div>
  );
}
