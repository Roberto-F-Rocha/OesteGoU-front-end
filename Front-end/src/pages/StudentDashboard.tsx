import { Routes, Route, Navigate } from "react-router-dom";
import { Bus, Clock, Bell, FileText } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StudentTrip from "./student/StudentTrip";
import StudentSchedules from "./student/StudentSchedules";
import StudentNotifications from "./student/StudentNotifications";
import MyDocuments from "../documents/MyDocuments";

const navItems = [
  { label: "Minha Viagem", path: "/aluno", icon: Bus },
  { label: "Horários", path: "/aluno/horarios", icon: Clock },
  { label: "Notificações", path: "/aluno/notificacoes", icon: Bell },
  { label: "Documentos", path: "/aluno/documentos", icon: FileText },
];

export default function StudentDashboard() {
  return (
    <DashboardLayout navItems={navItems} title="Painel do Aluno">
      <Routes>
        <Route index element={<StudentTrip />} />
        <Route path="horarios" element={<StudentSchedules />} />
        <Route path="notificacoes" element={<StudentNotifications />} />
        <Route path="documentos" element={<MyDocuments />} />
        <Route path="*" element={<Navigate to="/aluno" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
