import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { socket } from "@/services/socket";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, role }: { children: React.ReactNode; role: string }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== role) return <Navigate to="/login" />;
  return <>{children}</>;
}

function RealtimeListeners() {
  useEffect(() => {
    socket.on("notification:new", (data) => {
      console.log("NOTIF:", data);
    });

    socket.on("route:occupancy-updated", (data) => {
      console.log("LOTAÇÃO:", data);
    });

    socket.on("route:capacity-alert", (data) => {
      console.log("ALERTA DE LOTAÇÃO:", data);
      alert("Ônibus lotado!");
    });

    socket.on("admin:capacity-alert", (data) => {
      console.log("ALERTA ADMIN:", data);
      alert("Alerta de lotação em uma rota!");
    });

    socket.on("trip:reminder", (data) => {
      alert(data.message || "Sua viagem está próxima!");
    });

    return () => {
      socket.off("notification:new");
      socket.off("route:occupancy-updated");
      socket.off("route:capacity-alert");
      socket.off("admin:capacity-alert");
      socket.off("trip:reminder");
    };
  }, []);

  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro/aluno" element={<Register role="student" />} />
      <Route path="/cadastro/motorista" element={<Navigate to="/login" replace />} />
      <Route path="/cadastro/admin" element={<Register role="admin" />} />
      <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/aluno/*" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/motorista/*" element={<ProtectedRoute role="driver"><DriverDashboard /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RealtimeListeners />
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
