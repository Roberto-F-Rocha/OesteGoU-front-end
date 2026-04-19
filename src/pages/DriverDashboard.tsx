import { Routes, Route, Navigate } from "react-router-dom";
import { Calendar, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import DriverSchedule from "./driver/DriverSchedule";
import DriverStudents from "./driver/DriverStudents";

const navItems = [
  { label: "Minha Escala", path: "/motorista", icon: Calendar },
  { label: "Alunos", path: "/motorista/alunos", icon: Users },
];

export default function DriverDashboard() {
  return (
    <DashboardLayout navItems={navItems} title="Painel do Motorista">
      <Routes>
        <Route index element={<DriverSchedule />} />
        <Route path="alunos" element={<DriverStudents />} />
        <Route path="*" element={<Navigate to="/motorista" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
