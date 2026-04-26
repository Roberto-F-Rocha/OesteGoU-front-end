import { motion } from "framer-motion";
import { Bus, Clock, Sun, Sunset, Moon } from "lucide-react";
import { weeklySchedules } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { getShiftByTimes, getShift, type ShiftKey } from "@/data/shifts";

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

const shiftIcons: Record<ShiftKey, typeof Sun> = {
  manha: Sun,
  tarde: Sunset,
  noite: Moon,
};

const shiftStyles: Record<ShiftKey, string> = {
  manha: "bg-primary/10 text-primary border-primary/20",
  tarde: "bg-accent/10 text-accent border-accent/20",
  noite: "bg-secondary text-secondary-foreground border-border",
};

export default function DriverSchedule() {
  const mySchedules = weeklySchedules.filter((w) => w.driverId === "d1");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Olá, Carlos! 🚌</h1>
        <p className="text-muted-foreground text-sm">Sua escala semanal definida pelo administrador</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {days.map((day, i) => {
          const daySchedules = mySchedules.filter((s) => s.dayOfWeek === day);
          if (daySchedules.length === 0) return null;
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="font-heading">{day}</Badge>
              </div>
              <div className="space-y-4">
                {daySchedules.map((s) => {
                  const shiftKey = getShiftByTimes(s.departureTime, s.returnTime);
                  const shift = shiftKey ? getShift(shiftKey) : null;
                  const ShiftIcon = shiftKey ? shiftIcons[shiftKey] : Clock;
                  return (
                    <div key={s.id} className="space-y-2">
                      <p className="font-heading font-semibold text-foreground flex items-center gap-2">
                        <Bus className="w-4 h-4 text-primary" /> {s.universityName}
                      </p>

                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${
                          shiftKey ? shiftStyles[shiftKey] : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        <ShiftIcon className="w-3.5 h-3.5" />
                        Turno: {shift?.label ?? "Personalizado"}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm pt-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          Ida: <span className="text-foreground font-medium">{s.departureTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 text-accent" />
                          Volta: <span className="text-foreground font-medium">{s.returnTime}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
