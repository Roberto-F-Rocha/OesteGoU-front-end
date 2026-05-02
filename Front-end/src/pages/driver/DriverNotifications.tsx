import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  readAt?: string | null;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

function typeClass(type: NotificationItem["type"]) {
  if (type === "success") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
  if (type === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-600";
  if (type === "error") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-primary/30 bg-primary/10 text-primary";
}

export default function DriverNotifications() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  async function loadNotifications() {
    try {
      setLoading(true);
      const { data } = await api.get("/notifications/my");
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      toast({ title: "Erro ao carregar notificações", description: "Não foi possível buscar suas notificações.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadNotifications(); }, []);

  async function markAllAsRead() {
    try {
      setMarking(true);
      await api.patch("/notifications/read-all");
      await loadNotifications();
    } catch {
      toast({ title: "Erro", description: "Não foi possível marcar todas como lidas.", variant: "destructive" });
    } finally {
      setMarking(false);
    }
  }

  async function markAsRead(notification: NotificationItem) {
    if (notification.readAt) return;
    try {
      await api.patch(`/notifications/${notification.id}/read`);
      await loadNotifications();
    } catch {
      toast({ title: "Erro", description: "Não foi possível marcar a notificação como lida.", variant: "destructive" });
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Notificações
            {unreadCount > 0 && <Badge className="rounded-full">{unreadCount} nova{unreadCount > 1 ? "s" : ""}</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">Avisos recebidos do administrador e registros das ações feitas no sistema.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} disabled={marking}>
            {marking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCheck className="w-4 h-4 mr-2" />}
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando notificações...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma notificação encontrada.</div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => {
              const unread = !notification.readAt;
              return (
                <button key={notification.id} type="button" onClick={() => markAsRead(notification)} className={cn("w-full p-4 text-left hover:bg-muted/40 transition-colors", unread && "bg-primary/[0.04]")}> 
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-1 h-2.5 w-2.5 rounded-full shrink-0", unread ? "bg-primary" : "bg-muted")} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-heading font-semibold text-foreground">{notification.title}</p>
                        <Badge variant="outline" className={typeClass(notification.type)}>{notification.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
