import { useMemo } from "react";
import { motion } from "framer-motion";
import { Bus, Clock, MapPin, Sun, Sunset, Moon, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getSchedulesByCity } from "@/data/registrationsStore";

const WEEK_DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type Shift = {
  key: "morning" | "afternoon" | "evening";
  label: string;
  icon: typeof Sun;
  badgeClass: string;
};

const SHIFTS: Record<Shift["key"], Shift> = {
  morning: {
    key: "morning",
    label: "Manhã",
    icon: Sun,
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  afternoon: {
    key: "afternoon",
    label: "Tarde",
    icon: Sunset,
    badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  },
  evening: {
    key: "evening",
    label: "Noite",
    icon: Moon,
    badgeClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  },
};

function getShift(time: string): Shift {
  const hour = Number(time?.split(":")[0] ?? "0");
  if (hour < 12) return SHIFTS.morning;
  if (hour < 17) return SHIFTS.afternoon;
  return SHIFTS.evening;
}

export default function DriverSchedule() {
  const { user } = useAuth();
  const driverId = user?.id ?? "";
  const driverName = user?.name?.split(" ")[0] ?? "Motorista";
  const city = user?.city ?? "";

  const realSchedules = useMemo(
    () => getSchedulesByCity(city).filter((s) => s.driverId === driverId),
    [city, driverId],
  );

  const exampleSchedules = useMemo(
    () => [
      {
        id: "ex-1",
        title: "UFERSA - Pau dos Ferros",
        dayOfWeek: "Segunda",
        departureTime: "05:40",
        departureLocation: "Praça Central - Riacho da Cruz",
        returnTime: "11:50",
        returnLocation: "UFERSA - Portaria Principal",
      },
      {
        id: "ex-2",
        title: "UERN - Pau dos Ferros",
        dayOfWeek: "Terça",
        departureTime: "11:40",
        departureLocation: "Praça Central - Riacho da Cruz",
        returnTime: "17:50",
        returnLocation: "UERN - Entrada Principal",
      },
      {
        id: "ex-3",
        title: "IFRN - Pau dos Ferros",
        dayOfWeek: "Quarta",
        departureTime: "17:40",
        departureLocation: "Praça Central - Riacho da Cruz",
        returnTime: "21:50",
        returnLocation: "IFRN - Campus Pau dos Ferros",
      },
      {
        id: "ex-4",
        title: "UFERSA - Pau dos Ferros",
        dayOfWeek: "Quinta",
        departureTime: "05:40",
        departureLocation: "Praça Central - Riacho da Cruz",
        returnTime: "11:50",
        returnLocation: "UFERSA - Portaria Principal",
      },
      {
        id: "ex-5",
        title: "UERN - Pau dos Ferros",
        dayOfWeek: "Sexta",
        departureTime: "17:40",
        departureLocation: "Praça Central - Riacho da Cruz",
        returnTime: "21:50",
        returnLocation: "UERN - Entrada Principal",
      },
    ],
    [],
  );

  const isExample = realSchedules.length === 0;
  const mySchedules = isExample ? exampleSchedules : realSchedules;

  const grouped = WEEK_DAYS.map((day) => ({
    day,
    items: mySchedules.filter((s) => s.dayOfWeek === day),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Olá, {driverName}! 🚌</h1>
        <p className="text-muted-foreground text-sm">
          Sua escala semanal definida pela administração de {city || "sua cidade"}.
        </p>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-heading font-semibold text-foreground">Nenhuma escala atribuída</p>
          <p className="text-sm text-muted-foreground mt-1">
            Você ainda não foi escalado em nenhuma rota. Aguarde a definição do administrador.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grouped.map(({ day, items }, dayIdx) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIdx * 0.05 }}
              className="bg-card border border-border rounded-xl p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="font-heading">{day}</Badge>
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "rota" : "rotas"}
                </span>
              </div>

              {items.map((s) => {
                const shift = getShift(s.departureTime);
                const ShiftIcon = shift.icon;
                return (
                  <div key={s.id} className="space-y-3 pt-3 border-t border-border first:border-t-0 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-heading font-semibold text-foreground flex items-center gap-2">
                        <Bus className="w-4 h-4 text-primary" /> {s.title}
                      </p>
                      <Badge variant="outline" className={`${shift.badgeClass} gap-1`}>
                        <ShiftIcon className="w-3 h-3" />
                        Turno {shift.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Ida
                        </div>
                        <p className="text-foreground font-medium">{s.departureTime}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {s.departureLocation}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                          <Clock className="w-3.5 h-3.5 text-accent" /> Volta
                        </div>
                        <p className="text-foreground font-medium">{s.returnTime}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {s.returnLocation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
