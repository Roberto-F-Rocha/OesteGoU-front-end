import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, CheckCheck, Trash2, AlertCircle, Calendar, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NotifType = "info" | "alert" | "schedule" | "success";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const initial: Notification[] = [
  { id: "1", type: "alert", title: "Confirme sua presença", message: "Não esqueça de confirmar a viagem de amanhã para a UFMG.", time: "Há 2h", read: false },
  { id: "2", type: "schedule", title: "Horário alterado", message: "A volta de hoje foi reagendada para 18:30.", time: "Ontem", read: false },
  { id: "3", type: "success", title: "Cadastro aprovado", message: "Seu cadastro foi aprovado pela secretaria. Bem-vindo!", time: "3 dias", read: true },
  { id: "4", type: "info", title: "Nova rota disponível", message: "Adicionamos uma rota extra às quartas-feiras.", time: "1 semana", read: true },
];

const typeMeta: Record<NotifType, { icon: typeof Bell; color: string; label: string }> = {
  alert: { icon: AlertCircle, color: "text-warning", label: "Aviso" },
  schedule: { icon: Calendar, color: "text-primary", label: "Horário" },
  success: { icon: CheckCircle2, color: "text-success", label: "Sucesso" },
  info: { icon: Info, color: "text-accent", label: "Info" },
};

export default function StudentNotifications() {
  const [items, setItems] = useState<Notification[]>(initial);
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems(items.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: string) =>
    setItems(items.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  const remove = (id: string) => setItems(items.filter((n) => n.id !== id));
  const clearAll = () => setItems([]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Notificações
            {unread > 0 && <Badge variant="default" className="ml-1">{unread} nova{unread > 1 ? "s" : ""}</Badge>}
          </h1>
          <p className="text-muted-foreground text-sm">Avisos da secretaria e atualizações de viagens</p>
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

      {items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-heading font-semibold text-foreground">Sem notificações</p>
          <p className="text-sm text-muted-foreground">Você está em dia! Volte mais tarde.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {items.map((n, i) => {
              const meta = typeMeta[n.type];
              const Icon = meta.icon;
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group relative bg-card border rounded-xl p-4 flex gap-3 ${
                    !n.read ? "border-primary/40 bg-primary/[0.03]" : "border-border"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 ${meta.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-semibold text-foreground">{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary" aria-label="Não lida" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                  </div>
                  <div className="flex flex-col gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" onClick={() => toggleRead(n.id)} aria-label="Alternar lido">
                      <CheckCheck className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(n.id)} aria-label="Remover">
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
