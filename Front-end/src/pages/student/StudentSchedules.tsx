import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  Bus,
  Calendar,
  CheckCircle,
  Clock,
  GraduationCap,
  MapPin,
  Plus,
  School,
  Search,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

interface PickupPoint {
  id: number;
  name: string;
  address?: string | null;
}

interface RoutePoint {
  pickupPoint?: PickupPoint | null;
}

interface RouteItem {
  id: number;
  name: string;
  active: boolean;
  schedule?: {
    id: number;
    time: string;
    type: "ida" | "volta";
    university?: { name: string } | null;
  };
  city?: { name: string; state: string } | null;
  driver?: { nome: string } | null;
  vehicle?: { name?: string | null; plate: string; capacity?: number | null } | null;
  points?: RoutePoint[];
  reservations?: { id: number }[];
}

interface Reservation {
  id: number;
  status: "confirmed" | "canceled" | "absent";
  routeId: number;
  scheduleId: number;
  pickupPointId?: number | null;
  dayOfWeek?: string | null;
  schedule?: RouteItem["schedule"];
  route?: Omit<RouteItem, "schedule"> | null;
  pickupPoint?: PickupPoint | null;
}

const FILTERS = [
  { key: "Todos", label: "Todos" },
  { key: "ida", label: "Ida" },
  { key: "volta", label: "Volta" },
];

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function tripLabel(type?: string) {
  return type === "volta" ? "Volta" : "Ida";
}

function routePoints(route: RouteItem) {
  return (route.points ?? [])
    .map((item) => item.pickupPoint)
    .filter(Boolean) as PickupPoint[];
}

function universityName(route: RouteItem) {
  return route.schedule?.university?.name ?? route.name;
}

function reservationUniversity(reservation: Reservation) {
  return reservation.schedule?.university?.name ?? reservation.route?.name ?? "Universidade não informada";
}

const emptyForm = {
  university: "",
  dayOfWeek: "Segunda",
  type: "ida" as "ida" | "volta",
  routeId: "",
  pickupPointId: "",
};

