import { motion } from "framer-motion";
import { Bus, Calendar, Users, Clock, MapPin, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { weeklySchedules, confirmations } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { label: "Minha Escala", path: "/motorista", icon: Calendar },
  { label: "Alunos", path: "/motorista/alunos", icon: Users },
];

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

export default function DriverDashboard() {
  const mySchedules = weeklySchedules.filter(w => w.driverId === "d1");

  return (
    <DashboardLayout navItems={navItems} title="Painel do Motorista">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Olá, Carlos! 🚌</h1>
          <p className="text-muted-foreground text-sm">Sua escala semanal</p>
        </div>

        {/* Weekly schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {days.map((day, i) => {
            const daySchedules = mySchedules.filter(s => s.dayOfWeek === day);
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
                {daySchedules.map(s => (
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

        {/* Today's student list */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Alunos de Hoje - UFMG
          </h3>
          <div className="space-y-2">
            {confirmations.filter(c => c.universityName === "UFMG").map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="font-medium text-sm text-foreground">{c.studentName}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    Ida: {c.goingTrip === true ? <CheckCircle className="w-4 h-4 text-success" /> : c.goingTrip === false ? <XCircle className="w-4 h-4 text-destructive" /> : <AlertCircle className="w-4 h-4 text-warning" />}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    Volta: {c.returnTrip === true ? <CheckCircle className="w-4 h-4 text-success" /> : c.returnTrip === false ? <XCircle className="w-4 h-4 text-destructive" /> : <AlertCircle className="w-4 h-4 text-warning" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
