import { useNotifications } from "@/contexts/NotificationContext";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DriverNotifications() {
  const { notifications, unreadCount, loading, markAllAsRead, markAsRead } = useNotifications();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Notificações
            {unreadCount > 0 && <Badge className="rounded-full">{unreadCount} nova{unreadCount > 1 ? "s" : ""}</Badge>}
          </h1>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" /> Marcar todas como lidas
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
            {notifications.map((notification, index) => {
              const unread = !notification.readAt;
              return (
                <button
                  key={notification.id ?? index}
                  type="button"
                  onClick={() => unread && notification.id && markAsRead(notification.id)}
                  className={`w-full p-4 text-left hover:bg-muted/40 transition-colors ${unread ? "bg-primary/[0.04]" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${unread ? "bg-primary" : "bg-muted"}`} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-heading font-semibold text-foreground">{notification.title}</p>
                        {notification.type && <Badge variant="outline">{notification.type}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{notification.message}</p>
                      {notification.createdAt && (
                        <p className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString("pt-BR")}</p>
                      )}
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
