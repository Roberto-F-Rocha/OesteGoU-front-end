import { useMemo, useState } from "react";
import { Calendar, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { addSchedule, getDriversByCity, getSchedulesByCity, removeSchedule, updateSchedule } from "@/data/registrationsStore";

interface Props {
  adminCity: string;
  adminState: string;
}

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

export default function AdminSchedules({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState(emptyForm);

  const schedules = useMemo(() => getSchedulesByCity(adminCity), [adminCity, version]);
  const drivers = useMemo(() => getDriversByCity(adminCity), [adminCity, version]);

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
      addSchedule({ city: adminCity, state: adminState, ...payload });
      toast({ title: "Horário criado" });
    }

    setOpen(false);
    resetForm();
    setVersion((value) => value + 1);
  };

  const handleEdit = (scheduleId: string) => {
    const schedule = schedules.find((item) => item.id === scheduleId);
    if (!schedule) return;
    setForm({
      id: schedule.id,
      title: schedule.title,
      dayOfWeek: schedule.dayOfWeek,
      departureTime: schedule.departureTime,
      departureLocation: schedule.departureLocation,
      returnTime: schedule.returnTime,
      returnLocation: schedule.returnLocation,
      driverId: schedule.driverId ?? "",
    });
    setOpen(true);
  };

  const handleDelete = (scheduleId: string) => {
    removeSchedule(scheduleId);
    toast({ title: "Horário removido" });
    setVersion((value) => value + 1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" /> Horários
          </h1>
          <p className="text-sm text-muted-foreground">CRUD completo das rotas e alocação de motoristas.</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Novo horário
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rota</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Volta</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule) => {
              const driver = drivers.find((item) => item.id === schedule.driverId);
              return (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{schedule.title}</p>
                    <p className="text-xs text-muted-foreground">{schedule.dayOfWeek}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-foreground">{schedule.departureTime}</p>
                    <p className="text-xs text-muted-foreground">{schedule.departureLocation}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-foreground">{schedule.returnTime}</p>
                    <p className="text-xs text-muted-foreground">{schedule.returnLocation}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-foreground">{driver?.name ?? "Sem motorista"}</p>
                    <p className="text-xs text-muted-foreground">{driver?.email ?? ""}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(schedule.id)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(schedule.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar horário" : "Novo horário"}</DialogTitle>
            <DialogDescription>Cadastre a rota e vincule um motorista quando quiser.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Rota / universidade</Label>
                <Input value={form.title} onChange={(e) => setForm((state) => ({ ...state, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Dia</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.dayOfWeek} onChange={(e) => setForm((state) => ({ ...state, dayOfWeek: e.target.value }))}>
                  {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Motorista</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.driverId} onChange={(e) => setForm((state) => ({ ...state, driverId: e.target.value }))}>
                  <option value="">Sem motorista</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>{driver.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Horário de saída</Label>
                <Input type="time" value={form.departureTime} onChange={(e) => setForm((state) => ({ ...state, departureTime: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Local de saída</Label>
                <Input value={form.departureLocation} onChange={(e) => setForm((state) => ({ ...state, departureLocation: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Horário de volta</Label>
                <Input type="time" value={form.returnTime} onChange={(e) => setForm((state) => ({ ...state, returnTime: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Local de volta</Label>
                <Input value={form.returnLocation} onChange={(e) => setForm((state) => ({ ...state, returnLocation: e.target.value }))} required />
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
