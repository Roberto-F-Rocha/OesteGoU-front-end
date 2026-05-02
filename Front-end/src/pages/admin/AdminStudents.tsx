import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, GraduationCap, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/admin/PageHeader";
import { api } from "@/lib/api";

interface Props {
  adminCity: string;
  adminState: string;
}

interface AdminUser {
  id: number;
  nome: string;
  email: string;
  role: "admin" | "student" | "driver";
  status: "active" | "pending" | "inactive" | "blocked";
  cpf?: string | null;
  phone?: string | null;
  institution?: string | null;
  city?: { name: string; state: string } | null;
  createdAt: string;
}

function statusLabel(status: AdminUser["status"]) {
  const labels = {
    active: "Ativo",
    pending: "Pendente",
    inactive: "Inativo",
    blocked: "Bloqueado",
  };
  return labels[status] ?? status;
}

export default function AdminStudents({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [students, setStudents] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function loadStudents() {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/users", { params: { role: "student" } });
      setStudents(data ?? []);
    } catch {
      toast({ title: "Erro ao carregar alunos", description: "Não foi possível buscar os alunos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStudents(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return students;
    const q = query.toLowerCase();
    return students.filter((student) => student.nome.toLowerCase().includes(q) || student.email.toLowerCase().includes(q) || (student.institution ?? "").toLowerCase().includes(q));
  }, [students, query]);

  const updateStatus = async (id: number, status: AdminUser["status"]) => {
    try {
      setUpdatingId(id);
      await api.patch(`/admin/users/${id}/status`, { status });
      toast({ title: "Status atualizado" });
      await loadStudents();
    } catch {
      toast({ title: "Erro ao atualizar status", description: "Não foi possível alterar o status do aluno.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Alunos" description={`Alunos vinculados a ${adminCity} / ${adminState}.`} icon={GraduationCap} />

      <div className="bg-card border border-border rounded-xl p-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar aluno, e-mail ou instituição..." className="pl-9" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Instituição</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando alunos...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum aluno encontrado.</TableCell></TableRow>
              ) : (
                filtered.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell><div><p className="font-medium text-foreground">{student.nome}</p><p className="text-xs text-muted-foreground">CPF: {student.cpf ?? "Não informado"}</p></div></TableCell>
                    <TableCell><div><p className="text-foreground">{student.institution ?? "Não informado"}</p><p className="text-xs text-muted-foreground">{student.city?.name ?? adminCity}</p></div></TableCell>
                    <TableCell><div><p className="text-sm text-foreground">{student.email}</p><p className="text-xs text-muted-foreground">{student.phone ?? "Telefone não informado"}</p></div></TableCell>
                    <TableCell><Badge variant={student.status === "active" ? "default" : student.status === "blocked" ? "destructive" : "secondary"}>{statusLabel(student.status)}</Badge></TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" disabled={updatingId === student.id} onClick={() => updateStatus(student.id, student.status === "active" ? "pending" : "active")}><CheckCircle2 className="w-4 h-4" /></Button><Button variant="ghost" size="sm" disabled={updatingId === student.id} onClick={() => updateStatus(student.id, student.status === "blocked" ? "active" : "blocked")}><ShieldAlert className="w-4 h-4 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
