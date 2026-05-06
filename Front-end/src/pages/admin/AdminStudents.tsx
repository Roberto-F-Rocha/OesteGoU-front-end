import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, GraduationCap, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const labels: Record<AdminUser["status"], string> = {
    active: "Ativo",
    pending: "Pendente",
    inactive: "Inativo",
    blocked: "Bloqueado",
  };

  return labels[status];
}

function statusBadgeVariant(status: AdminUser["status"]) {
  if (status === "active") return "default";
  if (status === "blocked") return "destructive";
  return "secondary";
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

      const { data } = await api.get<AdminUser[]>("/admin/users", {
        params: { role: "student" },
      });

      setStudents(data ?? []);
    } catch {
      toast({
        title: "Erro ao carregar alunos",
        description: "Não foi possível buscar os alunos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return students;

    return students.filter((student) => {
      const name = student.nome.toLowerCase();
      const email = student.email.toLowerCase();
      const institution = (student.institution ?? "").toLowerCase();
      const city = (student.city?.name ?? "").toLowerCase();

      return (
        name.includes(normalizedQuery) ||
        email.includes(normalizedQuery) ||
        institution.includes(normalizedQuery) ||
        city.includes(normalizedQuery)
      );
    });
  }, [students, query]);

  async function updateStatus(id: number, status: AdminUser["status"]) {
    try {
      setUpdatingId(id);

      await api.patch(`/admin/users/${id}/status`, { status });

      toast({
        title: "Status atualizado",
        description: "O status do aluno foi atualizado com sucesso.",
      });

      await loadStudents();
    } catch {
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível alterar o status do aluno.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  function renderActions(student: AdminUser) {
    const isUpdating = updatingId === student.id;

    return (
      <div className="flex justify-end gap-2">
        {student.status === "pending" && (
          <Button
            variant="default"
            size="sm"
            disabled={isUpdating}
            onClick={() => updateStatus(student.id, "active")}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Aprovar
          </Button>
        )}

        {student.status === "inactive" && (
          <Button
            variant="default"
            size="sm"
            disabled={isUpdating}
            onClick={() => updateStatus(student.id, "active")}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Ativar
          </Button>
        )}

        {student.status === "active" && (
          <Button
            variant="secondary"
            size="sm"
            disabled={isUpdating}
            onClick={() => updateStatus(student.id, "inactive")}
          >
            Desativar
          </Button>
        )}

        {student.status === "blocked" ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={isUpdating}
            onClick={() => updateStatus(student.id, "active")}
          >
            Desbloquear
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled={isUpdating}
            onClick={() => updateStatus(student.id, "blocked")}
            title="Bloquear aluno"
          >
            <ShieldAlert className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Alunos"
        description={`Alunos vinculados a ${adminCity} / ${adminState}.`}
        icon={GraduationCap}
      />

      <div className="bg-card border border-border rounded-xl p-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar aluno, e-mail, cidade ou instituição..."
            className="pl-9"
          />
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
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    Carregando alunos...
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhum aluno encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {student.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CPF: {student.cpf ?? "Não informado"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="text-foreground">
                          {student.institution ?? "Não informado"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.city?.name ?? adminCity}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="text-sm text-foreground">
                          {student.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.phone ?? "Telefone não informado"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusBadgeVariant(student.status)}>
                        {statusLabel(student.status)}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {renderActions(student)}
                    </TableCell>
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