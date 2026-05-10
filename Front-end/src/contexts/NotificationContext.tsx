import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { socket } from "@/services/socket";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id?: number;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  readAt?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

type BrowserAudioContext = AudioContext & { resume: () => Promise<void> };
let sharedAudioContext: BrowserAudioContext | null = null;
let audioUnlocked = false;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioContext || sharedAudioContext.state === "closed") sharedAudioContext = new AudioContextClass();
  return sharedAudioContext;
}

async function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    audioUnlocked = ctx.state === "running";
  } catch {
    audioUnlocked = false;
  }
}

async function playBipeBipe() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;
    const now = ctx.currentTime + 0.02;
    function beep(start: number, frequency: number) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.22);
    }
    beep(now, 660);
    beep(now + 0.28, 880);
  } catch {}
}

function isExternalStudentNotification(notification: AppNotification, user?: any) {
  if (user?.role !== "student") return false;
  const metadata = notification.metadata ?? {};
  const source = String(metadata.source ?? "");
  const senderRole = String(metadata.senderRole ?? "");
  const senderId = metadata.senderId ? Number(metadata.senderId) : null;
  if (source === "student_attendance_self" || source === "reservation_created" || source === "roundtrip_created") return false;
  if (senderId && user?.id && senderId === Number(user.id)) return false;
  if (senderRole === "admin" || senderRole === "driver") return true;
  return source.startsWith("driver_") || source.startsWith("admin_") || source === "driver_pending_students";
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pendingSoundRef = useRef(false);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.get("/notifications/my");
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refreshNotifications(); }, [refreshNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function handleFirstInteraction() {
      await unlockAudio();
      if (pendingSoundRef.current) {
        pendingSoundRef.current = false;
        await playBipeBipe();
      }
    }
    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("pointerup", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);
    window.addEventListener("touchend", handleFirstInteraction);
    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("pointerup", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("touchend", handleFirstInteraction);
    };
  }, [isAuthenticated]);

  function resolveRoute(notification: AppNotification) {
    if (notification.link) return notification.link;
    if (notification.metadata?.routeId) return user?.role === "admin" ? "/admin/horarios" : "/aluno";
    if (notification.metadata?.scheduleId) return "/aluno";
    return user?.role === "admin" ? "/admin" : "/aluno/notificacoes";
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    async function handleNewNotification(notification: AppNotification) {
      if (isExternalStudentNotification(notification, user)) {
        await unlockAudio();
        await playBipeBipe();
        pendingSoundRef.current = true;
      }
      setNotifications((current) => {
        if (notification.id && current.some((item) => item.id === notification.id)) return current;
        return [notification, ...current];
      });
      setUnreadCount((count) => count + 1);
      toast(notification.title || "Nova notificação", {
        description: notification.message,
        action: { label: "Abrir", onClick: () => navigate(resolveRoute(notification)) },
      });
    }
    function handleTripReminder(data: { message?: string }) {
      toast("Sua viagem está próxima", { description: data.message || "Seu ônibus sai em breve!", action: { label: "Ver viagem", onClick: () => navigate("/aluno") } });
    }
    function handleCapacityAlert(data: any) {
      toast.warning("Alerta de lotação", { description: data.current && data.capacity ? `Ônibus com ${data.current}/${data.capacity}` : "Capacidade excedida", action: { label: "Ver rota", onClick: () => navigate("/admin/horarios") } });
    }
    socket.on("notification:new", handleNewNotification);
    socket.on("trip:reminder", handleTripReminder);
    socket.on("route:capacity-alert", handleCapacityAlert);
    socket.on("admin:capacity-alert", handleCapacityAlert);
    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("trip:reminder", handleTripReminder);
      socket.off("route:capacity-alert", handleCapacityAlert);
      socket.off("admin:capacity-alert", handleCapacityAlert);
    };
  }, [isAuthenticated, navigate, user]);

  async function markAsRead(id: number) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  async function markAllAsRead() {
    await api.patch("/notifications/read-all");
    const now = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    setUnreadCount(0);
  }

  const value = useMemo(() => ({ notifications, unreadCount, loading, refreshNotifications, markAsRead, markAllAsRead }), [notifications, unreadCount, loading, refreshNotifications]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
