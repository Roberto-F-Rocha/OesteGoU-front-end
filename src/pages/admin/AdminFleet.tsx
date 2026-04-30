import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Search,
  Trash2,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  addBus,
  listBusesByCity,
  listTicketsByCity,
  removeBus,
  removeTicket,
  updateBus,
  updateTicket,
  type BusStatus,
  type TicketSeverity,
  type TicketStatus,
} from "@/data/fleetStore";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/admin/PageHeader";
import { getDriversByCity } from "@/data/registrationsStore";

interface Props {
  adminCity: string;
  adminState: string;
}

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

const emptyBus = {
  id: "",
  plate: "",
  model: "",
  capacity: 40,
  year: new Date().getFullYear(),
  status: "available" as BusStatus,
  notes: "",
};

export default function AdminFleet({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [version, setVersion] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BusStatus>("all");

  const [busDialog, setBusDialog] = useState(false);
  const [busForm, setBusForm] = useState(emptyBus);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [resolveTicketId, setResolveTicketId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  const buses = useMemo(
    () => listBusesByCity(adminCity),
    [adminCity, version],
  );
  const tickets = useMemo(
    () => listTicketsByCity(adminCity),
    [adminCity, version],
  );

  const filteredBuses = useMemo(() => {
    return buses.filter((b) => {
      const matchSearch = search.trim()
        ? `${b.plate} ${b.model}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      const matchStatus =
        statusFilter === "all" ? true : b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [buses, search, statusFilter]);

  const counts = useMemo(
    () => ({
      total: buses.length,
      available: buses.filter((b) => b.status === "available").length,
      in_use: buses.filter((b) => b.status === "in_use").length,
      maintenance: buses.filter((b) => b.status === "maintenance").length,
      openTickets: tickets.filter((t) => t.status !== "resolved").length,
    }),
    [buses, tickets],
  );

  const openCreate = () => {
    setBusForm(emptyBus);
    setBusDialog(true);
  };

  const openEdit = (id: string) => {
    const bus = buses.find((b) => b.id === id);
    if (!bus) return;
    setBusForm({
      id: bus.id,
      plate: bus.plate,
      model: bus.model,
      capacity: bus.capacity,
      year: bus.year,
      status: bus.status,
      notes: bus.notes ?? "",
    });
    setBusDialog(true);
  };

  const handleBusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busForm.plate.trim() || !busForm.model.trim()) {
      toast({ title: "Preencha placa e modelo", variant: "destructive" });
      return;
    }
    const payload = {
      plate: busForm.plate.trim().toUpperCase(),
      model: busForm.model.trim(),
      capacity: Number(busForm.capacity) || 0,
      year: Number(busForm.year) || new Date().getFullYear(),
      status: busForm.status,
      notes: busForm.notes.trim() || undefined,
    };

    if (busForm.id) {
      updateBus(busForm.id, payload);
      toast({ title: "Ônibus atualizado" });
    } else {
      addBus({ city: adminCity, state: adminState, ...payload });
      toast({ title: "Ônibus cadastrado" });
    }
    setBusDialog(false);
    setVersion((v) => v + 1);
  };

  const handleBusDelete = (id: string) => {
    removeBus(id);
    toast({ title: "Ônibus removido" });
    setConfirmDelete(null);
    setVersion((v) => v + 1);
  };

  const changeTicketStatus = (id: string, status: TicketStatus) => {
    if (status === "resolved") {
      setResolveTicketId(id);
      setResolution("");
      return;
    }
    updateTicket(id, { status });
    toast({ title: "Chamado atualizado" });
    setVersion((v) => v + 1);
  };

  const confirmResolve = () => {
    if (!resolveTicketId) return;
    updateTicket(resolveTicketId, {
      status: "resolved",
      resolution: resolution.trim() || "Resolvido",
    });
    toast({ title: "Chamado marcado como resolvido" });
    setResolveTicketId(null);
    setResolution("");
    setVersion((v) => v + 1);
  };

  const deleteTicket = (id: string) => {
    removeTicket(id);
    toast({ title: "Chamado removido" });
    setVersion((v) => v + 1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Bus className="w-6 h-6 text-primary" /> Frota
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os veículos e os chamados de manutenção de {adminCity}.
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="gap-2">
          <Plus className="w-4 h-4" /> Novo transporte
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
        <SummaryCard
          label="Chamados abertos"
          value={counts.openTickets}
          tone="danger"
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
          {(
            [
              { key: "all", label: "Todos" },
              { key: "available", label: "Disponíveis" },
              { key: "in_use", label: "Em uso" },
              { key: "maintenance", label: "Manutenção" },
              { key: "inactive", label: "Inativos" },
            ] as { key: "all" | BusStatus; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                statusFilter === f.key
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
          <p className="text-sm text-muted-foreground mb-4">
            {buses.length === 0
              ? "Cadastre o primeiro veículo da frota."
              : "Ajuste os filtros para ver outros veículos."}
          </p>
          {buses.length === 0 && (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Cadastrar transporte
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBuses.map((b) => (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4 space-y-3"
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

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(b.id)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(b.id)}
                  aria-label={`Remover ${b.plate}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Chamados */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" /> Chamados de manutenção
          </h2>
          <Badge variant="secondary">{tickets.length}</Badge>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            Nenhum chamado registrado pelos motoristas.
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {tickets.map((t) => {
                const bus = buses.find((b) => b.id === t.busId);
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-card border border-border rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-heading font-semibold text-foreground">
                          {t.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {bus
                            ? `${bus.plate} • ${bus.model}`
                            : "Ônibus removido"}{" "}
                          • Aberto por {t.openedByName}
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

                    <p className="text-sm text-foreground/90">
                      {t.description}
                    </p>

                    {t.resolution && (
                      <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                        <span className="font-semibold">Resposta:</span>{" "}
                        {t.resolution}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                      <span className="text-[11px] text-muted-foreground mr-auto">
                        {new Date(t.createdAt).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={t.status}
                        onChange={(e) =>
                          changeTicketStatus(
                            t.id,
                            e.target.value as TicketStatus,
                          )
                        }
                      >
                        <option value="open">Aberto</option>
                        <option value="in_progress">Em andamento</option>
                        <option value="resolved">Resolvido</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTicket(t.id)}
                        aria-label="Remover chamado"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Dialog: criar/editar ônibus */}
      <Dialog open={busDialog} onOpenChange={setBusDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-primary" />
              {busForm.id ? "Editar transporte" : "Novo transporte"}
            </DialogTitle>
            <DialogDescription>
              Cadastre as informações do ônibus da frota de {adminCity}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBusSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Placa</Label>
                <Input
                  placeholder="AAA-0000"
                  value={busForm.plate}
                  onChange={(e) =>
                    setBusForm((s) => ({ ...s, plate: e.target.value }))
                  }
                  maxLength={10}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={busForm.status}
                  onChange={(e) =>
                    setBusForm((s) => ({
                      ...s,
                      status: e.target.value as BusStatus,
                    }))
                  }
                >
                  {(Object.keys(STATUS_LABEL) as BusStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Modelo</Label>
                <Input
                  placeholder="Ex.: Mercedes-Benz OF-1721"
                  value={busForm.model}
                  onChange={(e) =>
                    setBusForm((s) => ({ ...s, model: e.target.value }))
                  }
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Capacidade</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={busForm.capacity}
                  onChange={(e) =>
                    setBusForm((s) => ({
                      ...s,
                      capacity: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input
                  type="number"
                  min={1980}
                  max={new Date().getFullYear() + 1}
                  value={busForm.year}
                  onChange={(e) =>
                    setBusForm((s) => ({
                      ...s,
                      year: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  rows={3}
                  maxLength={500}
                  value={busForm.notes}
                  onChange={(e) =>
                    setBusForm((s) => ({ ...s, notes: e.target.value }))
                  }
                  placeholder="Anotações sobre o veículo (opcional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBusDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar remoção */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ônibus?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o veículo e todos os chamados vinculados a ele.
              Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleBusDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resolver chamado */}
      <Dialog
        open={!!resolveTicketId}
        onOpenChange={(o) => {
          if (!o) {
            setResolveTicketId(null);
            setResolution("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver chamado</DialogTitle>
            <DialogDescription>
              Adicione uma resposta visível ao motorista que abriu o chamado.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            maxLength={500}
            placeholder="Ex.: Pneu trocado em 12/04. Veículo liberado."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResolveTicketId(null);
                setResolution("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmResolve}>Marcar como resolvido</Button>
          </DialogFooter>
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
  tone: "default" | "success" | "primary" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    primary: "text-primary",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-destructive",
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
