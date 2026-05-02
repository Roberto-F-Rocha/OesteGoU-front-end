import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bus, Clock, MapPin, Sun, Sunset, Moon, CalendarDays, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { socket } from "@/services/socket";

const WEEK_DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type Shift = {
  key: "morning" | "afternoon" | "evening";
  label: string;
  icon: typeof Sun;
  badgeClass: string;
};

interface DriverRoute {
  id: number;
  name: string;
  active: boolean;
  schedule?: {
    id: number;
    time: string;
    type: "ida" | "volta";
    university?: { name: string } | null;
  };
  vehicle?: { name?: string | null; plate: string; capacity: number } | null;
  city?: { name: string; state: string } | null;
  points?: { pickupPoint?: { name: string; address?: string | null } }[];
  reservations?: unknown[];
}

const SHIFTS: Record<Shift["key"], Shift> = {
  morning: { key: "morning", label: "Manhã", icon: Sun, badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  afternoon: { key: "afternoon", label: "Tarde", icon: Sunset, badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  evening: { key: "evening", label: "Noite", icon: Moon, badgeClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" },
};

function getShift(time: string): Shift { const hour = Number(time?.split(":")[0] ?? "0"); if (hour < 12) return SHIFTS.morning; if (hour < 17) return SHIFTS.afternoon; return SHIFTS.evening; }
function getRouteDay(route: DriverRoute) { return route.schedule?.type === "volta" ? "Volta" : "Ida"; }

export default function DriverSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const driverName = user?.name?.split(" ")[0] ?? "Motorista";
  const city = user?.city?.name ?? "sua cidade";
  const [routes, setRoutes] = useState<DriverRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDay, setFilterDay] = useState<string>("Todos");

  async function loadRoutes(showLoader = true) {
    try { if (showLoader) setLoading(true); const { data } = await api.get("/driver/routes"); setRoutes(data ?? []); }
    catch { toast({ title: "Erro ao carregar escala", description: "Não foi possível buscar suas rotas agora.", variant: "destructive" }); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadRoutes(); }, []);
  useEffect(() => { const refresh = () => loadRoutes(false); socket.on("route:occupancy-updated", refresh); socket.on("route:capacity-alert", refresh); socket.on("reservation:created", refresh); socket.on("reservation:canceled", refresh); return () => { socket.off("route:occupancy-updated", refresh); socket.off("route:capacity-alert", refresh); socket.off("reservation:created", refresh); socket.off("reservation:canceled", refresh); }; }, []);

  const filteredRoutes = useMemo(() => routes.filter((route) => { const universityName = route.schedule?.university?.name ?? route.name; const matchSearch = search.trim() ? universityName.toLowerCase().includes(search.toLowerCase()) || route.name.toLowerCase().includes(search.toLowerCase()) : true; const matchDay = filterDay === "Todos" ? true : getRouteDay(route) === filterDay; return matchSearch && matchDay; }), [routes, search, filterDay]);
  const grouped = ["Ida", "Volta"].map((day) => ({ day, items: filteredRoutes.filter((route) => getRouteDay(route) === day) })).filter((g) => g.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-heading font-bold text-foreground">Olá, {driverName}! 🚌</h1><p className="text-muted-foreground text-sm">Sua escala definida pela administração de {city}.</p></div>
      <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar por rota ou universidade..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div><div className="flex flex-wrap gap-1.5">{["Todos", "Ida", "Volta"].map((d) => <button key={d} type="button" onClick={() => setFilterDay(d)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors border", filterDay === d ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40")}>{d}</button>)}</div></div>
      {loading ? <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">Carregando escala...</div> : grouped.length === 0 ? <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center"><CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="font-heading font-semibold text-foreground">{routes.length === 0 ? "Nenhuma escala atribuída" : "Nenhum resultado"}</p><p className="text-sm text-muted-foreground mt-1">{routes.length === 0 ? "Você ainda não foi escalado em nenhuma rota. Aguarde a definição do administrador." : "Tente ajustar a busca ou o filtro."}</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{grouped.map(({ day, items }, dayIdx) => <motion.div key={day} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dayIdx * 0.05 }} className="bg-card border border-border rounded-xl p-4 space-y-4"><div className="flex items-center justify-between"><Badge variant="secondary" className="font-heading">{day}</Badge><span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "rota" : "rotas"}</span></div>{items.map((route) => { const shift = getShift(route.schedule?.time ?? "00:00"); const ShiftIcon = shift.icon; const point = route.points?.[0]?.pickupPoint; return <div key={route.id} className="space-y-3 pt-3 border-t border-border first:border-t-0 first:pt-0"><div className="flex items-start justify-between gap-2"><p className="font-heading font-semibold text-foreground flex items-center gap-2"><Bus className="w-4 h-4 text-primary" /> {route.schedule?.university?.name ?? route.name}</p><Badge variant="outline" className={`${shift.badgeClass} gap-1`}><ShiftIcon className="w-3 h-3" />{shift.label}</Badge></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm"><div className="rounded-lg bg-muted/40 p-2.5"><div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><Clock className="w-3.5 h-3.5 text-primary" /> Horário</div><p className="text-foreground font-medium">{route.schedule?.time ?? "--:--"}</p><p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {point?.name ?? route.name}</p></div><div className="rounded-lg bg-muted/40 p-2.5"><div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><Users className="w-3.5 h-3.5 text-accent" /> Passageiros</div><p className="text-foreground font-medium">{route.reservations?.length ?? 0} confirmados</p><p className="text-xs text-muted-foreground mt-0.5">{route.vehicle ? `${route.vehicle.name ?? "Veículo"} - ${route.vehicle.plate}` : "Veículo não informado"}</p></div></div></div>; })}</motion.div>)}</div>}
    </div>
  );
}
