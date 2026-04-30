import { useMemo, useRef, useState } from "react";
import { Bus, Camera, CheckCircle2, Copy, FileText, Mail, Pencil, Plus, Trash2, Truck, Upload, X } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { addDriverByAdmin, generateTempPassword, getDriversByCity, getSchedulesByCity, removeUser, updateUser } from "@/data/registrationsStore";
import { assignDriverToBuses, listBusesByCity, listBusesByDriver } from "@/data/fleetStore";

interface Props {
  adminCity: string;
  adminState: string;
}

const emptyForm = {
  id: "",
  name: "",
  email: "",
  phone: "",
  birthDate: "",
  assignedScheduleId: "",
  busIds: [] as string[],
};

export default function AdminDrivers({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cnhName, setCnhName] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string; name: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cnhInputRef = useRef<HTMLInputElement>(null);

  const drivers = useMemo(() => getDriversByCity(adminCity), [adminCity, version]);
  const schedules = useMemo(() => getSchedulesByCity(adminCity), [adminCity, version]);
  const buses = useMemo(() => listBusesByCity(adminCity), [adminCity, version]);

  const resetForm = () => {
    setForm(emptyForm);
    setPhoto(null);
    setCnhName(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (cnhInputRef.current) cnhInputRef.current.value = "";
  };

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleBus = (busId: string) => {
    setForm((state) => ({
      ...state,
      busIds: state.busIds.includes(busId)
        ? state.busIds.filter((id) => id !== busId)
        : [...state.busIds, busId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id && !cnhName) {
      toast({ title: "CNH obrigatória", variant: "destructive" });
      return;
    }

    let driverId = form.id;
    if (form.id) {
      updateUser(form.id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        birthDate: form.birthDate,
        photo,
        cnhName: cnhName ?? undefined,
        assignedScheduleId: form.assignedScheduleId || null,
      });
      toast({ title: "Motorista atualizado" });
    } else {
      const tempPassword = generateTempPassword();
      const created = addDriverByAdmin({
        name: form.name,
        email: form.email,
        phone: form.phone,
        birthDate: form.birthDate,
        cnhName: cnhName ?? "cnh-digital.pdf",
        photo,
        city: adminCity,
        state: adminState,
        tempPassword,
        assignedScheduleId: form.assignedScheduleId || null,
      });
      driverId = created.id;
      setCredentials({ email: form.email, password: tempPassword, name: form.name });
      toast({ title: "Motorista cadastrado" });
    }

    if (driverId) assignDriverToBuses(driverId, form.busIds);

    setOpen(false);
    resetForm();
    setVersion((value) => value + 1);
  };

  const handleEdit = (driverId: string) => {
    const driver = drivers.find((item) => item.id === driverId);
    if (!driver) return;
    setForm({
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      birthDate: driver.birthDate,
      assignedScheduleId: driver.assignedScheduleId ?? "",
      busIds: listBusesByDriver(driver.id).map((b) => b.id),
    });
    setPhoto(driver.photo);
    setCnhName(driver.cnhName ?? null);
    setOpen(true);
  };

  const handleDelete = (driverId: string) => {
    assignDriverToBuses(driverId, []);
    removeUser(driverId);
    toast({ title: "Motorista removido" });
    setVersion((value) => value + 1);
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(`Nome: ${credentials.name}
Email: ${credentials.email}
Senha temporária: ${credentials.password}`);
    toast({ title: "Credenciais copiadas" });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Motoristas"
        description="Cadastro, edição, alocação de rotas e vínculo com a frota."
        icon={Truck}
        actions={
          <Button onClick={() => { resetForm(); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Novo motorista
          </Button>
        }
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motorista</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Rota alocada</TableHead>
              <TableHead>Ônibus</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => {
              const schedule = schedules.find((item) => item.id === driver.assignedScheduleId);
              return (
                <TableRow key={driver.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted/50 flex items-center justify-center">
                        {driver.photo ? <img src={driver.photo} alt={driver.name} className="h-full w-full object-cover" /> : <Truck className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{driver.name}</p>
                        <p className="text-xs text-muted-foreground">{driver.cnhName ?? "CNH não enviada"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-foreground">{driver.email}</p>
                    <p className="text-xs text-muted-foreground">{driver.phone}</p>
                  </TableCell>
                  <TableCell>
                    {schedule ? (
                      <div>
                        <p className="text-foreground">{schedule.title}</p>
                        <p className="text-xs text-muted-foreground">{schedule.dayOfWeek} · {schedule.departureTime}</p>
                      </div>
                    ) : (
                      <Badge variant="secondary">Sem alocação</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={driver.status === "active" ? "default" : "secondary"}>{driver.status === "active" ? "Ativo" : "Pendente"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(driver.id)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(driver.id)}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar motorista" : "Cadastrar motorista"}</DialogTitle>
            <DialogDescription>Escolha a rota já no cadastro ou deixe sem alocação para ajustar em Horários.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Foto</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border border-border bg-muted/30 flex items-center justify-center">
                  {photo ? (
                    <>
                      <img src={photo} alt="Prévia" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setPhoto(null)} className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <Camera className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  <Button type="button" variant="outline" className="w-full" onClick={() => photoInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Enviar foto
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome completo</Label>
                <Input value={form.name} onChange={(e) => setForm((state) => ({ ...state, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((state) => ({ ...state, email: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm((state) => ({ ...state, phone: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Data de nascimento</Label>
                <Input type="date" value={form.birthDate} onChange={(e) => setForm((state) => ({ ...state, birthDate: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Rota</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.assignedScheduleId}
                  onChange={(e) => setForm((state) => ({ ...state, assignedScheduleId: e.target.value }))}
                >
                  <option value="">Sem alocação</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.dayOfWeek} · {schedule.title} · {schedule.departureTime}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>CNH digital</Label>
              <input ref={cnhInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setCnhName(e.target.files?.[0]?.name ?? null)} />
              <Button type="button" variant="outline" className="w-full justify-start" onClick={() => cnhInputRef.current?.click()}>
                <FileText className="w-4 h-4 mr-2" /> {cnhName ?? "Enviar CNH digital"}
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentials} onOpenChange={(value) => !value && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" /> Credenciais geradas
            </DialogTitle>
            <DialogDescription>Envie estes dados ao motorista.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Mail className="w-4 h-4 text-muted-foreground" /> {credentials?.email}
            </div>
            <p className="text-sm text-foreground">Senha temporária: <span className="font-mono">{credentials?.password}</span></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyCredentials}><Copy className="w-4 h-4 mr-2" />Copiar</Button>
            <Button onClick={() => setCredentials(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
