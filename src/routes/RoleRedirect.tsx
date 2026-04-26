import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function RoleRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === "driver") {
    return <Navigate to="/motorista" replace />;
  }

  return <Navigate to="/aluno" replace />;
}