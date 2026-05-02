import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bus, CalendarDays, Search, Users, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface DriverRoute {
  id: number;
  name: string;
  schedule?: {
    time: string;
    type: "ida" | "volta";
    university?: { name: string } | null;
  };
  vehicle?: {
    id: number;
    name?: string | null;
    model?: string | null;
    plate: string;
    capacity: number;
    active?: boolean;
  } | null;
  reservations?: unknown[];
}

interface VehicleView {
  id: number;
  name?: string | null;
  model?: string | null;
  plate: string;
  capacity: number;
  active?: boolean;
  routes: DriverRoute[];
  passengers: number;
}

export default function DriverFleet() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<DriverRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadFleet() {
    try {
      setLoading(true);
      const { data } = await api.get("/driver/routes");
      setRoutes(data ?? []);
    } catch {
      toast({
        title: "Erro ao carregar frota",
        description: "Não foi possível buscar os veículos atribuídos às suas rotas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFleet();
  }, []);

  const vehicles = useMemo<VehicleView[]>(() => {
    const map = new Map<number, VehicleView>();

    routes.forEach((route) => {
      if (!route.vehicle) return;
      const current = map.get(route.vehicle.id) ?? {
        ...route.vehicle,
        routes: [],
        passengers: 0,
      };
      current.routes.push(route);
      current.passengers += route.reservations?.length ?? 0;
      map.set(route.vehicle.id, current);
    });

    return Array.from(map.values());
  }, [routes]);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((vehicle) =>
      `${vehicle.plate} ${vehicle.name ?? ""} ${vehicle.model ?? ""}`.toLowerCase().includes(q),
    );
  }, [vehicles, search]);

  const counts = useMemo(() => ({
    total: vehicles.length,
    active: vehicles.filter((vehicle) => vehicle.active !== false).length,
    routes: routes.length,
    passengers: vehicles.reduce((sum, vehicle) => sum + vehicle.passengers, 0),
  }), [vehicles, routes]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Bus className="w-6 h-6 text-primary" /> Minha frota
          </h1>
          <p className="text-muted-foreground text-sm">
            Veículos vinculados às rotas atribuídas pela administração.
          </p>
        </div>
        <Button variant="outline" onClick={loadFleet} className="gap-2">
          <Wrench className="w-4 h-4" /> Atualizar dados
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Veículos" value={counts.total} tone="default" />
        <SummaryCard label="Ativos" value={counts.active} tone="success" />
        <SummaryCard label="Rotas" value={counts.routes} tone="primary" />
        <SummaryCard label="Passageiros" value={counts.passengers} tone="warning" />
      </div>

      <div className="bg-card border border-border rounded-xl p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, nome ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          Carregando frota...
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <Bus className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-foreground mb-1">
            Nenhum veículo encontrado
          </p>
          <p className="text-sm text-muted-foreground">
            {vehicles.length === 0 ? "Você ainda não possui rotas com veículo vinculado." : "Ajuste a busca para ver outros veículos."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredVehicles.map((vehicle, i) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Bus className="w-3.5 h-3.5" /> {vehicle.model ?? vehicle.name ?? "Veículo"}
                  </div>
                  <h3 className="font-heading font-bold text-foreground tracking-wide">
                    {vehicle.plate}
                  </h3>
                </div>
                <Badge variant="outline" className={vehicle.active === false ? "text-muted-foreground" : "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"}>
                  {vehicle.active === false ? "Inativo" : "Ativo"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-muted-foreground">Capacidade</p>
                  <p className="font-medium text-foreground">{vehicle.capacity} lugares</p>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-muted-foreground">Passageiros</p>
                  <p className="font-medium text-foreground">{vehicle.passengers}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Rotas vinculadas
                </p>
                {vehicle.routes.map((route) => (
                  <div key={route.id} className="rounded-lg border border-border bg-background/50 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground truncate">{route.schedule?.university?.name ?? route.name}</p>
                      <Badge variant="secondary" className="text-[10px] py-0">{route.schedule?.type === "volta" ? "Volta" : "Ida"}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {route.schedule?.time ?? "--:--"} · {route.reservations?.length ?? 0} passageiros
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "default" | "success" | "primary" | "warning" }) {
  const toneClass = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    primary: "text-primary",
    warning: "text-amber-600 dark:text-amber-400",
  }[tone];

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-heading font-bold", toneClass)}>{value}</p>
    </div>
  );
}
