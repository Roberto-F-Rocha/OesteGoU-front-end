import { Routes, Route, Navigate } from "react-router-dom";
import { Bus, Clock, Bell } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StudentTrip from "./student/StudentTrip";
import StudentSchedules from "./student/StudentSchedules";
import StudentNotifications from "./student/StudentNotifications";

const navItems = [
  { label: "Minha Viagem", path: "/aluno", icon: Bus },
  { label: "Horários", path: "/aluno/horarios", icon: Clock },
  { label: "Notificações", path: "/aluno/notificacoes", icon: Bell },
];

export default function StudentDashboard() {
  return (
    <DashboardLayout navItems={navItems} title="Painel do Aluno">
      <Routes>
        <Route index element={<StudentTrip />} />
        <Route path="horarios" element={<StudentSchedules />} />
        <Route path="notificacoes" element={<StudentNotifications />} />
        <Route path="*" element={<Navigate to="/aluno" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
