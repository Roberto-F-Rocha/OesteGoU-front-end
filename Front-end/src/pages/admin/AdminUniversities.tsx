import { useEffect, useState } from "react";
import { Pencil, Plus, School } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Props { adminCity: string; adminState: string; }
interface University { id: number; name: string; cityName?: string | null; cityId?: number | null; city?: { name: string; state: string } | null; }
const empty = { id: 0, name: "", cityName: "" };

export default function AdminUniversities({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadUniversities() {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/universities");
      setUniversities(data ?? []);
    } catch {
      toast({ title: "Erro ao carregar universidades", description: "Não foi possível buscar as universidades.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUniversities(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name: form.name.trim(), cityName: form.cityName.trim() || adminCity };
      if (form.id) {
        await api.patch(`/admin/universities/${form.id}`, payload);
        toast({ title: "Universidade atualizada" });
      } else {
        await api.post("/admin/universities", payload);
        toast({ title: "Universidade cadastrada" });
      }
      setOpen(false);
      setForm(empty);
      await loadUniversities();
    } catch {
      toast({ title: "Erro ao salvar universidade", description: "Verifique o nome informado.", variant: "destructive" });
    }
  };

  const handleEdit = (university: University) => {
    setForm({ id: university.id, name: university.name, cityName: university.cityName ?? university.city?.name ?? adminCity });
    setOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Universidades" description={`Catálogo de instituições de ${adminCity} / ${adminState}.`} icon={School} actions={<Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="w-4 h-4 mr-1.5" /> Nova universidade</Button>} />
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Carregando universidades...</div> : universities.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma universidade cadastrada ainda.</div> : (
          <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cidade</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{universities.map((u) => (
            <TableRow key={u.id}><TableCell className="font-medium text-foreground">{u.name}</TableCell><TableCell className="text-muted-foreground">{u.cityName ?? u.city?.name ?? "—"}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleEdit(u)}><Pencil className="w-4 h-4" /></Button></TableCell></TableRow>
          ))}</TableBody></Table>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{form.id ? "Editar universidade" : "Nova universidade"}</DialogTitle><DialogDescription>Cadastre as universidades atendidas para vincular nos horários.</DialogDescription></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Ex.: UFERSA - Pau dos Ferros" required /></div><div className="space-y-2"><Label>Cidade da instituição</Label><Input value={form.cityName} onChange={(e) => setForm((s) => ({ ...s, cityName: e.target.value }))} placeholder={adminCity} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
}
