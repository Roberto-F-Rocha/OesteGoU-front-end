import { createContext, useContext, useState, ReactNode } from "react";
import { getAllAdmins, getAllUsers } from "@/data/registrationsStore";

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
  login: (email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const mockUsers: Record<string, User & { password: string }> = {
  "admin@altobus.com": { id: "1", name: "Administrador", email: "admin@altobus.com", role: "admin", password: "admin123", city: "Riacho da Cruz", state: "RN" },
  "aluno@altobus.com": { id: "2", name: "João Silva", email: "aluno@altobus.com", role: "student", password: "aluno123", city: "Riacho da Cruz", state: "RN" },
  "motorista@altobus.com": { id: "3", name: "Carlos Oliveira", email: "motorista@altobus.com", role: "driver", password: "motorista123", city: "Riacho da Cruz", state: "RN" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string, role: UserRole): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    const found = mockUsers[normalizedEmail];
    if (found && found.password === password && found.role === role) {
      const { password: _, ...userData } = found;
      setUser(userData);
      return true;
    }

    if (role === "admin") {
      const admin = getAllAdmins().find(
        (item) => item.responsible.email.toLowerCase() === normalizedEmail && item.responsible.password === password,
      );
      if (admin) {
        setUser({
          id: admin.id,
          name: admin.responsible.name,
          email: admin.responsible.email,
          role: "admin",
          photo: admin.responsible.photo ?? undefined,
          city: admin.city,
          state: admin.state,
        });
        return true;
      }
      return false;
    }

    const storedUser = getAllUsers().find(
      (item) => item.email.toLowerCase() === normalizedEmail && item.password === password && item.role === role,
    );

    if (storedUser) {
      setUser({
        id: storedUser.id,
        name: storedUser.name,
        email: storedUser.email,
        role: storedUser.role,
        photo: storedUser.photo ?? undefined,
        city: storedUser.address.city,
        state: storedUser.address.state,
      });
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
