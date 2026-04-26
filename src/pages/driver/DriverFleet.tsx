import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  addTicket,
  listBusesByCity,
  listTicketsByDriver,
  type Bus as FleetBus,
  type BusStatus,
  type TicketSeverity,
  type TicketStatus,
} from "@/data/fleetStore";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<BusStatus, string> = {
  available: "Disponível",
  in_use: "Em uso",
  maintenance: "Em manutenção",
  inactive: "Inativo",
};

const STATUS_BADGE: Record<BusStatus, string> = {
  available:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  in_use: "bg-primary/15 text-primary border-primary/30",
  maintenance:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const SEVERITY_LABEL: Record<TicketSeverity, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const SEVERITY_BADGE: Record<TicketSeverity, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  high: "bg-destructive/15 text-destructive border-destructive/30",
};

const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
};

const TICKET_STATUS_BADGE: Record<TicketStatus, string> = {
  open: "bg-destructive/15 text-destructive border-destructive/30",
  in_progress:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  resolved:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

const FILTERS: { key: "all" | BusStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "available", label: "Disponíveis" },
  { key: "in_use", label: "Em uso" },
  { key: "maintenance", label: "Manutenção" },
];

export default function DriverFleet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const city = user?.city ?? "Riacho da Cruz";

  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    busId: "",
    title: "",
    description: "",
    severity: "medium" as TicketSeverity,
  });

  const buses = useMemo(() => listBusesByCity(city), [city, version]);
  const myTickets = useMemo(
    () => (user ? listTicketsByDriver(user.id) : []),
    [user, version],
  );

  const filteredBuses = useMemo(() => {
    return buses.filter((b) => {
      const matchSearch = search.trim()
        ? `${b.plate} ${b.model}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      const matchFilter = filter === "all" ? true : b.status === filter;
      return matchSearch && matchFilter;
    });
  }, [buses, search, filter]);

  const counts = useMemo(
    () => ({
      total: buses.length,
      available: buses.filter((b) => b.status === "available").length,
      in_use: buses.filter((b) => b.status === "in_use").length,
      maintenance: buses.filter((b) => b.status === "maintenance").length,
    }),
    [buses],
  );

  const openTicketFor = (bus?: FleetBus) => {
    setForm({
      busId: bus?.id ?? "",
      title: "",
      description: "",
      severity: "medium",
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.busId) {
      toast({
        title: "Selecione um ônibus",
        variant: "destructive",
      });
      return;
    }
    if (!form.title.trim() || !form.description.trim()) {
      toast({
        title: "Preencha título e descrição",
        variant: "destructive",
      });
      return;
    }
    addTicket({
      busId: form.busId,
      city,
      openedById: user.id,
      openedByName: user.name,
      title: form.title.trim(),
      description: form.description.trim(),
      severity: form.severity,
    });
    toast({
      title: "Chamado enviado",
      description: "A administração foi notificada.",
    });
    setOpen(false);
    setVersion((v) => v + 1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Bus className="w-6 h-6 text-primary" /> Frota de {city}
          </h1>
          <p className="text-muted-foreground text-sm">
            Veja a situação dos veículos e abra chamados de manutenção.
          </p>
        </div>
        <Button onClick={() => openTicketFor()} size="lg" className="gap-2">
          <Wrench className="w-4 h-4" /> Abrir chamado
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total" value={counts.total} tone="default" />
        <SummaryCard
          label="Disponíveis"
          value={counts.available}
          tone="success"
        />
        <SummaryCard label="Em uso" value={counts.in_use} tone="primary" />
        <SummaryCard
          label="Manutenção"
          value={counts.maintenance}
          tone="warning"
        />
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Frota */}
      {filteredBuses.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <Bus className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-foreground mb-1">
            Nenhum ônibus encontrado
          </p>
          <p className="text-sm text-muted-foreground">
            Ajuste os filtros para ver outros veículos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBuses.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Bus className="w-3.5 h-3.5" /> {b.model}
                  </div>
                  <h3 className="font-heading font-bold text-foreground tracking-wide">
                    {b.plate}
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className={cn("shrink-0", STATUS_BADGE[b.status])}
                >
                  {STATUS_LABEL[b.status]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-muted-foreground">Capacidade</p>
                  <p className="font-medium text-foreground">
                    {b.capacity} lugares
                  </p>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-muted-foreground">Ano</p>
                  <p className="font-medium text-foreground">{b.year}</p>
                </div>
              </div>

              {b.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {b.notes}
                </p>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => openTicketFor(b)}
              >
                <Wrench className="w-4 h-4" /> Abrir chamado para este ônibus
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Meus chamados */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" /> Meus chamados
          </h2>
          <Badge variant="secondary">{myTickets.length}</Badge>
        </div>

        {myTickets.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            Você ainda não abriu nenhum chamado.
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {myTickets.map((t) => {
                const bus = buses.find((b) => b.id === t.busId);
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-card border border-border rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-heading font-semibold text-foreground">
                          {t.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {bus
                            ? `${bus.plate} • ${bus.model}`
                            : "Ônibus removido"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          variant="outline"
                          className={SEVERITY_BADGE[t.severity]}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {SEVERITY_LABEL[t.severity]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={TICKET_STATUS_BADGE[t.status]}
                        >
                          {t.status === "resolved" ? (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {TICKET_STATUS_LABEL[t.status]}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/90">{t.description}</p>
                    {t.resolution && (
                      <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                        <span className="font-semibold">
                          Resposta da administração:
                        </span>{" "}
                        {t.resolution}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Aberto em{" "}
                      {new Date(t.createdAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Dialog: novo chamado */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" /> Novo chamado de
              manutenção
            </DialogTitle>
            <DialogDescription>
              Descreva o problema com o máximo de detalhes para acelerar o
              atendimento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Ônibus</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.busId}
                onChange={(e) =>
                  setForm((s) => ({ ...s, busId: e.target.value }))
                }
                required
              >
                <option value="">Selecione um ônibus...</option>
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.plate} • {b.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                placeholder="Ex.: Pneu dianteiro careca"
                value={form.title}
                onChange={(e) =>
                  setForm((s) => ({ ...s, title: e.target.value }))
                }
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição do problema</Label>
              <Textarea
                placeholder="Descreva o que está acontecendo, quando começou, em quais condições..."
                value={form.description}
                onChange={(e) =>
                  setForm((s) => ({ ...s, description: e.target.value }))
                }
                rows={5}
                maxLength={1000}
                required
              />
              <p className="text-[11px] text-muted-foreground text-right">
                {form.description.length}/1000
              </p>
            </div>

            <div className="space-y-2">
              <Label>Gravidade</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["low", "medium", "high"] as TicketSeverity[]).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, severity: s }))}
                    className={cn(
                      "px-3 py-2 rounded-md text-xs font-medium border transition-colors",
                      form.severity === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:text-foreground",
                    )}
                  >
                    {SEVERITY_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                <Plus className="w-4 h-4" /> Enviar chamado
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "primary" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    primary: "text-primary",
    warning: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-heading font-bold", toneClass)}>
        {value}
      </p>
    </div>
  );
}
