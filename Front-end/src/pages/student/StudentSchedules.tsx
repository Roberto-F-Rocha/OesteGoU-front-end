import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, GraduationCap, MapPin, Search, User, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  driver?: { nome: string } | null;
  vehicle?: { name?: string | null; plate: string } | null;
  points?: { pickupPoint?: { id: number; name: string; address?: string | null } }[];
}

interface Reservation {
  id: number;
  status: string;
  routeId: number;
  scheduleId: number;
}

export default function StudentSchedules() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("Todos");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [routesRes, reservationsRes] = await Promise.all([
        api.get("/admin/routes"),
        api.get("/my-reservations"),
      ]);
      setRoutes((routesRes.data ?? []).filter((route: RouteItem) => route.active));
      setReservations(reservationsRes.data ?? []);
    } catch {
      toast({ title: "Erro ao carregar horários", description: "Não foi possível buscar os horários disponíveis.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const confirmedRouteIds = useMemo(() => new Set(reservations.filter((r) => r.status === "confirmed").map((r) => r.routeId)), [reservations]);

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      const university = route.schedule?.university?.name ?? route.name;
      const matchSearch = search.trim() ? `${university} ${route.name}`.toLowerCase().includes(search.toLowerCase()) : true;
      const matchType = filterType === "Todos" ? true : route.schedule?.type === filterType;
      return matchSearch && matchType;
    });
  }, [routes, search, filterType]);

  const confirmReservation = async (route: RouteItem) => {
    const pointId = route.points?.[0]?.pickupPoint?.id;
    if (!route.schedule?.id || !pointId) {
      toast({ title: "Rota incompleta", description: "Esta rota ainda não possui horário ou ponto de embarque.", variant: "destructive" });
      return;
    }

    try {
      setActionLoading(route.id);
      await api.post("/reservations", {
        scheduleId: route.schedule.id,
        routeId: route.id,
        pickupPointId: pointId,
      });
      toast({ title: "Presença confirmada", description: "Sua reserva foi registrada com sucesso." });
      await loadData();
    } catch {
      toast({ title: "Erro ao confirmar", description: "Não foi possível confirmar esta viagem.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><Clock className="w-6 h-6 text-primary" /> Horários</h1>
          <p className="text-muted-foreground text-sm">Veja as rotas disponíveis e confirme sua presença.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar por universidade ou rota..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <div className="flex flex-wrap gap-1.5">{["Todos", "ida", "volta"].map((type) => (<button key={type} type="button" onClick={() => setFilterType(type)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors border", filterType === type ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40")}>{type === "ida" ? "Ida" : type === "volta" ? "Volta" : "Todos"}</button>))}</div>
      </div>

      {loading ? (<div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">Carregando horários...</div>) : filteredRoutes.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center"><Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="font-heading font-semibold text-foreground mb-1">Nenhum horário disponível</p><p className="text-sm text-muted-foreground">Ajuste a busca ou aguarde novas rotas cadastradas.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"><AnimatePresence mode="popLayout">{filteredRoutes.map((route, i) => {
          const point = route.points?.[0]?.pickupPoint;
          const isConfirmed = confirmedRouteIds.has(route.id);
          return (<motion.div key={route.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }} className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/40 hover:shadow-md transition-all"><div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><GraduationCap className="w-3.5 h-3.5" />Universidade</div><h3 className="font-heading font-semibold text-foreground leading-tight line-clamp-2">{route.schedule?.university?.name ?? route.name}</h3><Badge variant="secondary" className="mt-2"><Calendar className="w-3 h-3 mr-1" />{route.schedule?.type === "volta" ? "Volta" : "Ida"}</Badge></div></div><div className="rounded-lg bg-background/60 p-2.5 border border-border"><p className="font-heading font-bold text-foreground text-base">{route.schedule?.time ?? "--:--"}</p><div className="flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3 mt-0.5 shrink-0" /><span className="line-clamp-2">{point?.name ?? "Ponto não informado"}</span></div></div><div className="flex items-center gap-1.5 text-xs border-t border-border pt-2.5"><User className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">Motorista:</span><span className="text-foreground font-medium">{route.driver?.nome ?? "Aguardando alocação"}</span></div><Button className="w-full" disabled={isConfirmed || actionLoading === route.id} onClick={() => confirmReservation(route)}>{isConfirmed ? <><CheckCircle className="w-4 h-4 mr-1" /> Confirmado</> : "Confirmar presença"}</Button></motion.div>);
        })}</AnimatePresence></div>
      )}
    </div>
  );
}
