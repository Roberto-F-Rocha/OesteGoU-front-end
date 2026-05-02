import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function StudentNotifications() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  async function loadNotifications() {
    try {
      setLoading(true);
      const res = await api.get("/notifications/my");
      setItems(res.data.notifications);
      setUnread(res.data.unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAsRead(id: number) {
    await api.patch(`/notifications/${id}/read`);
    loadNotifications();
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    loadNotifications();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Notificações
            {unread > 0 && <Badge variant="default" className="ml-1">{unread} nova{unread > 1 ? "s" : ""}</Badge>}
          </h1>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1.5" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-heading font-semibold text-foreground">Sem notificações</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {items.map((n: any, i) => {
              const isUnread = !n.readAt;
              return (
                <motion.button
                  key={n.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => isUnread && markAsRead(n.id)}
                  className={`w-full text-left group relative bg-card border rounded-xl p-4 flex gap-3 ${
                    isUnread ? "border-primary/40 bg-primary/[0.03] cursor-pointer" : "border-border cursor-default"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-heading font-semibold text-foreground">{n.title}</p>
                      {isUnread && <span className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {isUnread && <CheckCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
