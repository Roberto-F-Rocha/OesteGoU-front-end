import { Routes, Route, Navigate } from "react-router-dom";
import { Calendar, GraduationCap, LayoutDashboard, Truck } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import AdminOverview from "./admin/AdminOverview";
import AdminStudents from "./admin/AdminStudents";
import AdminDrivers from "./admin/AdminDrivers";
import AdminSchedules from "./admin/AdminSchedules";

export default function AdminDashboard() {
  const { user } = useAuth();
  const adminCity = user?.city ?? "Riacho da Cruz";
  const adminState = user?.state ?? "RN";

  const navItems = [
    { label: "Painel", path: "/admin", icon: LayoutDashboard },
    { label: "Alunos", path: "/admin/alunos", icon: GraduationCap },
    { label: "Motoristas", path: "/admin/motoristas", icon: Truck },
    { label: "Horários", path: "/admin/horarios", icon: Calendar },
  ];

  return (
    <DashboardLayout navItems={navItems} title={`Administração · ${adminCity}`}>
      <Routes>
        <Route index element={<AdminOverview adminCity={adminCity} adminState={adminState} />} />
        <Route path="alunos" element={<AdminStudents adminCity={adminCity} adminState={adminState} />} />
        <Route path="motoristas" element={<AdminDrivers adminCity={adminCity} adminState={adminState} />} />
        <Route path="horarios" element={<AdminSchedules adminCity={adminCity} adminState={adminState} />} />
        <Route path="escalas" element={<Navigate to="/admin/horarios" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
