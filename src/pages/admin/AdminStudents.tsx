import { useMemo, useState } from "react";
import { BellRing, CheckCircle2, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/admin/PageHeader";
import {
  addUser,
  getConfirmationRowsByCity,
  getStudentsByCity,
  markPendingNotificationsByCity,
  markPendingNotificationsByStudent,
  removeUser,
  updateUser,
  updateUserStatus,
} from "@/data/registrationsStore";

interface Props {
  adminCity: string;
  adminState: string;
}

const emptyForm = {
  id: "",
  name: "",
  cpf: "",
  email: "",
  phone: "",
  birthDate: "",
  institution: "",
  street: "",
  number: "",
  neighborhood: "",
};

export default function AdminStudents({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("Olá! Sua confirmação de viagem ainda está pendente. Pode responder?");
  const [notificationTarget, setNotificationTarget] = useState<string | "all" | null>(null);
  const [version, setVersion] = useState(0);

  const students = useMemo(() => getStudentsByCity(adminCity), [adminCity, version]);
  const confirmationRows = useMemo(() => getConfirmationRowsByCity(adminCity), [adminCity, version]);
  const pendingRows = confirmationRows.filter((row) => row.hasPending);

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.id) {
      updateUser(form.id, {
        name: form.name,
        cpf: form.cpf,
        email: form.email,
        phone: form.phone,
        birthDate: form.birthDate,
        institution: form.institution,
        address: {
          street: form.street,
          number: form.number,
          neighborhood: form.neighborhood,
          city: adminCity,
          state: adminState,
          cep: "",
        },
      });
      toast({ title: "Aluno atualizado" });
    } else {
      addUser({
        role: "student",
        name: form.name,
        cpf: form.cpf,
        email: form.email,
        password: "123456",
        phone: form.phone,
        birthDate: form.birthDate,
        institution: form.institution,
        photo: null,
        docName: null,
        assignedScheduleId: null,
        address: {
          cep: "",
          street: form.street,
          number: form.number,
          neighborhood: form.neighborhood,
          city: adminCity,
          state: adminState,
        },
      });
      toast({ title: "Aluno cadastrado", description: "Senha inicial: 123456" });
    }
    setOpen(false);
    resetForm();
    setVersion((value) => value + 1);
  };

  const handleEdit = (studentId: string) => {
    const student = students.find((item) => item.id === studentId);
    if (!student) return;
    setForm({
      id: student.id,
      name: student.name,
      cpf: student.cpf ?? "",
      email: student.email,
      phone: student.phone,
      birthDate: student.birthDate,
      institution: student.institution ?? "",
      street: student.address.street,
      number: student.address.number,
      neighborhood: student.address.neighborhood,
    });
    setOpen(true);
  };

  const handleDelete = (studentId: string) => {
    removeUser(studentId);
    toast({ title: "Aluno removido" });
    setVersion((value) => value + 1);
  };

  const openNotification = (target: string | "all") => {
    setNotificationTarget(target);
    setMessage("Olá! Sua confirmação de viagem ainda está pendente. Pode responder?");
    setNotifyOpen(true);
  };

  const sendNotification = () => {
    if (!message.trim()) {
      toast({ title: "Mensagem obrigatória", variant: "destructive" });
      return;
    }
    if (notificationTarget === "all") {
      markPendingNotificationsByCity(adminCity);
      toast({ title: "Notificações enviadas", description: `Aviso enviado para ${pendingRows.length} alunos.` });
    } else if (notificationTarget) {
      markPendingNotificationsByStudent(notificationTarget);
      toast({ title: "Notificação enviada" });
    }
    setNotifyOpen(false);
    setNotificationTarget(null);
    setVersion((value) => value + 1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Alunos"
        description={`CRUD completo dos alunos de ${adminCity}.`}
        icon={GraduationCap}
        actions={
          <>
            {pendingRows.length > 0 && (
              <Button variant="outline" onClick={() => openNotification("all")}>
                <BellRing className="w-4 h-4 mr-1.5" /> Notificar pendentes
              </Button>
            )}
            <Button onClick={() => { resetForm(); setOpen(true); }}>
              <Plus className="w-4 h-4 mr-1.5" /> Novo aluno
            </Button>
          </>
        }
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Instituição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Confirmação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {confirmationRows.map((row) => (
              <TableRow key={row.student.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{row.student.name}</p>
                    <p className="text-xs text-muted-foreground">{row.student.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-foreground">{row.student.institution ?? "Não informado"}</p>
                    <p className="text-xs text-muted-foreground">{row.student.phone}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={row.student.status === "active" ? "default" : "secondary"}>
                      {row.student.status === "active" ? "Ativo" : "Pendente"}
                    </Badge>
                    {row.notificationStatus && (
                      <Badge variant={row.notificationStatus === "notified" ? "default" : "secondary"}>
                        {row.notificationStatus === "notified" ? "Notificado" : "Pendente de notificação"}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Ida: {row.confirmation.goingTrip === true ? "Confirmado" : row.confirmation.goingTrip === false ? "Ausente" : "Pendente"}</p>
                    <p>Volta: {row.confirmation.returnTrip === true ? "Confirmado" : row.confirmation.returnTrip === false ? "Ausente" : "Pendente"}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {row.hasPending && (
                      <Button variant="ghost" size="sm" onClick={() => openNotification(row.student.id)}>
                        <BellRing className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateUserStatus(row.student.id, row.student.status === "active" ? "pending" : "active");
                        setVersion((value) => value + 1);
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(row.student.id)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row.student.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar aluno" : "Novo aluno"}</DialogTitle>
            <DialogDescription>Os dados ficam vinculados automaticamente à cidade do administrador.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome completo</Label>
                <Input value={form.name} onChange={(e) => setForm((state) => ({ ...state, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={(e) => setForm((state) => ({ ...state, cpf: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Data de nascimento</Label>
                <Input type="date" value={form.birthDate} onChange={(e) => setForm((state) => ({ ...state, birthDate: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((state) => ({ ...state, email: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm((state) => ({ ...state, phone: e.target.value }))} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Instituição</Label>
                <Input value={form.institution} onChange={(e) => setForm((state) => ({ ...state, institution: e.target.value }))} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Rua</Label>
                <Input value={form.street} onChange={(e) => setForm((state) => ({ ...state, street: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={form.number} onChange={(e) => setForm((state) => ({ ...state, number: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={form.neighborhood} onChange={(e) => setForm((state) => ({ ...state, neighborhood: e.target.value }))} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar notificação</DialogTitle>
            <DialogDescription>
              {notificationTarget === "all"
                ? "Envie um aviso para todos os alunos com confirmação pendente."
                : "Envie um aviso para o aluno selecionado."}
            </DialogDescription>
          </DialogHeader>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotifyOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={sendNotification}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
