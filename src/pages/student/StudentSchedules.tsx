import { motion } from "framer-motion";
import { Clock, MapPin, Bus, Calendar } from "lucide-react";
import { schedules, weeklySchedules } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

export default function StudentSchedules() {
  // Mock: aluno é da UFMG
  const myUniversity = "UFMG";
  const mySchedule = schedules.find((s) => s.universityName === myUniversity)!;
  const myWeek = weeklySchedules.filter((w) => w.universityName === myUniversity);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" /> Horários
        </h1>
        <p className="text-muted-foreground text-sm">Sua rota e escala semanal — {myUniversity}</p>
      </div>

      {/* Rota fixa */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="bg-primary/5 p-4 border-b border-border">
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Bus className="w-5 h-5 text-primary" /> Rota padrão
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Aplica-se aos dias com escala confirmada</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Ida</span>
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{mySchedule.departureTime}</p>
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{mySchedule.departureLocation}</span>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Volta</span>
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{mySchedule.returnTime}</p>
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{mySchedule.returnLocation}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Escala semanal */}
      <div>
        <h2 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Escala semanal
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {days.map((day, i) => {
            const items = myWeek.filter((w) => w.dayOfWeek === day);
            const hasTrip = items.length > 0;
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-card border rounded-xl p-4 ${hasTrip ? "border-border" : "border-dashed border-border/60"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={hasTrip ? "default" : "secondary"}>{day}</Badge>
                  {!hasTrip && <span className="text-xs text-muted-foreground">Sem viagem</span>}
                </div>
                {hasTrip ? (
                  items.map((s) => (
                    <div key={s.id} className="space-y-1 text-sm">
                      <p className="text-xs text-muted-foreground">Motorista: <span className="text-foreground">{s.driverName}</span></p>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Ida
                        </span>
                        <span className="font-medium text-foreground">{s.departureTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-accent" /> Volta
                        </span>
                        <span className="font-medium text-foreground">{s.returnTime}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Aproveite o dia livre.</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
