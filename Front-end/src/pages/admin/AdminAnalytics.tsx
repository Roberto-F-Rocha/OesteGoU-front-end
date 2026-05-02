import { useEffect, useState } from "react";
import { Activity, Bell, Bus, FileText, Route, Users } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { api } from "@/lib/api";

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get("/admin/analytics/dashboard").then((res) => setData(res.data));
  }, []);

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-muted-foreground">Carregando métricas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Analytics"
        description="Indicadores operacionais do sistema."
        icon={Activity}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard icon={Users} label="Usuários" value={data.totalUsers} />
        <MetricCard icon={Route} label="Rotas" value={data.totalRoutes} />
        <MetricCard icon={Bus} label="Veículos" value={data.totalVehicles} />
        <MetricCard icon={Bell} label="Push enviados" value={data.totalPushSent} />
        <MetricCard icon={FileText} label="Documentos" value={data.totalDocuments} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListCard title="Usuários por perfil" items={data.usersByRole} nameKey="role" />
        <ListCard title="Usuários por status" items={data.usersByStatus} nameKey="status" />
        <ListCard title="Reservas por status" items={data.reservations} nameKey="status" />
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-heading font-semibold text-foreground mb-3">Últimos push enviados</h2>
          {(data.latestPushes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum envio encontrado.</p>
          ) : (
            <div className="space-y-2">
              {data.latestPushes.map((item: any) => (
                <div key={item.id} className="border border-border rounded-lg p-3 text-sm">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-muted-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.recipients} destinatário(s) · {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <p className="text-2xl font-heading font-bold text-foreground">{value ?? 0}</p>
    </div>
  );
}

function ListCard({ title, items, nameKey }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h2 className="font-heading font-semibold text-foreground mb-3">{title}</h2>
      <div className="space-y-2">
        {(items ?? []).map((item: any) => (
          <div key={item[nameKey]} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2">
            <span className="text-muted-foreground">{item[nameKey]}</span>
            <span className="font-semibold text-foreground">{item._count ?? item.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}