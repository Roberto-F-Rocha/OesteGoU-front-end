import { useMemo, useState } from "react";
import { Calendar, Pencil, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  addSchedule,
  getDriversByCity,
  getSchedulesByCity,
  removeSchedule,
  updateSchedule,
} from "@/data/registrationsStore";
import { listUniversitiesByCity } from "@/data/universitiesStore";
import { listShiftsByCity } from "@/data/shiftsStore";
import {
  addPickupPoint,
  listPickupPoints,
} from "@/data/pickupPointsStore";

interface Props {
  adminCity: string;
  adminState: string;
}

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const emptyForm = {
  id: "",
  universityName: "",
  shiftId: "",
  dayOfWeek: "Segunda",
  departureLocation: "",
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
  const universities = useMemo(() => listUniversitiesByCity(adminCity), [adminCity, version]);
  const shifts = useMemo(() => listShiftsByCity(adminCity, adminState), [adminCity, adminState, version]);

  const departurePoints = useMemo(() => {
    if (!form.universityName) return [];
    return listPickupPoints(adminCity, form.universityName, "departure");
  }, [adminCity, form.universityName, version]);

  const returnPoints = useMemo(() => {
    if (!form.universityName) return [];
    return listPickupPoints(adminCity, form.universityName, "return");
  }, [adminCity, form.universityName, version]);

  const resetForm = () => setForm(emptyForm);

  const selectedShift = useMemo(
    () => shifts.find((s) => s.id === form.shiftId),
    [shifts, form.shiftId],
  );

  const handleShiftChange = (shiftId: string) => {
    setForm((state) => ({ ...state, shiftId }));
  };

  const handleUniversityChange = (universityName: string) => {
    setForm((state) => {
      const dep = listPickupPoints(adminCity, universityName, "departure");
      const ret = listPickupPoints(adminCity, universityName, "return");
      return {
        ...state,
        universityName,
        departureLocation: dep[0]?.label ?? "",
        returnLocation: ret[0]?.label ?? universityName,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.universityName) {
      toast({ title: "Selecione uma universidade", variant: "destructive" });
      return;
    }
    if (!selectedShift) {
      toast({ title: "Selecione um turno", variant: "destructive" });
      return;
    }
    const payload = {
      title: form.universityName,
      dayOfWeek: form.dayOfWeek,
      departureTime: selectedShift.departureTime,
      departureLocation: form.departureLocation,
      returnTime: selectedShift.returnTime,
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
    const matchingShift = shifts.find(
      (s) => s.departureTime === schedule.departureTime && s.returnTime === schedule.returnTime,
    );
    setForm({
      id: schedule.id,
      universityName: schedule.title,
      shiftId: matchingShift?.id ?? "",
      dayOfWeek: schedule.dayOfWeek,
      departureLocation: schedule.departureLocation,
      returnLocation: schedule.returnLocation,
      driverId: schedule.driverId ?? "",
    });
    setOpen(true);
  };

  const handleDelete = (scheduleId: string) => {
    if (!confirm("Remover este horário?")) return;
    removeSchedule(scheduleId);
    toast({ title: "Horário removido" });
    setVersion((value) => value + 1);
  };

  const addQuickPoint = (kind: "departure" | "return") => {
    const label = window.prompt(`Novo ponto de ${kind === "departure" ? "embarque" : "desembarque"}`);
    if (!label || !label.trim()) return;
    addPickupPoint({
      city: adminCity,
      university: form.universityName,
      kind,
      label: label.trim(),
      isDefault: false,
    });
    setVersion((v) => v + 1);
    setForm((state) => ({
      ...state,
      [kind === "departure" ? "departureLocation" : "returnLocation"]: label.trim(),
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Horários"
        description="Rotas semanais, turnos e locais cadastrados pelo administrador."
        icon={Calendar}
        actions={
          <Button onClick={() => { resetForm(); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Novo horário
          </Button>
        }
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {schedules.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum horário cadastrado ainda.
          </div>
        ) : (
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
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar horário" : "Novo horário"}</DialogTitle>
            <DialogDescription>
              Vincule a universidade, escolha um turno e os locais de embarque/desembarque cadastrados.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Universidade</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.universityName}
                  onChange={(e) => handleUniversityChange(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
                {universities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Cadastre universidades em <strong>/admin/universidade</strong>.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Turno</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.shiftId}
                  onChange={(e) => handleShiftChange(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.departureTime} → {s.returnTime})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  O horário é definido pelo turno. Para alterar os horários, vá em{" "}
                  <strong>/admin/turnos</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Dia</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.dayOfWeek}
                  onChange={(e) => setForm((state) => ({ ...state, dayOfWeek: e.target.value }))}
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              {selectedShift ? (
                <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saída do turno</p>
                    <p className="font-heading font-bold text-foreground text-lg">{selectedShift.departureTime}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Volta do turno</p>
                    <p className="font-heading font-bold text-foreground text-lg">{selectedShift.returnTime}</p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Local de saída</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!form.universityName}
                    onClick={() => addQuickPoint("departure")}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar ponto
                  </Button>
                </div>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.departureLocation}
                  onChange={(e) => setForm((state) => ({ ...state, departureLocation: e.target.value }))}
                  required
                >
                  <option value="">Selecione um ponto...</option>
                  {departurePoints.map((p) => (
                    <option key={p.id} value={p.label}>{p.label}{p.isDefault ? " (padrão)" : ""}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Local de volta</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!form.universityName}
                    onClick={() => addQuickPoint("return")}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar ponto
                  </Button>
                </div>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.returnLocation}
                  onChange={(e) => setForm((state) => ({ ...state, returnLocation: e.target.value }))}
                  required
                >
                  <option value="">Selecione um ponto...</option>
                  {returnPoints.map((p) => (
                    <option key={p.id} value={p.label}>{p.label}{p.isDefault ? " (padrão)" : ""}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Motorista</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.driverId}
                  onChange={(e) => setForm((state) => ({ ...state, driverId: e.target.value }))}
                >
                  <option value="">Sem motorista</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>{driver.name}</option>
                  ))}
                </select>
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
