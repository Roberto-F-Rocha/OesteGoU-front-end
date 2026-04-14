import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "student" | "driver";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photo?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock users for demo
const mockUsers: Record<string, User & { password: string }> = {
  "admin@altobus.com": { id: "1", name: "Administrador", email: "admin@altobus.com", role: "admin", password: "admin123" },
  "aluno@altobus.com": { id: "2", name: "João Silva", email: "aluno@altobus.com", role: "student", password: "aluno123" },
  "motorista@altobus.com": { id: "3", name: "Carlos Oliveira", email: "motorista@altobus.com", role: "driver", password: "motorista123" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string, role: UserRole): boolean => {
    const found = mockUsers[email];
    if (found && found.password === password && found.role === role) {
      const { password: _, ...userData } = found;
      setUser(userData);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

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
