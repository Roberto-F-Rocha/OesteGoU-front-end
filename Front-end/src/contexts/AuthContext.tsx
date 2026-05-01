import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { api } from "@/lib/api";

export type UserRole = "admin" | "student" | "driver";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("oestegou:accessToken");

      if (!token) return;

      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        localStorage.removeItem("oestegou:accessToken");
        localStorage.removeItem("oestegou:refreshToken");
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const { data } = await api.post("/auth/login", {
        email,
        senha: password,
      });

      if (data.user.role !== role) return false;

      localStorage.setItem("oestegou:accessToken", data.accessToken);
      localStorage.setItem("oestegou:refreshToken", data.refreshToken);
      localStorage.setItem("oestegou:user", JSON.stringify(data.user));

      setUser(data.user);

      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("oestegou:accessToken");
    localStorage.removeItem("oestegou:refreshToken");
    localStorage.removeItem("oestegou:user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
