import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Loader2, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

function notificationHome(role?: string) {
  if (role === "admin") return "/admin/notificacao";
  if (role === "driver") return "/motorista/notificacoes";
  return "/aluno/notificacoes";
}

function normalizeNotificationLink(link: string | null | undefined, role?: string) {
  if (!link || link === "/") return notificationHome(role);
  if (link === "/admin/push" || link === "/admin/notificacoes" || link === "/admin/notificacao" || link === "/notifications" || link === "/notificacoes") return notificationHome(role);
  if (link.startsWith("/driver/routes")) return "/motorista/rotas";
  if (link.startsWith("/driver")) return link.replace("/driver", "/motorista");
  if (link.startsWith("/student")) return link.replace("/student", "/aluno");
  return link;
}

export default function NotificationBell() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { notifications, unreadCount, loading, soundEnabled, refreshNotifications, markAsRead, markAllAsRead, enableNotificationSound } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  useLiveRefresh(refreshNotifications, { intervalMs: 20000 });

  async function handleMarkAllAsRead() {
    try { await markAllAsRead(); } catch { toast({ title: "Erro", description: "Não foi possível marcar todas como lidas.", variant: "destructive" }); }
  }

  async function handleToggleSound(event: React.MouseEvent) {
    event.stopPropagation();
    await enableNotificationSound();
  }

  async function openNotification(notification: any) {
    try { if (!notification.readAt && notification.id) await markAsRead(notification.id); } catch { toast({ title: "Erro", description: "Não foi possível marcar como lida.", variant: "destructive" }); }
    setOpen(false);
    navigate(normalizeNotificationLink(notification.link, user?.role));
  }

  function goToNotifications() {
    setOpen(false);
    navigate(notificationHome(user?.role));
  }

  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((value) => !value)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm hover:bg-muted active:scale-95 transition-all" aria-label="Abrir notificações">
        <Bell className={cn("w-4 h-4", unreadCount > 0 && "text-primary")} />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-background animate-pulse">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div ref={panelRef} role="dialog" aria-modal="true" initial={{ opacity: 0, y: 28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }} transition={{ type: "spring", stiffness: 360, damping: 30 }} className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl border border-border bg-card shadow-2xl overflow-hidden md:inset-auto md:left-[244px] md:bottom-20 md:w-[min(380px,calc(100vw-2rem))] md:rounded-2xl">
              <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/25 md:hidden" />
              <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                <button type="button" onClick={goToNotifications} className="text-left min-w-0">
                  <p className="font-heading font-semibold text-foreground hover:text-primary transition-colors">Notificações</p>
                  <p className="text-xs text-muted-foreground">{unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : "Tudo lido"}</p>
                </button>
                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="rounded-full"><CheckCheck className="w-4 h-4 mr-1" /> Ler todas</Button>}
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="rounded-full h-9 w-9" aria-label="Fechar notificações"><X className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="p-3 border-b border-border bg-muted/30">
                <Button type="button" variant={soundEnabled ? "outline" : "default"} size="sm" onClick={handleToggleSound} className="w-full justify-center rounded-xl">
                  {soundEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                  {soundEnabled ? "Som ativado" : "Ativar som das notificações"}
                </Button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] md:max-h-96">
                {loading ? <div className="p-8 text-center text-sm flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div> : notifications.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma notificação ainda.</div> : notifications.slice(0, 8).map((notification) => {
                  const unread = !notification.readAt;
                  return <button key={notification.id} type="button" onClick={() => openNotification(notification)} className={cn("w-full text-left px-4 py-3 border-b border-border last:border-b-0 active:bg-muted/70 hover:bg-muted/50 transition-colors", unread && "bg-primary/[0.04]")}><div className="flex items-start gap-3"><div className={cn("mt-1 h-2.5 w-2.5 rounded-full shrink-0", unread ? "bg-primary" : "bg-muted")} /><div className="min-w-0 flex-1"><p className="font-medium text-sm text-foreground leading-snug">{notification.title}</p><p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p><p className="text-[11px] text-muted-foreground mt-1">{notification.createdAt ? new Date(notification.createdAt).toLocaleString("pt-BR") : ""}</p></div></div></button>;
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
