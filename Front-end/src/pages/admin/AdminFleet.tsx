import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bus, Pencil, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/admin/PageHeader";
import { api } from "@/lib/api";

interface Props {
  adminCity: string;
  adminState: string;
}

interface Vehicle {
  id: number;
  plate: string;
  name?: string | null;
  model?: string | null;
  capacity: number;
  active: boolean;
  city?: { name: string; state: string } | null;
}

const emptyVehicle = {
  id: 0,
  plate: "",
  name: "",
  model: "",
  capacity: 40,
  active: true,
};

export default function AdminFleet({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyVehicle);

  async function loadVehicles() {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/vehicles");
      setVehicles(data ?? []);
    } catch {
      toast({ title: "Erro ao carregar frota", description: "Não foi possível buscar os veículos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadVehicles(); }, []);

  const filteredVehicles = useMemo(() => vehicles.filter((vehicle) => {
    const matchSearch = search.trim() ? `${vehicle.plate} ${vehicle.name ?? ""} ${vehicle.model ?? ""}`.toLowerCase().includes(search.toLowerCase()) : true;
    const matchStatus = statusFilter === "all" ? true : statusFilter === "active" ? vehicle.active : !vehicle.active;
    return matchSearch && matchStatus;
  }), [vehicles, search, statusFilter]);

  const counts = {
    total: vehicles.length,
    active: vehicles.filter((vehicle) => vehicle.active).length,
    inactive: vehicles.filter((vehicle) => !vehicle.active).length,
  };

  const openCreate = () => { setForm(emptyVehicle); setOpen(true); };
  const openEdit = (vehicle: Vehicle) => {
    setForm({ id: vehicle.id, plate: vehicle.plate, name: vehicle.name ?? "", model: vehicle.model ?? "", capacity: vehicle.capacity, active: vehicle.active });
    setOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { plate: form.plate.trim().toUpperCase(), name: form.name.trim() || undefined, model: form.model.trim() || undefined, capacity: Number(form.capacity), active: form.active };
    try {
      if (form.id) { await api.patch(`/admin/vehicles/${form.id}`, payload); toast({ title: "Veículo atualizado" }); }
      else { await api.post("/admin/vehicles", payload); toast({ title: "Veículo cadastrado" }); }
      setOpen(false);
      await loadVehicles();
    } catch {
      toast({ title: "Erro ao salvar veículo", description: "Verifique os dados e tente novamente.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Frota" description={`Gerencie os veículos de ${adminCity} / ${adminState}.`} icon={Bus} actions={<Button onClick={openCreate} className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4" /> Novo transporte</Button>} />

      <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3">
        <SummaryCard label="Total" value={counts.total} tone="default" />
        <SummaryCard label="Ativos" value={counts.active} tone="success" />
        <SummaryCard label="Inativos" value={counts.inactive} tone="danger" />
      </div>

      <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por placa, nome ou modelo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[{ key: "all", label: "Todos" }, { key: "active", label: "Ativos" }, { key: "inactive", label: "Inativos" }].map((filter) => (
            <button key={filter.key} type="button" onClick={() => setStatusFilter(filter.key as typeof statusFilter)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors border flex-1 sm:flex-none", statusFilter === filter.key ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40")}>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">Carregando frota...</div>
      ) : filteredVehicles.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 sm:p-10 text-center">
          <Bus className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-foreground mb-1">Nenhum veículo encontrado</p>
          <p className="text-sm text-muted-foreground mb-4">Cadastre ou ajuste os filtros da frota.</p>
          <Button onClick={openCreate} className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4" /> Cadastrar transporte</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredVehicles.map((vehicle) => (
            <motion.div key={vehicle.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4 space-y-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 truncate"><Bus className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{vehicle.model ?? "Modelo não informado"}</span></div>
                  <h3 className="font-heading font-bold text-foreground tracking-wide break-words">{vehicle.plate}</h3>
                  <p className="text-sm text-muted-foreground truncate">{vehicle.name ?? "Sem nome"}</p>
                </div>
                <Badge variant={vehicle.active ? "default" : "secondary"}>{vehicle.active ? "Ativo" : "Inativo"}</Badge>
              </div>
              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/40 p-2"><p className="text-muted-foreground">Capacidade</p><p className="font-medium text-foreground">{vehicle.capacity} lugares</p></div>
                <div className="rounded-md bg-muted/40 p-2"><p className="text-muted-foreground">Cidade</p><p className="font-medium text-foreground truncate">{vehicle.city?.name ?? adminCity}</p></div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(vehicle)}><Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar</Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Bus className="w-5 h-5 text-primary" /> {form.id ? "Editar transporte" : "Novo transporte"}</DialogTitle><DialogDescription>Cadastre as informações do veículo.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><Label>Placa</Label><Input value={form.plate} onChange={(e) => setForm((s) => ({ ...s, plate: e.target.value }))} required /></div><div className="space-y-2"><Label>Capacidade</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm((s) => ({ ...s, capacity: Number(e.target.value) }))} required /></div><div className="space-y-2 sm:col-span-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Ônibus 01" /></div><div className="space-y-2 sm:col-span-2"><Label>Modelo</Label><Input value={form.model} onChange={(e) => setForm((s) => ({ ...s, model: e.target.value }))} placeholder="Micro-ônibus" /></div><div className="space-y-2 sm:col-span-2"><Label>Status</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={String(form.active)} onChange={(e) => setForm((s) => ({ ...s, active: e.target.value === "true" }))}><option value="true">Ativo</option><option value="false">Inativo</option></select></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter></form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "default" | "success" | "danger" }) {
  const toneClass = { default: "text-foreground", success: "text-emerald-600 dark:text-emerald-400", danger: "text-destructive" }[tone];
  return <div className="bg-card border border-border rounded-xl p-3 min-w-0"><p className="text-xs text-muted-foreground truncate">{label}</p><p className={cn("text-2xl font-heading font-bold", toneClass)}>{value}</p></div>;
}
