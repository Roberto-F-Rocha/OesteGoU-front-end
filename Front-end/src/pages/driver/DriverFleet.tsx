import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Bus, CalendarDays, Plus, Search, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDriverMaintenance } from "@/hooks/useDriverMaintenance";

const SEVERITY_LABEL = { low: "Baixa", medium: "Média", high: "Alta" };
const TICKET_STATUS_LABEL = { open: "Aberto", in_progress: "Em andamento", resolved: "Resolvido", canceled: "Cancelado" };

export default function DriverFleet() {
  const { toast } = useToast();
  const { vehicles, tickets, loading, createTicket } = useDriverMaintenance();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ vehicleId: "", title: "", description: "", severity: "medium" as "low" | "medium" | "high" });

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => `${v.plate} ${v.name ?? ""} ${v.model ?? ""}`.toLowerCase().includes(q));
  }, [vehicles, search]);

  function openTicketFor(vehicle?: any) {
    setForm({ vehicleId: vehicle ? String(vehicle.id) : "", title: "", description: "", severity: "medium" });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicleId) return toast({ title: "Selecione um ônibus", variant: "destructive" });
    if (!form.title.trim() || !form.description.trim()) return toast({ title: "Preencha título e descrição", variant: "destructive" });
    try {
      setSubmitting(true);
      await createTicket({ vehicleId: Number(form.vehicleId), title: form.title.trim(), description: form.description.trim(), severity: form.severity });
      toast({ title: "Chamado enviado" });
      setOpen(false);
    } catch {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="max-w-6xl mx-auto space-y-6"><Button onClick={() => openTicketFor()} className="gap-2"><Plus className="w-4 h-4" /> Abrir chamado</Button>{loading ? <div className="p-10 text-center">Carregando...</div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{filteredVehicles.map((vehicle: any) => <div key={vehicle.id} className="border p-4"><h3>{vehicle.plate}</h3><Button onClick={() => openTicketFor(vehicle)}>Abrir chamado</Button></div>)}</div>}<div>{tickets.map((t) => <div key={t.id}><p>{t.title} - {TICKET_STATUS_LABEL[t.status]}</p></div>)}</div><Dialog open={open} onOpenChange={setOpen}><DialogContent><form onSubmit={handleSubmit}><select value={form.vehicleId} onChange={(e) => setForm((s) => ({ ...s, vehicleId: e.target.value }))}>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}</select><Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} /><Textarea value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} /><Button type="submit">Enviar</Button></form></DialogContent></Dialog></div>;
}
