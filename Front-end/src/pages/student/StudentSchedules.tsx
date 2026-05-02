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
  Search,
  User,
  Users,
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
}

const FILTERS = [
  { key: "Todos", label: "Todos" },
  { key: "ida", label: "Ida" },
  { key: "volta", label: "Volta" },
];

function tripLabel(type?: string) {
  return type === "volta" ? "Volta" : "Ida";
}

function routePoints(route: RouteItem) {
  return (route.points ?? [])
    .map((item) => item.pickupPoint)
    .filter(Boolean) as PickupPoint[];
}

export default function StudentSchedules() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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

      setSelectedPoints((current) => {
        const next = { ...current };
        availableRoutes.forEach((route) => {
          const points = routePoints(route);
          const confirmed = (reservationsRes.data ?? []).find((reservation: Reservation) => reservation.routeId === route.id && reservation.status === "confirmed");
          if (confirmed?.pickupPointId) next[route.id] = confirmed.pickupPointId;
          else if (!next[route.id] && points.length === 1) next[route.id] = points[0].id;
        });
        return next;
      });
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

  const confirmedRouteIds = useMemo(
    () => new Set(reservations.filter((reservation) => reservation.status === "confirmed").map((reservation) => reservation.routeId)),
    [reservations],
  );

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      const university = route.schedule?.university?.name ?? route.name;
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
    confirmed: routes.filter((route) => confirmedRouteIds.has(route.id)).length,
  }), [routes, confirmedRouteIds]);

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
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo horário
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Rotas" value={counts.total} />
        <SummaryCard label="Ida" value={counts.ida} tone="primary" />
        <SummaryCard label="Volta" value={counts.volta} tone="accent" />
        <SummaryCard label="Confirmadas" value={counts.confirmed} tone="success" />
      </div>

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
                        {route.schedule?.university?.name ?? route.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{route.name}</p>
                    </div>
                    {isConfirmed && (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0">
                        <CheckCircle className="w-3 h-3 mr-1" /> Confirmada
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

                  <Button className="w-full" variant="outline" onClick={() => setCreateOpen(true)}>
                    Usar no novo horário
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="font-heading font-bold text-xl text-foreground">Novo horário</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Na próxima etapa vamos adicionar o formulário completo: universidade, dia, turno e ponto.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button disabled>Continuar</Button>
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
