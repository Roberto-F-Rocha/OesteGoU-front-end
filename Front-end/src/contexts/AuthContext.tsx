import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { api } from "@/lib/api";

export type UserRole = "admin" | "student" | "driver";

interface City {
  id: number;
  name: string;
  state: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status?: string;
  cityId?: number | null;
  city?: City | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function clearAuthStorage() {
  localStorage.removeItem("oestegou:accessToken");
  localStorage.removeItem("oestegou:refreshToken");
  localStorage.removeItem("oestegou:user");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("oestegou:accessToken");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
        localStorage.setItem("oestegou:user", JSON.stringify(data));
      } catch {
        clearAuthStorage();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const { data } = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        senha: password,
      });

      if (data.user.role !== role) return false;
      if (data.user.status && data.user.status !== "active") return false;

      localStorage.setItem("oestegou:accessToken", data.accessToken);
      localStorage.setItem("oestegou:refreshToken", data.refreshToken);
      localStorage.setItem("oestegou:user", JSON.stringify(data.user));

      setUser(data.user);

      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("oestegou:refreshToken");

    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Mesmo que a API falhe, remove a sessão local.
    } finally {
      clearAuthStorage();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
