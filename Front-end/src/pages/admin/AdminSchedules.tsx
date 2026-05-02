import { useEffect, useMemo, useState } from "react";
import { Calendar, Pencil, Plus } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Props { adminCity: string; adminState: string; }
interface University { id: number; name: string; }
interface Driver { id: number; nome: string; email: string; }
interface Vehicle { id: number; plate: string; name?: string | null; }
interface Schedule { id: number; time: string; type: "ida" | "volta"; active: boolean; university?: University | null; }
interface RouteItem { id: number; name: string; active: boolean; schedule: Schedule; driver?: Driver | null; vehicle?: Vehicle | null; city?: { name: string; state: string } | null; }

const emptyForm = { id: 0, name: "", time: "", type: "ida" as "ida" | "volta", universityId: "", driverId: "", vehicleId: "", active: true };

export default function AdminSchedules({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const [routesRes, universitiesRes, driversRes, vehiclesRes] = await Promise.all([
        api.get("/admin/routes"),
        api.get("/admin/universities"),
        api.get("/admin/users", { params: { role: "driver" } }),
        api.get("/admin/vehicles"),
      ]);
      setRoutes(routesRes.data ?? []);
      setUniversities(universitiesRes.data ?? []);
      setDrivers(driversRes.data ?? []);
      setVehicles(vehiclesRes.data ?? []);
    } catch {
      toast({ title: "Erro ao carregar horários", description: "Não foi possível buscar rotas e cadastros.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let scheduleId: number;
      if (form.id) {
        await api.patch(`/admin/schedules/${routes.find((r) => r.id === form.id)?.schedule.id}`, {
          time: form.time,
          type: form.type,
          universityId: form.universityId ? Number(form.universityId) : undefined,
          active: form.active,
        });
        scheduleId = routes.find((r) => r.id === form.id)?.schedule.id ?? 0;
        await api.patch(`/admin/routes/${form.id}`, {
          name: form.name,
          scheduleId,
          driverId: form.driverId ? Number(form.driverId) : null,
          vehicleId: form.vehicleId ? Number(form.vehicleId) : null,
          active: form.active,
        });
        toast({ title: "Rota atualizada" });
      } else {
        const schedule = await api.post("/admin/schedules", {
          time: form.time,
          type: form.type,
          universityId: form.universityId ? Number(form.universityId) : undefined,
        });
        await api.post("/admin/routes", {
          name: form.name,
          scheduleId: schedule.data.id,
          driverId: form.driverId ? Number(form.driverId) : undefined,
          vehicleId: form.vehicleId ? Number(form.vehicleId) : undefined,
          active: form.active,
        });
        toast({ title: "Rota criada" });
      }
      setOpen(false);
      resetForm();
      await loadData();
    } catch {
      toast({ title: "Erro ao salvar rota", description: "Verifique os campos obrigatórios.", variant: "destructive" });
    }
  };

  const handleEdit = (route: RouteItem) => {
    setForm({
      id: route.id,
      name: route.name,
      time: route.schedule?.time ?? "",
      type: route.schedule?.type ?? "ida",
      universityId: route.schedule?.university?.id ? String(route.schedule.university.id) : "",
      driverId: route.driver?.id ? String(route.driver.id) : "",
      vehicleId: route.vehicle?.id ? String(route.vehicle.id) : "",
      active: route.active,
    });
    setOpen(true);
  };

  const orderedRoutes = useMemo(() => [...routes].sort((a, b) => (a.schedule?.time ?? "").localeCompare(b.schedule?.time ?? "")), [routes]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Horários e Rotas" description={`Rotas cadastradas para ${adminCity} / ${adminState}.`} icon={Calendar} actions={<Button onClick={() => { resetForm(); setOpen(true); }}><Plus className="w-4 h-4 mr-1.5" /> Nova rota</Button>} />
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Carregando horários...</div> : orderedRoutes.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma rota cadastrada ainda.</div> : (
          <Table><TableHeader><TableRow><TableHead>Rota</TableHead><TableHead>Horário</TableHead><TableHead>Universidade</TableHead><TableHead>Motorista</TableHead><TableHead>Veículo</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{orderedRoutes.map((route) => (
            <TableRow key={route.id}><TableCell><p className="font-medium text-foreground">{route.name}</p><p className="text-xs text-muted-foreground">{route.city?.name ?? adminCity}</p></TableCell><TableCell><p>{route.schedule?.time}</p><p className="text-xs text-muted-foreground">{route.schedule?.type === "volta" ? "Volta" : "Ida"}</p></TableCell><TableCell>{route.schedule?.university?.name ?? "Não informada"}</TableCell><TableCell>{route.driver?.nome ?? "Sem motorista"}</TableCell><TableCell>{route.vehicle ? `${route.vehicle.name ?? "Veículo"} · ${route.vehicle.plate}` : "Sem veículo"}</TableCell><TableCell>{route.active ? "Ativa" : "Inativa"}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleEdit(route)}><Pencil className="w-4 h-4" /></Button></TableCell></TableRow>
          ))}</TableBody></Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{form.id ? "Editar rota" : "Nova rota"}</DialogTitle><DialogDescription>Vincule horário, universidade, motorista e veículo.</DialogDescription></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Nome da rota</Label><Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required /></div><div className="space-y-2"><Label>Horário</Label><Input type="time" value={form.time} onChange={(e) => setForm((s) => ({ ...s, time: e.target.value }))} required /></div><div className="space-y-2"><Label>Tipo</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value as "ida" | "volta" }))}><option value="ida">Ida</option><option value="volta">Volta</option></select></div><div className="space-y-2 sm:col-span-2"><Label>Universidade</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.universityId} onChange={(e) => setForm((s) => ({ ...s, universityId: e.target.value }))}><option value="">Sem universidade</option>{universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div><div className="space-y-2"><Label>Motorista</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.driverId} onChange={(e) => setForm((s) => ({ ...s, driverId: e.target.value }))}><option value="">Sem motorista</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div><div className="space-y-2"><Label>Veículo</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.vehicleId} onChange={(e) => setForm((s) => ({ ...s, vehicleId: e.target.value }))}><option value="">Sem veículo</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name ?? v.plate} · {v.plate}</option>)}</select></div><div className="space-y-2 sm:col-span-2"><Label>Status</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={String(form.active)} onChange={(e) => setForm((s) => ({ ...s, active: e.target.value === "true" }))}><option value="true">Ativa</option><option value="false">Inativa</option></select></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
}