export default function StudentSchedules() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function loadData(showLoading = false) {
    try {
      if (showLoading) setLoading(true);
      const [routesRes, reservationsRes] = await Promise.all([
        api.get("/routes/available"),
        api.get("/my-reservations"),
      ]);

      const availableRoutes: RouteItem[] = routesRes.data ?? [];
      setRoutes(availableRoutes.filter((route) => route.active));
      setReservations(reservationsRes.data ?? []);
    } catch {
      toast({
        title: "Erro ao carregar horários",
        description: "Não foi possível buscar as rotas disponíveis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(true);
  }, []);

  useLiveRefresh(() => loadData(false), { intervalMs: 10000 });

  const activeReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status === "confirmed"),
    [reservations],
  );

  const confirmedRouteIds = useMemo(
    () => new Set(activeReservations.map((reservation) => reservation.routeId)),
    [activeReservations],
  );

  const weeklyReservations = useMemo(() => {
    const grouped: Record<string, Reservation[]> = Object.fromEntries(DAYS.map((day) => [day, []]));

    activeReservations.forEach((reservation) => {
      const day = reservation.dayOfWeek || "Sem dia";
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(reservation);
    });

    Object.values(grouped).forEach((items) => {
      items.sort((a, b) => (a.schedule?.time ?? "").localeCompare(b.schedule?.time ?? ""));
    });

    return grouped;
  }, [activeReservations]);

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      const university = universityName(route);
      const q = search.trim().toLowerCase();
      const matchSearch = q
        ? `${university} ${route.name} ${route.driver?.nome ?? ""} ${route.city?.name ?? ""}`.toLowerCase().includes(q)
        : true;
      const matchType = filterType === "Todos" ? true : route.schedule?.type === filterType;
      return matchSearch && matchType;
    });
  }, [routes, search, filterType]);

  const counts = useMemo(() => ({
    total: routes.length,
    ida: routes.filter((route) => route.schedule?.type === "ida").length,
    volta: routes.filter((route) => route.schedule?.type === "volta").length,
    confirmed: activeReservations.length,
  }), [routes, activeReservations]);

  const universities = useMemo(() => {
    return Array.from(new Set(routes.map(universityName))).sort((a, b) => a.localeCompare(b));
  }, [routes]);

  const formRoutes = useMemo(() => {
    return routes.filter((route) => universityName(route) === form.university && route.schedule?.type === form.type);
  }, [routes, form.university, form.type]);

  const selectedRoute = useMemo(() => {
    return formRoutes.find((route) => String(route.id) === form.routeId) ?? formRoutes[0];
  }, [formRoutes, form.routeId]);

  const selectedRoutePoints = selectedRoute ? routePoints(selectedRoute) : [];
  const canSave = !!selectedRoute?.schedule?.id && (selectedRoutePoints.length <= 1 || !!form.pickupPointId);

  function openCreate(route?: RouteItem) {
    if (route) {
      const points = routePoints(route);
      setForm({
        university: universityName(route),
        dayOfWeek: "Segunda",
        type: route.schedule?.type ?? "ida",
        routeId: String(route.id),
        pickupPointId: points.length === 1 ? String(points[0].id) : "",
      });
    } else {
      setForm(emptyForm);
    }
    setCreateOpen(true);
  }

  function handleUniversityChange(value: string) {
    const firstRoute = routes.find((route) => universityName(route) === value && route.schedule?.type === form.type);
    const points = firstRoute ? routePoints(firstRoute) : [];
    setForm((current) => ({
      ...current,
      university: value,
      routeId: firstRoute ? String(firstRoute.id) : "",
      pickupPointId: points.length === 1 ? String(points[0].id) : "",
    }));
  }

  function handleTypeChange(type: "ida" | "volta") {
    const firstRoute = routes.find((route) => universityName(route) === form.university && route.schedule?.type === type);
    const points = firstRoute ? routePoints(firstRoute) : [];
    setForm((current) => ({
      ...current,
      type,
      routeId: firstRoute ? String(firstRoute.id) : "",
      pickupPointId: points.length === 1 ? String(points[0].id) : "",
    }));
  }

  function handleRouteChange(routeId: string) {
    const route = routes.find((item) => String(item.id) === routeId);
    const points = route ? routePoints(route) : [];
    setForm((current) => ({
      ...current,
      routeId,
      pickupPointId: points.length === 1 ? String(points[0].id) : "",
    }));
  }

  async function handleSave() {
    if (!selectedRoute?.schedule?.id) {
      toast({ title: "Rota obrigatória", description: "Selecione universidade e turno para localizar uma rota.", variant: "destructive" });
      return;
    }

    const pickupPointId = form.pickupPointId || (selectedRoutePoints.length === 1 ? String(selectedRoutePoints[0].id) : "");
    if (selectedRoutePoints.length > 1 && !pickupPointId) {
      toast({ title: "Selecione o ponto", description: "Escolha seu ponto antes de salvar.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      await api.post("/reservations", {
        scheduleId: selectedRoute.schedule.id,
        routeId: selectedRoute.id,
        pickupPointId: pickupPointId ? Number(pickupPointId) : undefined,
        dayOfWeek: form.dayOfWeek,
      });

      toast({ title: "Horário salvo", description: `${form.dayOfWeek} · ${tripLabel(form.type)} adicionado à sua semana.` });
      setCreateOpen(false);
      setForm(emptyForm);
      await loadData(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error?.response?.data?.error ?? "Não foi possível salvar este horário.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(reservationId: number) {
    try {
      setRemovingId(reservationId);
      await api.patch(`/reservations/${reservationId}/cancel`);
      toast({ title: "Horário removido", description: "O horário foi removido da sua semana." });
      await loadData(false);
    } catch {
      toast({ title: "Erro ao remover", description: "Não foi possível remover este horário.", variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" /> Horários
          </h1>
          <p className="text-muted-foreground text-sm">
            Monte sua semana escolhendo universidade, dia, turno e ponto com base nas rotas cadastradas pelo administrador.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="h-9 px-3 gap-2 bg-card">
            <Bus className="w-4 h-4 text-primary" /> Atualização automática
          </Badge>
          <Button onClick={() => openCreate()} className="gap-2">
            <Plus className="w-4 h-4" /> Novo horário
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Rotas" value={counts.total} />
        <SummaryCard label="Ida" value={counts.ida} tone="primary" />
        <SummaryCard label="Volta" value={counts.volta} tone="accent" />
        <SummaryCard label="Na semana" value={counts.confirmed} tone="success" />
      </div>

      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Minha semana
            </h2>
            <p className="text-sm text-muted-foreground">Seus horários salvos por dia.</p>
          </div>
          <Button size="sm" onClick={() => openCreate()} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>

        {activeReservations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-heading font-semibold text-foreground">Nenhum horário na semana</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em “Novo horário” para montar sua rotina.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {DAYS.map((day) => (
              <div key={day} className="rounded-xl border border-border bg-background/40 p-3 space-y-2 min-h-[120px]">
                <div className="flex items-center justify-between">
                  <p className="font-heading font-semibold text-foreground">{day}</p>
                  <Badge variant="secondary">{weeklyReservations[day]?.length ?? 0}</Badge>
                </div>
                {(weeklyReservations[day]?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground pt-2">Nenhum horário cadastrado.</p>
                ) : (
                  <div className="space-y-2">
                    {weeklyReservations[day].map((reservation) => (
                      <motion.div
                        key={reservation.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-border bg-card p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{reservationUniversity(reservation)}</p>
                            <p className="text-xs text-muted-foreground truncate">{reservation.route?.name ?? "Rota não informada"}</p>
                          </div>
                          <Badge variant="outline" className={cn("shrink-0", reservation.schedule?.type === "volta" ? "text-accent" : "text-primary")}>
                            {tripLabel(reservation.schedule?.type)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {reservation.schedule?.time ?? "--:--"}</p>
                          <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {reservation.pickupPoint?.name ?? "Ponto definido pela administração"}</p>
                          <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {reservation.route?.driver?.nome ?? "Motorista a definir"}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full justify-center text-destructive hover:text-destructive"
                          onClick={() => handleRemove(reservation.id)}
                          disabled={removingId === reservation.id}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> {removingId === reservation.id ? "Removendo..." : "Remover"}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por universidade, rota, motorista ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setFilterType(filter.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border flex-1 sm:flex-none",
                filterType === filter.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-20 bg-muted rounded-lg" />
              <div className="h-9 bg-muted rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-foreground mb-1">Nenhuma rota disponível</p>
          <p className="text-sm text-muted-foreground">Aguarde o administrador cadastrar rotas ativas para sua cidade.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <h2 className="font-heading font-semibold text-foreground">Rotas disponíveis</h2>
            <p className="text-sm text-muted-foreground">Use uma rota como base para adicionar um novo horário à sua semana.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredRoutes.map((route, index) => {
                const points = routePoints(route);
                const isConfirmed = confirmedRouteIds.has(route.id);
                const isReturn = route.schedule?.type === "volta";
                const capacity = route.vehicle?.capacity ?? null;
                const occupied = route.reservations?.length ?? 0;
                const available = typeof capacity === "number" ? Math.max(capacity - occupied, 0) : null;

                return (
                  <motion.div
                    key={route.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.025 }}
                    className={cn(
                      "bg-card border rounded-xl p-4 space-y-3 hover:shadow-md transition-all min-w-0",
                      isConfirmed ? "border-primary shadow-sm" : "border-border hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <GraduationCap className="w-3.5 h-3.5 shrink-0" /> Universidade
                        </div>
                        <h3 className="font-heading font-semibold text-foreground leading-tight line-clamp-2">
                          {universityName(route)}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{route.name}</p>
                      </div>
                      {isConfirmed && (
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0">
                          <CheckCircle className="w-3 h-3 mr-1" /> Usada
                        </Badge>
                      )}
                    </div>

                    <div className="rounded-lg border border-border bg-background/60 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
                          <ArrowLeftRight className={cn("w-3 h-3", isReturn ? "text-accent rotate-180" : "text-primary")} />
                          {tripLabel(route.schedule?.type)}
                        </div>
                        <span className="font-heading font-bold text-lg text-primary">{route.schedule?.time ?? "--:--"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">
                          {points.length === 0
                            ? "Ponto definido pela administração"
                            : points.length === 1
                              ? points[0].name
                              : `${points.length} pontos disponíveis`}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs border-t border-border pt-2.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground shrink-0">Motorista:</span>
                        <span className="text-foreground font-medium truncate">{route.driver?.nome ?? "Aguardando alocação"}</span>
                      </div>
                      {route.vehicle && (
                        <div className="text-muted-foreground truncate">
                          Veículo: {route.vehicle.name ?? "Ônibus"} • {route.vehicle.plate}
                        </div>
                      )}
                      {available !== null && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="w-3.5 h-3.5" /> {available} vagas disponíveis
                        </div>
                      )}
                    </div>

                    <Button className="w-full" variant="outline" onClick={() => openCreate(route)}>
                      Usar no novo horário
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Novo horário
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha universidade, dia, turno e ponto para montar sua semana.
                </p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><School className="w-4 h-4 text-primary" /> Universidade</Label>
                <select value={form.university} onChange={(event) => handleUniversityChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Selecione uma universidade...</option>
                  {universities.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Dia da semana</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {DAYS.map((day) => (
                    <button key={day} type="button" onClick={() => setForm((current) => ({ ...current, dayOfWeek: day }))} className={cn("px-2 py-2 text-xs font-medium rounded-md border transition-colors", form.dayOfWeek === day ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40")}>{day.slice(0, 3)}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Turno</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["ida", "volta"] as const).map((type) => (
                    <button key={type} type="button" onClick={() => handleTypeChange(type)} className={cn("rounded-lg border p-3 text-left transition-all", form.type === type ? "bg-primary/10 border-primary ring-2 ring-primary/20" : "bg-background border-border hover:border-primary/40")}>
                      <p className={cn("font-heading font-semibold text-sm", form.type === type ? "text-primary" : "text-foreground")}>{tripLabel(type)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Rotas de {tripLabel(type).toLowerCase()} cadastradas pelo administrador</p>
                    </button>
                  ))}
                </div>
              </div>

              {formRoutes.length > 1 && (
                <div className="space-y-2">
                  <Label>Rota disponível</Label>
                  <select value={form.routeId} onChange={(event) => handleRouteChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {formRoutes.map((route) => <option key={route.id} value={route.id}>{route.name} · {route.schedule?.time ?? "--:--"}</option>)}
                  </select>
                </div>
              )}

              {selectedRoute ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3 space-y-2 bg-background/40">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
                      <ArrowLeftRight className={cn("w-3 h-3", selectedRoute.schedule?.type === "volta" ? "text-accent rotate-180" : "text-primary")} /> {tripLabel(selectedRoute.schedule?.type)}
                    </div>
                    <p className="font-heading font-bold text-foreground text-lg">{selectedRoute.schedule?.time ?? "--:--"}</p>
                    <p className="text-xs text-muted-foreground">{selectedRoute.name}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-2 bg-background/40">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
                      <User className="w-3 h-3 text-primary" /> Motorista
                    </div>
                    <p className="font-heading font-semibold text-foreground text-sm">{selectedRoute.driver?.nome ?? "Aguardando alocação"}</p>
                    <p className="text-xs text-muted-foreground">{selectedRoute.vehicle ? `${selectedRoute.vehicle.name ?? "Ônibus"} · ${selectedRoute.vehicle.plate}` : "Veículo aguardando alocação"}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
                  Nenhuma rota encontrada para essa universidade e turno.
                </div>
              )}

              {selectedRoute && selectedRoutePoints.length > 1 && (
                <div className="space-y-2">
                  <Label>Ponto</Label>
                  <select value={form.pickupPointId} onChange={(event) => setForm((current) => ({ ...current, pickupPointId: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecione o ponto...</option>
                    {selectedRoutePoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
                  </select>
                </div>
              )}

              {selectedRoute && selectedRoutePoints.length === 1 && (
                <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> {selectedRoutePoints[0].name}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!canSave || saving}>{saving ? "Salvando..." : "Salvar horário"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "primary" | "accent" | "success";
}) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary",
    accent: "text-accent",
    success: "text-emerald-600 dark:text-emerald-400",
  }[tone];

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-heading font-bold", toneClass)}>{value}</p>
    </div>
  );
}
