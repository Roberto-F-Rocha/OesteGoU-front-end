import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";

interface Props {
  roles?: UserRole[];
}

export default function ProtectedRoute({ roles }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // evita flicker de tela
  if (loading) return <LoadingScreen />;

  // não autenticado → salva destino
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // sem permissão de role
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}