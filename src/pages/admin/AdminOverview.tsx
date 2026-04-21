import { Calendar, GraduationCap, Shield, Truck } from "lucide-react";
import StatCard from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { getConfirmationRowsByCity, getDriversByCity, getSchedulesByCity, getStudentsByCity } from "@/data/registrationsStore";

interface Props {
  adminCity: string;
  adminState: string;
}

export default function AdminOverview({ adminCity, adminState }: Props) {
  const students = getStudentsByCity(adminCity);
  const drivers = getDriversByCity(adminCity);
  const schedules = getSchedulesByCity(adminCity);
  const confirmationRows = getConfirmationRowsByCity(adminCity);
  const pendingNotifications = confirmationRows.filter((row) => row.notificationStatus === "pending_notification");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Painel Administrativo</h1>
        <p className="text-sm text-muted-foreground">
          {adminCity} / {adminState}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Alunos" value={students.length} icon={GraduationCap} color="primary" />
        <StatCard title="Motoristas" value={drivers.length} icon={Truck} color="accent" />
        <StatCard title="Horários" value={schedules.length} icon={Calendar} color="secondary" />
        <StatCard title="Pendentes" value={pendingNotifications.length} icon={Shield} color="warning" />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-semibold text-foreground">Confirmações com pendência</h2>
          <Badge variant="secondary">{pendingNotifications.length} itens</Badge>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {pendingNotifications.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nenhuma pendência de confirmação no momento.</div>
          ) : (
            <ul className="divide-y divide-border">
              {pendingNotifications.slice(0, 6).map((row) => (
                <li key={row.student.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{row.student.name}</p>
                    <p className="text-xs text-muted-foreground">{row.student.institution}</p>
                  </div>
                  <Badge variant="secondary">Pendente de notificação</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
