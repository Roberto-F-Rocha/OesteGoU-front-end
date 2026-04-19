import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, CheckCircle, XCircle, AlertCircle, Phone, Mail, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { students, confirmations, weeklySchedules } from "@/data/mockData";

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

  const today = dayNames[new Date().getDay()];
  // Mock: motorista d1, busca universidades que ele dirige hoje
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
  // Fallback: se não tiver hoje, usa UFMG
  const targetUniversities = todayUniversities.length > 0 ? todayUniversities : ["UFMG"];

  const rows = useMemo(() => {
    const myStudents = students.filter((s) => targetUniversities.includes(s.institution));
    return myStudents.map((s) => {
      const conf = confirmations.find((c) => c.studentId === s.id);
      const status = conf
        ? statusFromConfirmation(conf, trip)
        : ("pending" as const);
      return { student: s, status };
    });
  }, [targetUniversities, trip]);

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

      {/* Stats */}
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

      {/* Trip switcher + search */}
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

      {/* Filter chips */}
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

      {/* List */}
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
                  <div className={`flex items-center gap-1.5 ${statusColor}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-xs font-medium hidden sm:inline">{statusLabel}</span>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
