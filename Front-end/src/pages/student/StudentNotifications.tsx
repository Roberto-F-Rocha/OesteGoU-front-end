import { useNotifications } from "@/contexts/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, CheckCheck, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function StudentNotifications() {
  const {
    notifications,
    unreadCount,
    loading,
    soundEnabled,
    markAsRead,
    markAllAsRead,
    toggleNotificationSound,
  } = useNotifications();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Notificações
            {unreadCount > 0 && <Badge variant="default" className="ml-1">{unreadCount} nova{unreadCount > 1 ? "s" : ""}</Badge>}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={soundEnabled ? "default" : "outline"} onClick={toggleNotificationSound} className="rounded-xl">
            {soundEnabled ? <><Volume2 className="w-4 h-4 mr-1.5" /> Desativar buzina</> : <><VolumeX className="w-4 h-4 mr-1.5" /> Ativar buzina</>}
          </Button>

          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-1.5" /> Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          {soundEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="space-y-1">
          <p className="font-heading font-semibold text-foreground">Som das notificações</p>
          <p className="text-sm text-muted-foreground leading-relaxed">Receba uma buzina curta quando administradores ou motoristas enviarem avisos importantes.</p>
          <p className="text-xs text-muted-foreground">Status atual: {soundEnabled ? "Ativado" : "Desativado"}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Carregando...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-heading font-semibold text-foreground">Sem notificações</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {notifications.map((n: any, i) => {
              const isUnread = !n.readAt;
              return (
                <motion.button key={n.id ?? i} type="button" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.03 }} onClick={() => isUnread && n.id && markAsRead(n.id)} className={`w-full text-left group relative bg-card border rounded-xl p-4 flex gap-3 ${isUnread ? "border-primary/40 bg-primary/[0.03] cursor-pointer" : "border-border cursor-default"}`}>
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0"><Bell className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className="font-heading font-semibold text-foreground">{n.title}</p>{isUnread && <span className="w-2 h-2 bg-primary rounded-full" />}</div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    {n.createdAt && <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString("pt-BR")}</p>}
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
