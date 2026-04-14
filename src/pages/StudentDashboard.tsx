import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, MapPin, Bus, Calendar, Bell } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { schedules } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { label: "Minha Viagem", path: "/aluno", icon: Bus },
  { label: "Horários", path: "/aluno/horarios", icon: Clock },
  { label: "Notificações", path: "/aluno/notificacoes", icon: Bell },
];

export default function StudentDashboard() {
  const { toast } = useToast();
  const [goingConfirmed, setGoingConfirmed] = useState<boolean | null>(null);
  const [returnConfirmed, setReturnConfirmed] = useState<boolean | null>(null);
  const mySchedule = schedules[0]; // Mock: student is from UFMG

  const handleConfirm = (trip: "going" | "return", value: boolean) => {
    if (trip === "going") setGoingConfirmed(value);
    else setReturnConfirmed(value);
    toast({
      title: value ? "Presença confirmada!" : "Ausência registrada",
      description: `${trip === "going" ? "Ida" : "Volta"} - ${mySchedule.universityName}`,
    });
  };

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <DashboardLayout navItems={navItems} title="Painel do Aluno">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Olá, João! 👋</h1>
          <p className="text-muted-foreground text-sm capitalize">{today}</p>
        </div>

        {/* Today's trip card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-primary/5 p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-foreground">Viagem de Hoje</h2>
                <p className="text-sm text-muted-foreground">{mySchedule.universityName}</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Going trip */}
            <div className="p-4 bg-muted/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bus className="w-5 h-5 text-primary" />
                  <span className="font-heading font-semibold text-foreground">Ida</span>
                </div>
                <span className="text-lg font-heading font-bold text-primary">{mySchedule.departureTime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{mySchedule.departureLocation}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={goingConfirmed === true ? "default" : "outline"}
                  onClick={() => handleConfirm("going", true)}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Vou
                </Button>
                <Button
                  size="sm"
                  variant={goingConfirmed === false ? "destructive" : "outline"}
                  onClick={() => handleConfirm("going", false)}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-1" /> Não vou
                </Button>
              </div>
            </div>

            {/* Return trip */}
            <div className="p-4 bg-muted/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bus className="w-5 h-5 text-accent" />
                  <span className="font-heading font-semibold text-foreground">Volta</span>
                </div>
                <span className="text-lg font-heading font-bold text-accent">{mySchedule.returnTime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{mySchedule.returnLocation}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={returnConfirmed === true ? "default" : "outline"}
                  onClick={() => handleConfirm("return", true)}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Vou
                </Button>
                <Button
                  size="sm"
                  variant={returnConfirmed === false ? "destructive" : "outline"}
                  onClick={() => handleConfirm("return", false)}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-1" /> Não vou
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-warning" /> Notificações
          </h3>
          <div className="space-y-2">
            {[
              { msg: "Lembrete: Confirme sua presença para amanhã!", time: "Há 2h", read: false },
              { msg: "Horário de volta alterado para 18:30", time: "Ontem", read: true },
              { msg: "Seu cadastro foi aprovado pelo administrador", time: "3 dias", read: true },
            ].map((n, i) => (
              <div key={i} className={`p-3 rounded-lg text-sm flex items-start gap-3 ${!n.read ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 ${!n.read ? "bg-primary" : "bg-muted-foreground/30"}`} />
                <div className="flex-1">
                  <p className="text-foreground">{n.msg}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
