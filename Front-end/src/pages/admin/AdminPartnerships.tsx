import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Bus, CheckCircle2, Building2, Clock, Link2, MessageSquareWarning, Plus, RefreshCw, Users, XCircle } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type CityInfo = { id: number; name: string; state: string };

type Agreement = {
  id: number;
  title?: string | null;
  description?: string | null;
  status: "pending" | "active" | "rejected" | "inactive" | "canceled" | string;
  requesterCity?: CityInfo | null;
  partnerCity?: CityInfo | null;
  requestedBy?: { nome: string; email: string } | null;
  approvedBy?: { nome: string; email: string } | null;
  createdAt?: string;
};

type CityMetric = {
  cityId: number | null;
  city: CityInfo | null;
  total: number;
  isOwnCity?: boolean;
};

type ShiftMetric = {
  cityId: number;
  city: CityInfo | null;
  dayOfWeek: string;
  shift: "manha" | "tarde" | "noite" | string;
  total: number;
};

type LoadRanking = {
  routeId: number;
  routeName: string;
  routeCity?: CityInfo | null;
  dayOfWeek: string;
  shift: string;
  scheduleTime?: string;
  university?: string;
  totalStudents: number;
  studentsByCity: Record<string, number>;
  vehicle?: { name?: string | null; plate?: string; capacity?: number | null } | null;
};

type AnalyticsData = {
  partnership?: {
    agreements: Agreement[];
    studentsTotalNetwork: number;
    driversTotalNetwork: number;
    vehiclesTotalNetwork: number;
    routesTotalNetwork: number;
    studentsByCity: CityMetric[];
    studentsByCityAndShift: ShiftMetric[];
    driversByCity: CityMetric[];
    vehiclesByCity: CityMetric[];
    routesByCity: CityMetric[];
    loadRanking: LoadRanking[];
    recentNotifications: Array<{ id: number; title: string; message: string; type: string; createdAt?: string; user?: { nome: string; city?: CityInfo | null } }>;
  };
};

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  active: "Ativo",
  rejected: "Rejeitado",
  inactive: "Inativo",
  canceled: "Cancelado",
};

const shiftLabel: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

function cityLabel(city?: CityInfo | null) {
  return city ? `${city.name}/${city.state}` : "Cidade não informada";
}

