import { Routes, Route, Navigate } from "react-router-dom";
import { Bus, Calendar, Users, FileText } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import DriverSchedule from "./driver/DriverSchedule";
import DriverStudents from "./driver/DriverStudents";
import DriverFleet from "./driver/DriverFleet";
import MyDocuments from "./documents/MyDocuments";

const navItems = [
  { label: "Minha Escala", path: "/motorista", icon: Calendar },
  { label: "Alunos", path: "/motorista/alunos", icon: Users },
  { label: "Frota", path: "/motorista/frota", icon: Bus },
  { label: "Documentos", path: "/motorista/documentos", icon: FileText },
];

export default function DriverDashboard() {
  return (
    <DashboardLayout navItems={navItems} title="Painel do Motorista">
      <Routes>
        <Route index element={<DriverSchedule />} />
        <Route path="alunos" element={<DriverStudents />} />
        <Route path="frota" element={<DriverFleet />} />
        <Route path="documentos" element={<MyDocuments />} />
        <Route path="*" element={<Navigate to="/motorista" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
