import { useMemo, useState } from "react";
import { Pencil, Plus, School, Trash2 } from "lucide-react";
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
  addUniversity,
  listUniversitiesByCity,
  listUniversityCatalog,
  removeUniversity,
  updateUniversity,
} from "@/data/universitiesStore";

interface Props {
  adminCity: string;
  adminState: string;
}

const empty = { id: "", name: "", shortName: "", address: "" };

export default function AdminUniversities({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const list = useMemo(() => listUniversitiesByCity(adminCity), [adminCity, version]);
  const catalog = listUniversityCatalog();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Informe o nome da universidade", variant: "destructive" });
      return;
    }
    if (form.id) {
      updateUniversity(form.id, {
        name: form.name.trim(),
        shortName: form.shortName.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      toast({ title: "Universidade atualizada" });
    } else {
      addUniversity({
        city: adminCity,
        state: adminState,
        name: form.name.trim(),
        shortName: form.shortName.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      toast({ title: "Universidade cadastrada" });
    }
    setOpen(false);
    setForm(empty);
    setVersion((v) => v + 1);
  };

  const handleEdit = (id: string) => {
    const u = list.find((x) => x.id === id);
    if (!u) return;
    setForm({ id: u.id, name: u.name, shortName: u.shortName ?? "", address: u.address ?? "" });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remover esta universidade?")) return;
    removeUniversity(id);
    toast({ title: "Universidade removida" });
    setVersion((v) => v + 1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Universidades"
        description={`Catálogo de instituições de ${adminCity}.`}
        icon={School}
        actions={
          <Button onClick={() => { setForm(empty); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Nova universidade
          </Button>
        }
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma universidade cadastrada ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Sigla</TableHead>
                <TableHead className="hidden md:table-cell">Endereço</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {u.shortName ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {u.address ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(u.id)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar universidade" : "Nova universidade"}</DialogTitle>
            <DialogDescription>
              Cadastre as universidades atendidas para vincular nos horários.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                list="university-catalog"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Ex.: UFERSA - Universidade Federal Rural do Semi-Árido"
                required
              />
              <datalist id="university-catalog">
                {catalog.map((c) => (
                  <option value={c} key={c} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sigla</Label>
                <Input
                  value={form.shortName}
                  onChange={(e) => setForm((s) => ({ ...s, shortName: e.target.value }))}
                  placeholder="UFERSA"
                />
              </div>
              <div className="space-y-2">
                <Label>Endereço / cidade</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                  placeholder="Mossoró/RN"
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
