import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  Calendar,
  Clock,
  GraduationCap,
  LayoutDashboard,
  School,
  Truck,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getConfirmationRowsByCity,
  getDriversByCity,
  getSchedulesByCity,
  getStudentsByCity,
} from "@/data/registrationsStore";
import { listBusesByCity, countOpenTicketsByCity } from "@/data/fleetStore";
import { listShiftsByCity } from "@/data/shiftsStore";
import { listUniversitiesByCity } from "@/data/universitiesStore";
import { cn } from "@/lib/utils";

interface Props {
  adminCity: string;
  adminState: string;
}

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: typeof LayoutDashboard;
  to: string;
  tone: "primary" | "success" | "warning" | "info" | "danger";
}

const TONE: Record<MetricCardProps["tone"], string> = {
  primary: "from-primary/15 to-primary/5 text-primary border-primary/20",
  success:
    "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning:
    "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
  info: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20",
  danger:
    "from-destructive/15 to-destructive/5 text-destructive border-destructive/20",
};

function MetricCard({ title, value, subtitle, icon: Icon, to, tone }: MetricCardProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        "group text-left relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all hover:shadow-md hover:-translate-y-0.5",
        TONE[tone],
      )}
    >
      <div className="flex items-start justify-between">
        <div className="rounded-xl bg-background/70 p-2.5 border border-border/50">
          <Icon className="w-5 h-5" />
        </div>
        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="mt-4">
        <p className="text-3xl font-heading font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{title}</p>
        {subtitle ? (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        ) : null}
      </div>
    </button>
  );
}

interface SectionGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SectionGroup({ title, description, children }: SectionGroupProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-heading font-semibold text-foreground uppercase tracking-wider">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </section>
  );
}

export default function AdminOverview({ adminCity, adminState }: Props) {
  const students = useMemo(() => getStudentsByCity(adminCity), [adminCity]);
  const drivers = useMemo(() => getDriversByCity(adminCity), [adminCity]);
  const schedules = useMemo(() => getSchedulesByCity(adminCity), [adminCity]);
  const buses = useMemo(() => listBusesByCity(adminCity), [adminCity]);
  const shifts = useMemo(() => listShiftsByCity(adminCity, adminState), [adminCity, adminState]);
  const universities = useMemo(() => listUniversitiesByCity(adminCity), [adminCity]);
  const openTickets = useMemo(() => countOpenTicketsByCity(adminCity), [adminCity]);
  const confirmationRows = useMemo(() => getConfirmationRowsByCity(adminCity), [adminCity]);

  const pendingNotifications = confirmationRows.filter(
    (row) => row.notificationStatus === "pending_notification",
  );
  const pendingStudents = students.filter((s) => s.status === "pending").length;
  const activeBuses = buses.filter((b) => b.status !== "inactive").length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Painel administrativo
          </p>
          <h1 className="text-3xl font-heading font-bold text-foreground mt-1">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {adminCity} / {adminState} · visão geral consolidada
          </p>
        </div>
        {(pendingNotifications.length > 0 || pendingStudents > 0 || openTickets > 0) && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {pendingNotifications.length + pendingStudents + openTickets} pendência(s)
          </Badge>
        )}
      </div>

      {/* Pessoas */}
      <SectionGroup title="Pessoas" description="Quem usa o sistema na sua cidade.">
        <MetricCard
          title="Alunos"
          value={students.length}
          subtitle={pendingStudents > 0 ? `${pendingStudents} pendente(s)` : "Todos ativos"}
          icon={GraduationCap}
          to="/admin/alunos"
          tone="primary"
        />
        <MetricCard
          title="Motoristas"
          value={drivers.length}
          subtitle="Cadastros ativos"
          icon={Truck}
          to="/admin/motoristas"
          tone="info"
        />
      </SectionGroup>

      {/* Transporte */}
      <SectionGroup title="Transporte" description="Frota, horários e turnos do município.">
        <MetricCard
          title="Frota"
          value={buses.length}
          subtitle={`${activeBuses} em operação · ${openTickets} chamado(s)`}
          icon={Bus}
          to="/admin/frota"
          tone={openTickets > 0 ? "warning" : "success"}
        />
        <MetricCard
          title="Horários ativos"
          value={schedules.length}
          subtitle="Rotas semanais cadastradas"
          icon={Calendar}
          to="/admin/horarios"
          tone="primary"
        />
        <MetricCard
          title="Turnos"
          value={shifts.length}
          subtitle="Manhã, tarde e noite — horário fixo da cidade"
          icon={Clock}
          to="/admin/turnos"
          tone="info"
        />
      </SectionGroup>

      {/* Cadastros */}
      <SectionGroup title="Cadastros" description="Catálogos usados pelos formulários do app.">
        <MetricCard
          title="Universidades"
          value={universities.length}
          subtitle="Vinculadas aos horários"
          icon={School}
          to="/admin/universidade"
          tone="success"
        />
      </SectionGroup>

      {/* Pendências */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-heading font-semibold text-foreground uppercase tracking-wider">
            Pendências
          </h2>
          <Badge variant="secondary">{pendingNotifications.length}</Badge>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {pendingNotifications.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground flex items-center justify-between">
              <span>Nenhuma pendência de confirmação no momento. 🎉</span>
              {openTickets > 0 ? (
                <Button size="sm" variant="outline" onClick={() => window.location.assign("/admin/frota")}>
                  <Wrench className="w-4 h-4 mr-1.5" /> Ver chamados
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pendingNotifications.slice(0, 6).map((row) => (
                <li key={row.student.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{row.student.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.student.institution}</p>
                  </div>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 shrink-0">
                    Pendente
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
