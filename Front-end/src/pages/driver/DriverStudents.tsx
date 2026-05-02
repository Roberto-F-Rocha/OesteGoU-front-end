import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, CheckCircle, XCircle, AlertCircle, Phone, Mail, GraduationCap, BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Trip = "ida" | "volta";
type Filter = "all" | "confirmed" | "canceled" | "absent";

interface StudentRow {
  reservationId: number;
  status: "confirmed" | "canceled" | "absent";
  routeId: number;
  routeName: string;
  scheduleType: "ida" | "volta";
  scheduleTime: string;
  pickupPoint?: string | null;
  user: {
    id: number;
    nome: string;
    email?: string | null;
    phone?: string | null;
    institution?: string | null;
  };
}

function getStatusInfo(status: StudentRow["status"]) {
  if (status === "confirmed") return { icon: CheckCircle, color: "text-success", label: "Confirmado" };
  if (status === "absent") return { icon: XCircle, color: "text-destructive", label: "Ausente" };
  return { icon: AlertCircle, color: "text-warning", label: "Cancelado" };
}

export default function DriverStudents() {
  const { toast } = useToast();
  const [trip, setTrip] = useState<Trip>("ida");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationTarget, setNotificationTarget] = useState<"all" | number | null>(null);
  const [message, setMessage] = useState("Olá! Sua confirmação de presença ainda está pendente. Pode confirmar sua viagem?");
  const [notifiedIds, setNotifiedIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadStudents() {
      try {
        setLoading(true);
        const { data } = await api.get("/driver/routes");
        const parsedRows: StudentRow[] = [];

        (data ?? []).forEach((route) => {
          (route.reservations ?? []).forEach((reservation) => {
            parsedRows.push({
              reservationId: reservation.id,
              status: reservation.status,
              routeId: route.id,
              routeName: route.name,
              scheduleType: route.schedule?.type ?? "ida",
              scheduleTime: route.schedule?.time ?? "--:--",
              pickupPoint: reservation.pickupPoint?.name ?? route.points?.[0]?.pickupPoint?.name ?? null,
              user: reservation.user,
            });
          });
        });

        setRows(parsedRows);
      } catch {
        toast({
          title: "Erro ao carregar alunos",
          description: "Não foi possível buscar os alunos das suas rotas.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (row.scheduleType !== trip) return false;
      if (filter !== "all" && row.status !== filter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        row.user.nome.toLowerCase().includes(q) ||
        (row.user.institution ?? "").toLowerCase().includes(q) ||
        row.routeName.toLowerCase().includes(q)
      );
    });
  }, [rows, trip, filter, query]);

  const tripRows = rows.filter((row) => row.scheduleType === trip);
  const pendingRows = filtered.filter((row) => row.status !== "confirmed");
  const counts = {
    all: tripRows.length,
    confirmed: tripRows.filter((row) => row.status === "confirmed").length,
    canceled: tripRows.filter((row) => row.status === "canceled").length,
    absent: tripRows.filter((row) => row.status === "absent").length,
  };

  const notificationLabel =
    notificationTarget === "all"
      ? `${pendingRows.length} alunos pendentes`
      : rows.find((row) => row.user.id === notificationTarget)?.user.nome ?? "Aluno";

  const openNotificationDialog = (target: "all" | number) => {
    setNotificationTarget(target);
    setMessage("Olá! Sua confirmação de presença ainda está pendente. Pode confirmar sua viagem?");
  };

  const handleSendNotification = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      toast({
        title: "Mensagem obrigatória",
        description: "Escreva uma mensagem antes de enviar a notificação.",
        variant: "destructive",
      });
      return;
    }

    if (notificationTarget === "all") {
      setNotifiedIds((current) => Array.from(new Set([...current, ...pendingRows.map((row) => `${trip}-${row.user.id}`)])));
    } else if (notificationTarget) {
      setNotifiedIds((current) => Array.from(new Set([...current, `${trip}-${notificationTarget}`])));
    }

    toast({
      title: "Notificação registrada",
      description:
        notificationTarget === "all"
          ? `Aviso marcado para ${pendingRows.length} alunos pendentes.`
          : `Aviso marcado para ${notificationLabel}.`,
    });

    setNotificationTarget(null);
    setMessage("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Alunos
        </h1>
        <p className="text-muted-foreground text-sm">
          Alunos confirmados nas rotas atribuídas a você.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: counts.all, color: "text-foreground", icon: Users },
          { label: "Confirmados", value: counts.confirmed, color: "text-success", icon: CheckCircle },
          { label: "Cancelados", value: counts.canceled, color: "text-warning", icon: AlertCircle },
          { label: "Ausentes", value: counts.absent, color: "text-destructive", icon: XCircle },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-2xl font-heading font-bold mt-1 ${s.color}`}>{s.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Tabs value={trip} onValueChange={(v) => setTrip(v as Trip)}>
          <TabsList>
            <TabsTrigger value="ida">Ida</TabsTrigger>
            <TabsTrigger value="volta">Volta</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar aluno, instituição..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([
          { v: "all", l: "Todos" },
          { v: "confirmed", l: "Confirmados" },
          { v: "canceled", l: "Cancelados" },
          { v: "absent", l: "Ausentes" },
        ] as { v: Filter; l: string }[]).map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f.v
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {pendingRows.length > 0 && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => openNotificationDialog("all")}>
            <BellRing className="w-4 h-4 mr-2" /> Notificar pendentes
          </Button>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando alunos...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum aluno encontrado com esses filtros.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((row, i) => {
              const { icon: StatusIcon, color, label } = getStatusInfo(row.status);
              const notificationStatus = row.status !== "confirmed"
                ? notifiedIds.includes(`${trip}-${row.user.id}`)
                  ? "notified"
                  : "pending_notification"
                : null;

              return (
                <motion.li
                  key={`${row.routeId}-${row.reservationId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="p-4 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate">{row.user.nome}</p>
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {row.user.institution ?? "Instituição não informada"}
                      </Badge>
                      {notificationStatus && (
                        <Badge variant={notificationStatus === "notified" ? "default" : "secondary"} className="text-[10px] py-0">
                          {notificationStatus === "notified" ? "Notificado" : "Pendente de notificação"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {row.routeName} • {row.scheduleTime} • {row.pickupPoint ?? "Ponto não informado"}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {row.user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {row.user.phone}
                        </span>
                      )}
                      {row.user.email && (
                        <span className="hidden sm:flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {row.user.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {row.status !== "confirmed" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => openNotificationDialog(row.user.id)}
                      >
                        <BellRing className="w-4 h-4" />
                        <span className="hidden sm:inline">Notificar</span>
                      </Button>
                    )}
                    <div className={`flex items-center gap-1.5 ${color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-xs font-medium hidden sm:inline">{label}</span>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={notificationTarget !== null} onOpenChange={(open) => !open && setNotificationTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar notificação</DialogTitle>
            <DialogDescription>
              {notificationTarget === "all"
                ? "Envie um lembrete para todos os alunos pendentes na lista atual."
                : `Envie um lembrete para ${notificationLabel} confirmar a viagem.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Destino: {notificationLabel}</p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva a mensagem da notificação"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotificationTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSendNotification}>
              Enviar aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
