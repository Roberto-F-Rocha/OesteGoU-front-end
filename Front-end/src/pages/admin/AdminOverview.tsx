import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  Calendar,
  GraduationCap,
  LayoutDashboard,
  School,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  adminCity: string;
  adminState: string;
}

interface DashboardData {
  students: number;
  drivers: number;
  admins: number;
  vehicles: number;
  routes: number;
  reservations: number;
  pendingUsers: number;
  activeAgreements: number;
  allowedCities: number[];
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
  success: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
  info: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20",
  danger: "from-destructive/15 to-destructive/5 text-destructive border-destructive/20",
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
        {subtitle ? <p className="text-xs text-muted-foreground mt-1">{subtitle}</p> : null}
      </div>
    </button>
  );
}

function SectionGroup({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-heading font-semibold text-foreground uppercase tracking-wider">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </section>
  );
}

export default function AdminOverview({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const response = await api.get("/admin/dashboard");
        setData(response.data);
      } catch {
        toast({
          title: "Erro ao carregar painel",
          description: "Não foi possível buscar os dados administrativos.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const pendingTotal = data?.pendingUsers ?? 0;

  if (loading) {
    return <div className="max-w-6xl mx-auto bg-card border border-border rounded-xl p-8 text-sm text-muted-foreground">Carregando painel administrativo...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Painel administrativo</p>
          <h1 className="text-3xl font-heading font-bold text-foreground mt-1">Bem-vindo de volta</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {adminCity} / {adminState} · visão geral consolidada
          </p>
        </div>
        {pendingTotal > 0 && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" /> {pendingTotal} pendência(s)
          </Badge>
        )}
      </div>

      <SectionGroup title="Pessoas" description="Quem usa o sistema na sua cidade.">
        <MetricCard title="Alunos" value={data?.students ?? 0} subtitle={(data?.pendingUsers ?? 0) > 0 ? `${data?.pendingUsers} pendente(s)` : "Todos ativos"} icon={GraduationCap} to="/admin/alunos" tone="primary" />
        <MetricCard title="Motoristas" value={data?.drivers ?? 0} subtitle="Cadastros ativos" icon={Truck} to="/admin/motoristas" tone="info" />
        <MetricCard title="Administradores" value={data?.admins ?? 0} subtitle="Gestores cadastrados" icon={LayoutDashboard} to="/admin/alunos" tone="success" />
      </SectionGroup>

      <SectionGroup title="Transporte" description="Frota, rotas e reservas do município.">
        <MetricCard title="Frota" value={data?.vehicles ?? 0} subtitle="Veículos cadastrados" icon={Bus} to="/admin/frota" tone="success" />
        <MetricCard title="Rotas" value={data?.routes ?? 0} subtitle="Rotas cadastradas" icon={Calendar} to="/admin/horarios" tone="primary" />
        <MetricCard title="Reservas" value={data?.reservations ?? 0} subtitle="Confirmações ativas" icon={GraduationCap} to="/admin/horarios" tone="info" />
      </SectionGroup>

      <SectionGroup title="Cadastros" description="Catálogos usados pelo sistema.">
        <MetricCard title="Universidades" value={0} subtitle="Acesse para listar e editar" icon={School} to="/admin/universidade" tone="success" />
        <MetricCard title="Acordos ativos" value={data?.activeAgreements ?? 0} subtitle="Vínculos entre cidades" icon={AlertTriangle} to="/admin" tone="warning" />
      </SectionGroup>
    </div>
  );
}
