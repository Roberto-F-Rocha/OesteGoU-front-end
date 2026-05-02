import { useEffect, useState } from "react";
import { Bell, Send, History } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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

export default function AdminPush() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("/");
  const [target, setTarget] = useState("all");
  const [history, setHistory] = useState<PushHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    const { data } = await api.get("/admin/push/history");
    setHistory(data ?? []);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function sendPush() {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe título e mensagem.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post("/admin/push/send", {
        title,
        message,
        url,
        target,
      });

      toast({
        title: "Push enviado",
        description: `${data.sent ?? 0} usuário(s) receberam a notificação.`,
      });

      setTitle("");
      setMessage("");
      setUrl("/");
      setTarget("all");
      await loadHistory();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar push",
        description: error?.response?.data?.error ?? "Não foi possível enviar a notificação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Push Notifications"
        description="Envie notificações para alunos, motoristas ou todos os usuários do município."
        icon={Bell}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Enviar notificação</h2>
          </div>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Nova rota disponível" />
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex.: Confira os horários atualizados." />
          </div>

          <div className="space-y-2">
            <Label>URL ao clicar</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/student/schedules" />
          </div>

          <div className="space-y-2">
            <Label>Público-alvo</Label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="student">Alunos</option>
              <option value="driver">Motoristas</option>
              <option value="admin">Administradores</option>
            </select>
          </div>

          <Button onClick={sendPush} disabled={loading} className="w-full">
            {loading ? "Enviando..." : "Enviar push"}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Histórico de envios</h2>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum push enviado ainda.</p>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {history.map((item) => (
                <div key={item.id} className="border border-border rounded-lg p-3 text-sm space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Alvo: {item.target} · Destinatários: {item.recipients}
                  </p>
                  {item.sentBy && (
                    <p className="text-xs text-muted-foreground">
                      Enviado por: {item.sentBy.nome}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}