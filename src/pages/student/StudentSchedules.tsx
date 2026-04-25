import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Pencil, Plus, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  addSchedule,
  getDriversByCity,
  getSchedulesByCity,
  removeSchedule,
  updateSchedule,
} from "@/data/registrationsStore";

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const emptyForm = {
  id: "",
  title: "",
  dayOfWeek: "Segunda",
  departureTime: "",
  departureLocation: "",
  returnTime: "",
  returnLocation: "",
  driverId: "",
};

export default function StudentSchedules() {
  const { user } = useAuth();
  const { toast } = useToast();
  const city = user?.city ?? "Riacho da Cruz";
  const state = user?.state ?? "RN";

  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState(emptyForm);

  const schedules = useMemo(() => getSchedulesByCity(city), [city, version]);
  const drivers = useMemo(() => getDriversByCity(city), [city, version]);

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      dayOfWeek: form.dayOfWeek,
      departureTime: form.departureTime,
      departureLocation: form.departureLocation,
      returnTime: form.returnTime,
      returnLocation: form.returnLocation,
      driverId: form.driverId || null,
    };

    if (form.id) {
      updateSchedule(form.id, payload);
      toast({ title: "Horário atualizado" });
    } else {
      addSchedule({ city, state, ...payload });
      toast({ title: "Horário criado" });
    }

    setOpen(false);
    resetForm();
    setVersion((v) => v + 1);
  };

  const handleEdit = (id: string) => {
    const s = schedules.find((item) => item.id === id);
    if (!s) return;
    setForm({
      id: s.id,
      title: s.title,
      dayOfWeek: s.dayOfWeek,
      departureTime: s.departureTime,
      departureLocation: s.departureLocation,
      returnTime: s.returnTime,
      returnLocation: s.returnLocation,
      driverId: s.driverId ?? "",
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    removeSchedule(id);
    toast({ title: "Horário removido" });
    setVersion((v) => v + 1);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" /> Horários
          </h1>
          <p className="text-muted-foreground text-sm">
            Veja, crie, edite ou remova as rotas disponíveis em {city}.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Novo horário
        </Button>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
          <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum horário cadastrado ainda. Crie o primeiro clicando em "Novo horário".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {schedules.map((s, i) => {
            const driver = drivers.find((d) => d.id === s.driverId);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{s.title}</h3>
                    <Badge variant="secondary" className="mt-1">{s.dayOfWeek}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(s.id)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Ida
                    </div>
                    <p className="font-heading font-bold text-foreground">{s.departureTime}</p>
                    <div className="flex items-start gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{s.departureLocation}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                      <Clock className="w-3.5 h-3.5 text-accent" /> Volta
                    </div>
                    <p className="font-heading font-bold text-foreground">{s.returnTime}</p>
                    <div className="flex items-start gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{s.returnLocation}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t border-border pt-2">
                  <User className="w-3.5 h-3.5" />
                  Motorista: <span className="text-foreground">{driver?.name ?? "Sem motorista"}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar horário" : "Novo horário"}</DialogTitle>
            <DialogDescription>Cadastre a rota e, se quiser, vincule um motorista.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Rota / universidade</Label>
                <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Dia</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.dayOfWeek}
                  onChange={(e) => setForm((s) => ({ ...s, dayOfWeek: e.target.value }))}
                >
                  {days.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Motorista</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.driverId}
                  onChange={(e) => setForm((s) => ({ ...s, driverId: e.target.value }))}
                >
                  <option value="">Sem motorista</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Horário de saída</Label>
                <Input type="time" value={form.departureTime} onChange={(e) => setForm((s) => ({ ...s, departureTime: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Local de saída</Label>
                <Input value={form.departureLocation} onChange={(e) => setForm((s) => ({ ...s, departureLocation: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Horário de volta</Label>
                <Input type="time" value={form.returnTime} onChange={(e) => setForm((s) => ({ ...s, returnTime: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Local de volta</Label>
                <Input value={form.returnLocation} onChange={(e) => setForm((s) => ({ ...s, returnLocation: e.target.value }))} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
