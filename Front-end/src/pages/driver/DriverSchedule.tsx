import { motion } from "framer-motion";
import { Bus, Clock } from "lucide-react";
import { weeklySchedules } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

export default function DriverSchedule() {
  const mySchedules = weeklySchedules.filter((w) => w.driverId === "d1");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Olá, Carlos! 🚌</h1>
        <p className="text-muted-foreground text-sm">Sua escala semanal</p>
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
              {daySchedules.map((s) => (
                <div key={s.id} className="space-y-2">
                  <p className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <Bus className="w-4 h-4 text-primary" /> {s.universityName}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
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
              ))}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
