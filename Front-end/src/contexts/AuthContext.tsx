import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { api } from "@/lib/api";
import { registerPush } from "@/lib/push";
import { connectSocket, disconnectSocket, refreshSocketToken } from "@/services/socket";

export type UserRole = "admin" | "student" | "driver";

interface City { id: number; name: string; state: string; }
interface User { id: number; name: string; nome?: string; email: string; role: UserRole; status?: string; cityId?: number | null; city?: City | null; photo?: string | null; }
interface AuthContextType { user: User | null; login: (email: string, password: string, role: UserRole) => Promise<boolean>; logout: () => Promise<void>; refreshUser: () => Promise<void>; isAuthenticated: boolean; isLoading: boolean; }

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeUser(data: any): User { return { ...data, name: data?.name ?? data?.nome ?? "Usuário", nome: data?.nome ?? data?.name ?? "Usuário", photo: data?.photo ?? null }; }
function clearAuthStorage() { localStorage.removeItem("oestegou:accessToken"); localStorage.removeItem("oestegou:refreshToken"); localStorage.removeItem("oestegou:user"); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshUser() {
    const { data } = await api.get("/auth/me");
    const normalized = normalizeUser(data);
    setUser(normalized);
    localStorage.setItem("oestegou:user", JSON.stringify(normalized));
    refreshSocketToken();
  }

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("oestegou:accessToken");
      if (!token) { setIsLoading(false); return; }
      try { await refreshUser(); connectSocket(); registerPush(); }
      catch { clearAuthStorage(); disconnectSocket(); setUser(null); }
      finally { setIsLoading(false); }
    };
    loadUser();
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const { data } = await api.post("/auth/login", { email: email.trim().toLowerCase(), senha: password });
      const normalizedUser = normalizeUser(data.user);
      if (normalizedUser.role !== role) return false;
      if (normalizedUser.status && normalizedUser.status !== "active") return false;
      localStorage.setItem("oestegou:accessToken", data.accessToken);
      localStorage.setItem("oestegou:refreshToken", data.refreshToken);
      localStorage.setItem("oestegou:user", JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      connectSocket();
      registerPush();
      return true;
    } catch { return false; }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("oestegou:refreshToken");
    try { if (refreshToken) await api.post("/auth/logout", { refreshToken }); }
    catch { /* remove sessão local mesmo se API falhar */ }
    finally { clearAuthStorage(); disconnectSocket(); setUser(null); }
  };

  return <AuthContext.Provider value={{ user, login, logout, refreshUser, isAuthenticated: !!user, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used within AuthProvider"); return ctx; }
