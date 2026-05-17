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

function targetLabel(target: string) {
  const labels: Record<string, string> = {
    all: "Todos",
    student: "Alunos",
    driver: "Motoristas",
    admin: "Administradores",
  };

  return labels[target] ?? target;
}

export default function AdminPush() {
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [history, setHistory] = useState<PushHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    try {
      const { data } = await api.get("/admin/push/history");
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível buscar o histórico de notificações.",
        variant: "destructive",
      });
    }
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
        title: title.trim(),
        message: message.trim(),
        target,
      });

      toast({
        title: "Notificação enviada",
        description: `${data.sent ?? 0} usuário(s) receberam a notificação.`,
      });

      setTitle("");
      setMessage("");
      setTarget("all");

      await loadHistory();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar notificação",
        description:
          error?.response?.data?.error ?? "Não foi possível enviar a notificação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Enviar notificações"
        description="Envie notificações para alunos, motoristas ou todos os usuários do município."
        icon={Bell}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">
              Criar nova notificação
            </h2>
          </div>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Nova rota disponível"
            />
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ex.: Confira os horários atualizados."
            />
          </div>

          <div className="space-y-2">
            <Label>Público-alvo</Label>
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="student">Alunos</option>
              <option value="driver">Motoristas</option>
              <option value="admin">Administradores</option>
            </select>
          </div>

          <Button onClick={sendPush} disabled={loading} className="w-full">
            {loading ? "Enviando..." : "Enviar notificação"}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">
              Histórico de envios
            </h2>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação enviada ainda.
            </p>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="border border-border rounded-lg p-3 text-sm space-y-1"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="font-medium text-foreground">{item.title}</p>

                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <p className="text-muted-foreground">{item.message}</p>

                  <p className="text-xs text-muted-foreground">
                    Alvo: {targetLabel(item.target)} · Destinatários:{" "}
                    {item.recipients}
                  </p>

                  {item.city && (
                    <p className="text-xs text-muted-foreground">
                      Cidade: {item.city.name} / {item.city.state}
                    </p>
                  )}

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
}import { useEffect, useMemo, useState } from "react";
import { Bell, History, Inbox, MessageSquare, Plus, Send, X } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  const labels: Record<string, string> = {
    all: "Todos",
    student: "Alunos",
    driver: "Motoristas",
    admin: "Administradores",
  };

  return labels[target] ?? target;
}

function senderLabel(metadata?: Record<string, unknown> | null) {
  const senderRole = String(metadata?.senderRole ?? "");
  if (senderRole === "student") return "Aluno";
  if (senderRole === "driver") return "Motorista";
  if (senderRole === "admin") return "Administrador";
  return "Sistema";
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export default function AdminPush() {
  const { toast } = useToast();
  const { notifications, refreshNotifications } = useNotifications();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [history, setHistory] = useState<PushHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const receivedNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const senderRole = String(notification.metadata?.senderRole ?? "");
      const source = String(notification.metadata?.source ?? "");

      return (
        senderRole === "student" ||
        senderRole === "driver" ||
        source.startsWith("student_") ||
        source.startsWith("driver_") ||
        source.includes("attendance") ||
        source.includes("document") ||
        source.includes("reservation")
      );
    });
  }, [notifications]);

  const studentNotifications = receivedNotifications.filter((notification) => {
    const senderRole = String(notification.metadata?.senderRole ?? "");
    const source = String(notification.metadata?.source ?? "");
    return senderRole === "student" || source.startsWith("student_") || source.includes("attendance");
  });

  const driverNotifications = receivedNotifications.filter((notification) => {
    const senderRole = String(notification.metadata?.senderRole ?? "");
    const source = String(notification.metadata?.source ?? "");
    return senderRole === "driver" || source.startsWith("driver_");
  });

  async function loadHistory() {
    try {
      const { data } = await api.get("/admin/push/history");
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível buscar o histórico de notificações.",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    loadHistory();
    refreshNotifications();
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
        title: title.trim(),
        message: message.trim(),
        target,
      });

      toast({
        title: "Notificação enviada",
        description: `${data.sent ?? 0} usuário(s) receberam a notificação.`,
      });

      setTitle("");
      setMessage("");
      setTarget("all");
      setShowCreateForm(false);

      await loadHistory();
      await refreshNotifications();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar notificação",
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
        title="Notificações"
        description="Acompanhe avisos recebidos de alunos e motoristas, veja o histórico enviado e crie novos comunicados quando necessário."
        icon={Bell}
        actions={
          <Button onClick={() => setShowCreateForm((value) => !value)}>
            {showCreateForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showCreateForm ? "Fechar criação" : "Criar nova notificação"}
          </Button>
        }
      />

      {showCreateForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Criar nova notificação</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Nova rota disponível"
              />
            </div>

            <div className="space-y-2">
              <Label>Público-alvo</Label>
              <select
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Todos</option>
                <option value="student">Alunos</option>
                <option value="driver">Motoristas</option>
                <option value="admin">Administradores</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ex.: Confira os horários atualizados."
            />
          </div>

          <Button onClick={sendPush} disabled={loading} className="w-full">
            {loading ? "Enviando..." : "Enviar notificação"}
          </Button>
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-foreground">Notificações recebidas</h2>
            </div>
            <Badge variant="secondary">{receivedNotifications.length}</Badge>
          </div>

          {receivedNotifications.length === 0 ? (
            <EmptyCard text="Nenhuma notificação recebida de alunos ou motoristas ainda." />
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {receivedNotifications.map((notification, index) => (
                <div
                  key={notification.id ?? index}
                  className={cn(
                    "border border-border rounded-lg p-3 text-sm space-y-1",
                    !notification.readAt && "bg-primary/[0.04]",
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="font-medium text-foreground">{notification.title}</p>
                    <Badge variant="outline">{senderLabel(notification.metadata)}</Badge>
                  </div>

                  <p className="text-muted-foreground">{notification.message}</p>

                  <p className="text-xs text-muted-foreground">
                    {notification.createdAt
                      ? new Date(notification.createdAt).toLocaleString("pt-BR")
                      : "Sem data"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-foreground">Resumo recebido</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-background/50 p-3">
                <p className="text-2xl font-heading font-bold text-foreground">{studentNotifications.length}</p>
                <p className="text-xs text-muted-foreground">De alunos</p>
              </div>

              <div className="rounded-xl border border-border bg-background/50 p-3">
                <p className="text-2xl font-heading font-bold text-foreground">{driverNotifications.length}</p>
                <p className="text-xs text-muted-foreground">De motoristas</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-semibold text-foreground">Prévia do que enviei</h2>
              </div>
              <Badge variant="secondary">{history.length}</Badge>
            </div>

            {history.length === 0 ? (
              <EmptyCard text="Nenhuma notificação enviada ainda." />
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
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
                      Alvo: {targetLabel(item.target)} · Destinatários: {item.recipients}
                    </p>

                    {item.city && (
                      <p className="text-xs text-muted-foreground">
                        Cidade: {item.city.name} / {item.city.state}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}