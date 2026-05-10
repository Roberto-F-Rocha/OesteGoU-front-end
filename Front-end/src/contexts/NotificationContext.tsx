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
  soundEnabled: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  enableNotificationSound: () => Promise<boolean>;
  disableNotificationSound: () => void;
  toggleNotificationSound: () => Promise<void>;
  testNotificationSound: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);
const NOTIFICATION_SOUND_SRC = "/sounds/notification-horn.mp3";
let audioUnlocked = false;

function createHornAudio() {
  const audio = new Audio(NOTIFICATION_SOUND_SRC);
  audio.preload = "auto";
  audio.volume = 0.75;
  return audio;
}

async function unlockAudio(audioRef?: HTMLAudioElement | null) {
  try {
    const audio = audioRef ?? createHornAudio();
    audio.muted = true;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audioUnlocked = true;
    return true;
  } catch {
    audioUnlocked = false;
    return false;
  }
}

async function playHorn(audioRef?: HTMLAudioElement | null) {
  try {
    const audio = audioRef ?? createHornAudio();
    audio.muted = false;
    audio.volume = 0.75;
    audio.currentTime = 0;
    await audio.play();
    audioUnlocked = true;
  } catch {
    audioUnlocked = false;
  }
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
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("oestegou_notification_sound") === "enabled");
  const pendingSoundRef = useRef(false);
  const hornAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    hornAudioRef.current = createHornAudio();
    return () => {
      if (hornAudioRef.current) {
        hornAudioRef.current.pause();
        hornAudioRef.current.src = "";
        hornAudioRef.current = null;
      }
    };
  }, []);

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

  async function enableNotificationSound() {
    const unlocked = await unlockAudio(hornAudioRef.current);
    if (unlocked) {
      localStorage.setItem("oestegou_notification_sound", "enabled");
      setSoundEnabled(true);
      await playHorn(hornAudioRef.current);
      toast.success("Som ativado", { description: "Você ouvirá a buzina nas notificações externas." });
    } else {
      toast.error("Som bloqueado", { description: "O navegador bloqueou o áudio. Confira as permissões de som do site." });
    }
    return unlocked;
  }

  function disableNotificationSound() {
    localStorage.removeItem("oestegou_notification_sound");
    setSoundEnabled(false);
    pendingSoundRef.current = false;
    toast.info("Som desativado", { description: "As notificações continuarão chegando sem buzina." });
  }

  async function toggleNotificationSound() {
    if (soundEnabled) {
      disableNotificationSound();
      return;
    }
    await enableNotificationSound();
  }

  async function testNotificationSound() {
    const unlocked = audioUnlocked || await unlockAudio(hornAudioRef.current);
    if (unlocked) {
      localStorage.setItem("oestegou_notification_sound", "enabled");
      setSoundEnabled(true);
      await playHorn(hornAudioRef.current);
    } else {
      toast.error("Som bloqueado", { description: "Clique em ativar buzina e confira a permissão de áudio do navegador." });
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !soundEnabled) return;
    async function handleFirstInteraction() {
      const unlocked = await unlockAudio(hornAudioRef.current);
      if (unlocked && pendingSoundRef.current) {
        pendingSoundRef.current = false;
        await playHorn(hornAudioRef.current);
      }
    }
    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);
    window.addEventListener("touchend", handleFirstInteraction);
    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("touchend", handleFirstInteraction);
    };
  }, [isAuthenticated, soundEnabled]);

  function resolveRoute(notification: AppNotification) {
    if (notification.link) return notification.link;
    if (notification.metadata?.routeId) return user?.role === "admin" ? "/admin/horarios" : "/aluno";
    if (notification.metadata?.scheduleId) return "/aluno";
    return user?.role === "admin" ? "/admin" : "/aluno/notificacoes";
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    async function handleNewNotification(notification: AppNotification) {
      if (soundEnabled && isExternalStudentNotification(notification, user)) {
        if (audioUnlocked) await playHorn(hornAudioRef.current);
        else pendingSoundRef.current = true;
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
  }, [isAuthenticated, navigate, user, soundEnabled]);

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

  const value = useMemo(() => ({ notifications, unreadCount, loading, soundEnabled, refreshNotifications, markAsRead, markAllAsRead, enableNotificationSound, disableNotificationSound, toggleNotificationSound, testNotificationSound }), [notifications, unreadCount, loading, soundEnabled, refreshNotifications]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
