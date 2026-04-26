import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/contexts/AuthContext";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";
import RoleRedirect from "./routes/RoleRedirect";

import Login from "./pages/Login";
import Register from "./pages/Register";

import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import DriverDashboard from "./pages/DriverDashboard";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      {/* HOME INTELIGENTE */}
      <Route path="/" element={<RoleRedirect />} />

      {/* ROTAS PÚBLICAS (bloqueia usuário logado) */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro/aluno" element={<Register role="student" />} />
        <Route path="/cadastro/admin" element={<Register role="admin" />} />
      </Route>

      {/* ADMIN */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Route>

      {/* STUDENT */}
      <Route element={<ProtectedRoute roles={["student"]} />}>
        <Route path="/aluno/*" element={<StudentDashboard />} />
      </Route>

      {/* DRIVER */}
      <Route element={<ProtectedRoute roles={["driver"]} />}>
        <Route path="/motorista/*" element={<DriverDashboard />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}