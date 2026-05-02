import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, CheckCheck, Trash2, AlertCircle, Calendar, CheckCircle2, Info } from "lucide-react";
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

  async function toggleRead(id: number) {
    await api.patch(`/notifications/${id}/read`);
    loadNotifications();
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    loadNotifications();
  }

  async function remove(id: number) {
    await api.delete(`/notifications/${id}`);
    loadNotifications();
  }

  async function clearAll() {
    await api.delete("/notifications/clear");
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
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="w-4 h-4 mr-1.5" /> Marcar todas
          </Button>
          <Button size="sm" variant="ghost" onClick={clearAll} disabled={items.length === 0}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Limpar
          </Button>
        </div>
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
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group relative bg-card border rounded-xl p-4 flex gap-3 ${
                    isUnread ? "border-primary/40 bg-primary/[0.03]" : "border-border"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-heading font-semibold">{n.title}</p>
                      {isUnread && <span className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggleRead(n.id)}>
                      <CheckCheck className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(n.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
