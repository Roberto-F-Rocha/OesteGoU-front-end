import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Search, ShieldAlert, Truck } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Props {
  adminCity: string;
  adminState: string;
}

interface DriverUser {
  id: number;
  nome: string;
  email: string;
  role: "driver";
  status: "active" | "pending" | "inactive" | "blocked";
  cpf?: string | null;
  phone?: string | null;
  city?: { name: string; state: string } | null;
  createdAt: string;
}

function statusLabel(status: DriverUser["status"]) {
  const labels = {
    active: "Ativo",
    pending: "Pendente",
    inactive: "Inativo",
    blocked: "Bloqueado",
  };
  return labels[status] ?? status;
}

export default function AdminDrivers({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function loadDrivers() {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/users", { params: { role: "driver" } });
      setDrivers(data ?? []);
    } catch {
      toast({
        title: "Erro ao carregar motoristas",
        description: "Não foi possível buscar os motoristas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return drivers;
    const q = query.toLowerCase();
    return drivers.filter((driver) =>
      driver.nome.toLowerCase().includes(q) ||
      driver.email.toLowerCase().includes(q) ||
      (driver.phone ?? "").toLowerCase().includes(q),
    );
  }, [drivers, query]);

  const updateStatus = async (id: number, status: DriverUser["status"]) => {
    try {
      setUpdatingId(id);
      await api.patch(`/admin/users/${id}/status`, { status });
      toast({ title: "Status atualizado" });
      await loadDrivers();
    } catch {
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível alterar o status do motorista.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Motoristas"
        description={`Motoristas vinculados a ${adminCity} / ${adminState}.`}
        icon={Truck}
      />

      <div className="bg-card border border-border rounded-xl p-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar motorista, e-mail ou telefone..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motorista</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando motoristas...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum motorista encontrado.</TableCell>
              </TableRow>
            ) : (
              filtered.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{driver.nome}</p>
                      <p className="text-xs text-muted-foreground">CPF: {driver.cpf ?? "Não informado"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-foreground">{driver.email}</p>
                    <p className="text-xs text-muted-foreground">{driver.phone ?? "Telefone não informado"}</p>
                  </TableCell>
                  <TableCell>{driver.city?.name ?? adminCity}</TableCell>
                  <TableCell>
                    <Badge variant={driver.status === "active" ? "default" : driver.status === "blocked" ? "destructive" : "secondary"}>
                      {statusLabel(driver.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" disabled={updatingId === driver.id} onClick={() => updateStatus(driver.id, driver.status === "active" ? "pending" : "active")}>
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" disabled={updatingId === driver.id} onClick={() => updateStatus(driver.id, driver.status === "blocked" ? "active" : "blocked")}>
                        <ShieldAlert className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
