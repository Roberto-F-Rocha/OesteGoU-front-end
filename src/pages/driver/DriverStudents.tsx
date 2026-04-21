import { useMemo, useState } from "react";
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
import { toast } from "@/components/ui/use-toast";
import { confirmations, students, weeklySchedules } from "@/data/mockData";

type Trip = "going" | "return";
type Filter = "all" | "going" | "missing" | "pending";

const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function statusFromConfirmation(c: { goingTrip: boolean | null; returnTrip: boolean | null }, trip: Trip) {
  const value = trip === "going" ? c.goingTrip : c.returnTrip;
  if (value === true) return "going" as const;
  if (value === false) return "missing" as const;
  return "pending" as const;
}

export default function DriverStudents() {
  const [trip, setTrip] = useState<Trip>("going");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [notificationTarget, setNotificationTarget] = useState<"all" | string | null>(null);
  const [message, setMessage] = useState("Olá! Sua confirmação de presença ainda está pendente. Pode confirmar sua viagem?");
  const [notifiedIds, setNotifiedIds] = useState<string[]>([]);

  const today = dayNames[new Date().getDay()];
  const todayUniversities = useMemo(
    () =>
      Array.from(
        new Set(
          weeklySchedules
            .filter((w) => w.driverId === "d1" && w.dayOfWeek === today)
            .map((w) => w.universityName),
        ),
      ),
    [today],
  );
  const targetUniversities = todayUniversities.length > 0 ? todayUniversities : ["UFMG"];

  const rows = useMemo(() => {
    const myStudents = students.filter((s) => targetUniversities.includes(s.institution));
    return myStudents.map((s) => {
      const conf = confirmations.find((c) => c.studentId === s.id);
      const status = conf ? statusFromConfirmation(conf, trip) : ("pending" as const);
      const notificationStatus = status === "pending"
        ? notifiedIds.includes(`${trip}-${s.id}`)
          ? "notified"
          : "pending_notification"
        : null;
      return { student: s, status, notificationStatus };
    });
  }, [targetUniversities, trip, notifiedIds]);

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.student.name.toLowerCase().includes(q) ||
      r.student.institution.toLowerCase().includes(q) ||
      r.student.course.toLowerCase().includes(q)
    );
  });

  const counts = {
    all: rows.length,
    going: rows.filter((r) => r.status === "going").length,
    missing: rows.filter((r) => r.status === "missing").length,
    pending: rows.filter((r) => r.status === "pending").length,
  };

  const pendingRows = filtered.filter((r) => r.status === "pending");
  const notificationLabel =
    notificationTarget === "all"
      ? `${pendingRows.length} alunos pendentes`
      : rows.find((r) => r.student.id === notificationTarget)?.student.name ?? "Aluno";

  const openNotificationDialog = (target: "all" | string) => {
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
      setNotifiedIds((current) => Array.from(new Set([...current, ...pendingRows.map((row) => `${trip}-${row.student.id}`)])));
    } else if (notificationTarget) {
      setNotifiedIds((current) => Array.from(new Set([...current, `${trip}-${notificationTarget}`])));
    }

    toast({
      title: "Notificação enviada",
      description:
        notificationTarget === "all"
          ? `Aviso enviado para ${pendingRows.length} alunos pendentes.`
          : `Aviso enviado para ${notificationLabel}.`,
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
          Confirmações de hoje — {targetUniversities.join(", ")}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: counts.all, color: "text-foreground", icon: Users },
          { label: "Confirmados", value: counts.going, color: "text-success", icon: CheckCircle },
          { label: "Ausentes", value: counts.missing, color: "text-destructive", icon: XCircle },
          { label: "Pendentes", value: counts.pending, color: "text-warning", icon: AlertCircle },
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
            <TabsTrigger value="going">Ida</TabsTrigger>
            <TabsTrigger value="return">Volta</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar aluno, curso..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([
          { v: "all", l: "Todos" },
          { v: "going", l: "Confirmados" },
          { v: "missing", l: "Ausentes" },
          { v: "pending", l: "Pendentes" },
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
            <BellRing className="w-4 h-4" /> Notificar pendentes
          </Button>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum aluno encontrado com esses filtros.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r, i) => {
              const StatusIcon =
                r.status === "going" ? CheckCircle : r.status === "missing" ? XCircle : AlertCircle;
              const statusColor =
                r.status === "going"
                  ? "text-success"
                  : r.status === "missing"
                    ? "text-destructive"
                    : "text-warning";
              const statusLabel =
                r.status === "going" ? "Confirmado" : r.status === "missing" ? "Ausente" : "Pendente";
              return (
                <motion.li
                  key={r.student.id}
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
                      <p className="font-medium text-foreground truncate">{r.student.name}</p>
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {r.student.institution}
                      </Badge>
                      {r.notificationStatus && (
                        <Badge variant={r.notificationStatus === "notified" ? "default" : "secondary"} className="text-[10px] py-0">
                          {r.notificationStatus === "notified" ? "Notificado" : "Pendente de notificação"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.student.course}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {r.student.phone}
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {r.student.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.status === "pending" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => openNotificationDialog(r.student.id)}
                      >
                        <BellRing className="w-4 h-4" />
                        <span className="hidden sm:inline">Notificar</span>
                      </Button>
                    )}
                    <div className={`flex items-center gap-1.5 ${statusColor}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-xs font-medium hidden sm:inline">{statusLabel}</span>
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
                ? "Envie um lembrete para todos os alunos que ainda estão pendentes na lista atual."
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