function StatCard({ title, value, icon: Icon, description, tone = "primary" }: { title: string; value: number; icon: typeof Users; description?: string; tone?: "primary" | "success" | "warning" | "info" }) {
  const toneClass = {
    primary: "text-primary bg-primary/10 border-primary/20",
    success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    info: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-heading font-bold text-foreground">{value}</p>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <div className={cn("rounded-xl border p-2.5", toneClass)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

export default function AdminPartnerships() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [cities, setCities] = useState<CityInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ partnerCityId: "", title: "", description: "" });

  const partnership = analytics?.partnership;

  async function loadData() {
    try {
      setLoading(true);
      const [analyticsRes, agreementsRes, citiesRes] = await Promise.all([
        api.get("/admin/analytics/dashboard"),
        api.get("/cities/agreements"),
        api.get("/cities"),
      ]);

      setAnalytics(analyticsRes.data ?? null);
      setAgreements(agreementsRes.data ?? []);
      setCities(citiesRes.data ?? []);
    } catch {
      toast({ title: "Erro ao carregar parcerias", description: "Não foi possível buscar os dados de parceria.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeAgreements = useMemo(() => agreements.filter((agreement) => agreement.status === "active"), [agreements]);
  const pendingAgreements = useMemo(() => agreements.filter((agreement) => agreement.status === "pending"), [agreements]);

  async function createAgreement() {
    if (!form.partnerCityId) {
      toast({ title: "Selecione uma cidade", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/cities/agreements", {
        partnerCityId: Number(form.partnerCityId),
        title: form.title || "Vínculo de transporte universitário",
        description: form.description || undefined,
      });
      toast({ title: "Solicitação enviada", description: "O vínculo foi enviado para análise." });
      setForm({ partnerCityId: "", title: "", description: "" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Erro ao solicitar vínculo", description: error?.response?.data?.error ?? "Não foi possível criar a solicitação.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateAgreementStatus(id: number, status: string) {
    try {
      await api.patch(`/cities/agreements/${id}`, { status });
      toast({ title: "Vínculo atualizado", description: `Status alterado para ${statusLabel[status] ?? status}.` });
      await loadData();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar vínculo", description: error?.response?.data?.error ?? "Não foi possível atualizar o vínculo.", variant: "destructive" });
    }
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">Carregando painel de parcerias...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Parcerias entre cidades"
        description="Solicite vínculos, acompanhe demanda por cidade e identifique sobrecarga por turno e dia."
        icon={Link2}
        actions={<Button variant="outline" onClick={loadData}><RefreshCw className="w-4 h-4 mr-2" /> Atualizar</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard title="Alunos na rede" value={partnership?.studentsTotalNetwork ?? 0} icon={Users} description="Minha cidade + parceiras" tone="primary" />
        <StatCard title="Motoristas" value={partnership?.driversTotalNetwork ?? 0} icon={Users} description="Total por cidades vinculadas" tone="info" />
        <StatCard title="Ônibus ofertados" value={partnership?.vehiclesTotalNetwork ?? 0} icon={Bus} description="Frota disponível na rede" tone="success" />
        <StatCard title="Vínculos ativos" value={activeAgreements.length} icon={CheckCircle2} description={`${pendingAgreements.length} pendente(s)`} tone="warning" />
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 rounded-2xl border border-border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-heading font-semibold text-foreground flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Solicitar vínculo</h2>
            <p className="text-xs text-muted-foreground">Envie solicitação para integrar sua cidade com outra.</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Cidade parceira</Label>
              <select value={form.partnerCityId} onChange={(event) => setForm((current) => ({ ...current, partnerCityId: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {cities.map((city) => <option key={city.id} value={city.id}>{city.name}/{city.state}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Convênio de transporte universitário" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Descreva o motivo da parceria..." className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <Button className="w-full" onClick={createAgreement} disabled={submitting}>{submitting ? "Enviando..." : "Solicitar vínculo"}</Button>
          </div>
        </div>

        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-heading font-semibold text-foreground flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Vínculos existentes</h2>
            <p className="text-xs text-muted-foreground">Solicitações e parcerias da sua cidade.</p>
          </div>
          {agreements.length === 0 ? <EmptyState text="Nenhum vínculo encontrado." /> : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cidades</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements.map((agreement) => (
                    <TableRow key={agreement.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{cityLabel(agreement.requesterCity)} ↔ {cityLabel(agreement.partnerCity)}</p>
                        <p className="text-xs text-muted-foreground">{agreement.title ?? "Vínculo entre cidades"}</p>
                      </TableCell>
                      <TableCell><Badge variant={agreement.status === "active" ? "default" : agreement.status === "rejected" ? "destructive" : "secondary"}>{statusLabel[agreement.status] ?? agreement.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{agreement.requestedBy?.nome ?? "Não informado"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{agreement.createdAt ? new Date(agreement.createdAt).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {agreement.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => updateAgreementStatus(agreement.id, "active")}><CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar</Button>
                              <Button size="sm" variant="outline" onClick={() => updateAgreementStatus(agreement.id, "rejected")}><XCircle className="w-4 h-4 mr-1" /> Rejeitar</Button>
                            </>
                          )}
                          {agreement.status === "active" && <Button size="sm" variant="outline" onClick={() => updateAgreementStatus(agreement.id, "inactive")}>Inativar</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <MetricTable title="Alunos por cidade" icon={Users} data={partnership?.studentsByCity ?? []} />
        <MetricTable title="Motoristas por cidade" icon={Users} data={partnership?.driversByCity ?? []} />
        <MetricTable title="Ônibus ofertados por cidade" icon={Bus} data={partnership?.vehiclesByCity ?? []} />
        <MetricTable title="Rotas por cidade" icon={BarChart3} data={partnership?.routesByCity ?? []} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Alunos por cidade, dia e turno</h2>
          <p className="text-xs text-muted-foreground">Ajuda a entender demanda por município e período.</p>
        </div>
        {(partnership?.studentsByCityAndShift?.length ?? 0) === 0 ? <EmptyState text="Ainda não há dados por turno." /> : (
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader><TableRow><TableHead>Cidade</TableHead><TableHead>Dia</TableHead><TableHead>Turno</TableHead><TableHead className="text-right">Alunos</TableHead></TableRow></TableHeader>
              <TableBody>
                {partnership?.studentsByCityAndShift.map((row, index) => (
                  <TableRow key={`${row.cityId}-${row.dayOfWeek}-${row.shift}-${index}`}>
                    <TableCell>{cityLabel(row.city)}</TableCell>
                    <TableCell>{row.dayOfWeek}</TableCell>
                    <TableCell><Badge variant="secondary">{shiftLabel[row.shift] ?? row.shift}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600" /> Ranking de maior carga</h2>
          <p className="text-xs text-muted-foreground">Rotas com maior volume por dia e turno, incluindo composição por cidade.</p>
        </div>
        {(partnership?.loadRanking?.length ?? 0) === 0 ? <EmptyState text="Ainda não há ranking de carga." /> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {partnership?.loadRanking.map((item, index) => {
              const capacity = item.vehicle?.capacity ?? 0;
              const over = capacity > 0 && item.totalStudents > capacity;
              return (
                <div key={`${item.routeId}-${item.dayOfWeek}-${item.shift}`} className={cn("rounded-xl border p-4 bg-background/50", over ? "border-amber-500/40" : "border-border")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">#{index + 1} · {item.dayOfWeek} · {shiftLabel[item.shift] ?? item.shift}</p>
                      <p className="font-heading font-semibold text-foreground truncate">{item.routeName}</p>
                      <p className="text-xs text-muted-foreground">{item.scheduleTime ?? "--:--"} · {item.university ?? "Universidade não informada"}</p>
                    </div>
                    <Badge variant={over ? "destructive" : "secondary"}>{item.totalStudents}{capacity ? `/${capacity}` : ""}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(item.studentsByCity ?? {}).map(([city, total]) => <Badge key={city} variant="outline">{city}: {total}</Badge>)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2"><MessageSquareWarning className="w-5 h-5 text-primary" /> Alertas e superlotação</h2>
          <p className="text-xs text-muted-foreground">Notificações críticas da sua cidade e cidades parceiras.</p>
        </div>
        {(partnership?.recentNotifications?.length ?? 0) === 0 ? <EmptyState text="Nenhum alerta recente." /> : (
          <div className="space-y-2">
            {partnership?.recentNotifications.map((notification) => (
              <div key={notification.id} className="rounded-xl border border-border bg-background/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading font-semibold text-foreground">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{notification.user?.nome ?? "Usuário"} · {cityLabel(notification.user?.city)} {notification.createdAt ? `· ${new Date(notification.createdAt).toLocaleString("pt-BR")}` : ""}</p>
                  </div>
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricTable({ title, icon: Icon, data }: { title: string; icon: typeof Users; data: CityMetric[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="font-heading font-semibold text-foreground flex items-center gap-2"><Icon className="w-5 h-5 text-primary" /> {title}</h2>
      {data.length === 0 ? <EmptyState text="Nenhum dado encontrado." /> : (
        <div className="space-y-2">
          {data.map((item) => (
            <div key={`${title}-${item.cityId}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
              <div>
                <p className="font-medium text-foreground">{cityLabel(item.city)}</p>
                {item.isOwnCity ? <p className="text-xs text-primary">Sua cidade</p> : <p className="text-xs text-muted-foreground">Cidade parceira</p>}
              </div>
              <p className="text-xl font-heading font-bold text-foreground">{item.total}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
