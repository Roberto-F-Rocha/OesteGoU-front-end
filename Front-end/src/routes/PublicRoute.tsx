import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";

export default function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // se já logado → manda pra área correta
  if (user) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "driver") return <Navigate to="/motorista" replace />;
    return <Navigate to="/aluno" replace />;
  }

  return <Outlet />;
}