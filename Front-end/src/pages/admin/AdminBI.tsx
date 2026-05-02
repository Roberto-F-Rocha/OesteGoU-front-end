import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import PageHeader from "@/components/admin/PageHeader";
import { api } from "@/lib/api";

const COLORS = ["#0f766e", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed"];

export default function AdminBI() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get("/admin/bi/dashboard").then((res) => setData(res.data));
  }, []);

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-muted-foreground">Carregando BI...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="BI e Ranking"
        description="Análise visual de uso, reservas, rotas e notificações."
        icon={BarChart3}
      />

      <ChartCard title="Ranking de rotas mais utilizadas">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data.routesRanking ?? []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Usuários por perfil">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.usersByRole ?? []} dataKey="total" nameKey="name" outerRadius={100} label>
                {(data.usersByRole ?? []).map((_: any, index: number) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Reservas por status">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.reservationsByStatus ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Documentos por status">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.documentsByStatus ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Push por público-alvo">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.pushByTarget ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 min-w-0">
      <h2 className="font-heading font-semibold text-foreground mb-4">{title}</h2>
      <div className="w-full min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}