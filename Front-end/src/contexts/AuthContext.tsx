import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api } from "@/lib/api";

export type UserRole = "admin" | "student" | "driver";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photo?: string;
  city?: string;
  state?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// storage keys
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const isAuthenticated = !!user && !loading;

  // sessão inicial
  useEffect(() => {
    async function loadSession() {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        setUser(response.data);
      } catch {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, []);

  // LOGIN
  async function login(email: string, password: string) {
    try {
      setAuthLoading(true);

      const response = await api.post("/auth/login", {
        email,
        senha: password,
      });

      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

      setUser(user);
    } finally {
      setAuthLoading(false);
    }
  }

  // LOGOUT
  function logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);

    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authLoading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// hook seguro
export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}