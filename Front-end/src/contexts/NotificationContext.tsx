import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { socket } from "@/services/socket";
import { useAuth } from "@/contexts/AuthContext";
import { playNotificationHorn } from "@/lib/notificationSound";

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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  function resolveRoute(notification: AppNotification) {
    if (notification.link) return notification.link;

    if (notification.metadata?.routeId) {
      return user?.role === "admin" ? "/admin/horarios" : "/aluno";
    }

    if (notification.metadata?.scheduleId) {
      return "/aluno";
    }

    return user?.role === "admin" ? "/admin" : "/aluno/notificacoes";
  }

  useEffect(() => {
    if (!isAuthenticated) return;

    function handleNewNotification(notification: AppNotification) {
      playNotificationHorn();

      setNotifications((current) => {
        if (notification.id && current.some((item) => item.id === notification.id)) return current;
        return [notification, ...current];
      });
      setUnreadCount((count) => count + 1);

      toast(notification.title || "Nova notificação", {
        description: notification.message,
        action: {
          label: "Abrir",
          onClick: () => navigate(resolveRoute(notification)),
        },
      });
    }

    function handleTripReminder(data: { message?: string }) {
      playNotificationHorn();

      toast("Sua viagem está próxima", {
        description: data.message || "Seu ônibus sai em breve!",
        action: {
          label: "Ver viagem",
          onClick: () => navigate("/aluno"),
        },
      });
    }

    function handleCapacityAlert(data: any) {
      playNotificationHorn();

      toast.warning("Alerta de lotação", {
        description: data.current && data.capacity ? `Ônibus com ${data.current}/${data.capacity}` : "Capacidade excedida",
        action: {
          label: "Ver rota",
          onClick: () => navigate("/admin/horarios"),
        },
      });
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

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  }), [notifications, unreadCount, loading, refreshNotifications]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
