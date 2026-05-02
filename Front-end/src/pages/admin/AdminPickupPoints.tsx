import { useEffect, useMemo, useState } from "react";
import { MapPin, Pencil, Plus } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  adminCity: string;
  adminState: string;
}

interface University {
  id: number;
  name: string;
}

interface PickupPoint {
  id: number;
  name: string;
  address?: string | null;
  type: "ida" | "volta";
  active: boolean;
  universityId?: number | null;
  university?: University | null;
  city?: { id: number; name: string; state: string } | null;
}

const emptyForm = {
  id: 0,
  name: "",
  address: "",
  type: "ida" as "ida" | "volta",
  universityId: "",
  active: true,
};

export default function AdminPickupPoints({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<"todos" | "ida" | "volta">("todos");
  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    try {
      setLoading(true);
      const [pointsRes, universitiesRes] = await Promise.all([
        api.get("/admin/pickup-points"),
        api.get("/admin/universities"),
      ]);
      setPoints(pointsRes.data ?? []);
      setUniversities(universitiesRes.data ?? []);
    } catch {
      toast({
        title: "Erro ao carregar pontos",
        description: "Não foi possível buscar os pontos cadastrados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredPoints = useMemo(() => {
    return points.filter((point) => filterType === "todos" || point.type === filterType);
  }, [points, filterType]);

  const counts = useMemo(() => ({
    total: points.length,
    ida: points.filter((point) => point.type === "ida").length,
    volta: points.filter((point) => point.type === "volta").length,
  }), [points]);

  function resetForm(type: "ida" | "volta" = "ida") {
    setForm({ ...emptyForm, type });
  }

  function openCreate(type: "ida" | "volta" = "ida") {
    resetForm(type);
    setOpen(true);
  }

  function handleEdit(point: PickupPoint) {
    setForm({
      id: point.id,
      name: point.name,
      address: point.address ?? "",
      type: point.type,
      universityId: point.universityId ? String(point.universityId) : "",
      active: point.active,
    });
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (form.type === "volta" && !form.universityId) {
      toast({
        title: "Universidade obrigatória",
        description: "Pontos de volta precisam estar vinculados a uma universidade.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: form.name,
      address: form.address || undefined,
      type: form.type,
      universityId: form.type === "volta" ? Number(form.universityId) : undefined,
      active: form.active,
    };

    try {
      if (form.id) {
        await api.patch(`/admin/pickup-points/${form.id}`, payload);
        toast({ title: "Ponto atualizado" });
      } else {
        await api.post("/admin/pickup-points", payload);
        toast({ title: "Ponto cadastrado" });
      }
      setOpen(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar ponto",
        description: error?.response?.data?.error ?? "Verifique os campos obrigatórios.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Pontos"
        description={`Pontos de ida da cidade e pontos de volta das universidades em ${adminCity} / ${adminState}.`}
        icon={MapPin}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => openCreate("ida")}>
              <Plus className="w-4 h-4 mr-1.5" /> Ponto de ida
            </Button>
            <Button onClick={() => openCreate("volta")}>
              <Plus className="w-4 h-4 mr-1.5" /> Ponto de volta
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Total" value={counts.total} />
        <SummaryCard label="Pontos de ida" value={counts.ida} tone="primary" />
        <SummaryCard label="Pontos de volta" value={counts.volta} tone="accent" />
      </div>

      <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap gap-2">
        {([
          ["todos", "Todos"],
          ["ida", "Ida da cidade"],
          ["volta", "Volta por universidade"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterType(key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
              filterType === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando pontos...</div>
        ) : filteredPoints.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum ponto cadastrado ainda.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Ponto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Universidade</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPoints.map((point) => (
                  <TableRow key={point.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{point.name}</p>
                      <p className="text-xs text-muted-foreground">{point.address || "Sem endereço complementar"}</p>
                    </TableCell>
                    <TableCell>{point.type === "volta" ? "Volta" : "Ida"}</TableCell>
                    <TableCell>{point.type === "volta" ? point.university?.name ?? "Não informada" : "Não se aplica"}</TableCell>
                    <TableCell>{point.city ? `${point.city.name} / ${point.city.state}` : `${adminCity} / ${adminState}`}</TableCell>
                    <TableCell>{point.active ? "Ativo" : "Inativo"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(point)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar ponto" : "Novo ponto"}</DialogTitle>
            <DialogDescription>
              Cadastre pontos de ida para a cidade ou pontos de volta vinculados a uma universidade.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Tipo do ponto</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((state) => ({ ...state, type: e.target.value as "ida" | "volta", universityId: e.target.value === "ida" ? "" : state.universityId }))}
                >
                  <option value="ida">Ida da cidade</option>
                  <option value="volta">Volta da universidade</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Nome do ponto</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((state) => ({ ...state, name: e.target.value }))}
                  placeholder="Ex: Praça central, Portão principal..."
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Endereço / referência</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((state) => ({ ...state, address: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>

              {form.type === "volta" && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Universidade</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.universityId}
                    onChange={(e) => setForm((state) => ({ ...state, universityId: e.target.value }))}
                    required
                  >
                    <option value="">Selecione uma universidade...</option>
                    {universities.map((university) => (
                      <option key={university.id} value={university.id}>{university.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label>Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={String(form.active)}
                  onChange={(e) => setForm((state) => ({ ...state, active: e.target.value === "true" }))}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
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

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "primary" | "accent";
}) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary",
    accent: "text-accent",
  }[tone];

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-heading font-bold", toneClass)}>{value}</p>
    </div>
  );
}
