import { useMemo, useState } from "react";
import { Clock, Moon, Pencil, Plus, Sun, Sunset, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { addShift, listShiftsByCity, removeShift, updateShift } from "@/data/shiftsStore";

interface Props {
  adminCity: string;
  adminState: string;
}

const empty = {
  id: "",
  key: "",
  label: "",
  departureTime: "",
  returnTime: "",
};

function shiftIcon(time: string) {
  const h = Number(time?.split(":")[0] ?? "0");
  if (h < 12) return Sun;
  if (h < 17) return Sunset;
  return Moon;
}

export default function AdminShifts({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const list = useMemo(() => listShiftsByCity(adminCity, adminState), [adminCity, adminState, version]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.departureTime || !form.returnTime) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    const key = (form.key || form.label)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-");

    if (form.id) {
      updateShift(form.id, {
        key,
        label: form.label.trim(),
        departureTime: form.departureTime,
        returnTime: form.returnTime,
      });
      toast({ title: "Turno atualizado" });
    } else {
      addShift({
        city: adminCity,
        state: adminState,
        key,
        label: form.label.trim(),
        departureTime: form.departureTime,
        returnTime: form.returnTime,
      });
      toast({ title: "Turno criado" });
    }
    setOpen(false);
    setForm(empty);
    setVersion((v) => v + 1);
  };

  const handleEdit = (id: string) => {
    const s = list.find((x) => x.id === id);
    if (!s) return;
    setForm({
      id: s.id,
      key: s.key,
      label: s.label,
      departureTime: s.departureTime,
      returnTime: s.returnTime,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remover este turno?")) return;
    removeShift(id);
    toast({ title: "Turno removido" });
    setVersion((v) => v + 1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Turnos"
        description="Defina os turnos disponíveis para alunos e horários."
        icon={Clock}
        actions={
          <Button onClick={() => { setForm(empty); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Novo turno
          </Button>
        }
      />

      {list.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          Nenhum turno cadastrado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((s) => {
            const Icon = shiftIcon(s.departureTime);
            return (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 text-primary p-2">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-foreground">{s.label}</p>
                      <p className="text-xs text-muted-foreground">chave: {s.key}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-muted-foreground">Saída</p>
                    <p className="font-medium text-foreground">{s.departureTime}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-muted-foreground">Volta</p>
                    <p className="font-medium text-foreground">{s.returnTime}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(s.id)}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar turno" : "Novo turno"}</DialogTitle>
            <DialogDescription>
              Informe um nome curto e os horários padrão de saída e retorno.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))}
                placeholder="Manhã, Tarde, Noite..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Saída</Label>
                <Input
                  type="time"
                  value={form.departureTime}
                  onChange={(e) => setForm((s) => ({ ...s, departureTime: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Volta</Label>
                <Input
                  type="time"
                  value={form.returnTime}
                  onChange={(e) => setForm((s) => ({ ...s, returnTime: e.target.value }))}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
