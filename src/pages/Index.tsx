import { motion } from "framer-motion";
import { Bus, ArrowRight, Users, MapPin, Shield, GraduationCap, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <nav className="relative z-10 container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Bus className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-xl text-foreground">OesteGoU</span>
          </div>
          <Button onClick={() => navigate("/login")} size="sm">
            Entrar <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </nav>

        <div className="relative z-10 container mx-auto py-16 md:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground leading-tight">
              Transporte Universitário{" "}
              <span className="text-primary">Inteligente</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-4 max-w-lg mx-auto">
              Gerencie rotas, confirme presença e acompanhe escalas de forma simples e organizada.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Button size="lg" onClick={() => navigate("/login")} className="font-heading">
                Acessar Sistema <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features */}
      <section className="container mx-auto py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: GraduationCap, title: "Para Alunos", desc: "Confirme presença, veja horários e receba notificações sobre sua rota." },
            { icon: Truck, title: "Para Motoristas", desc: "Acesse sua escala semanal e veja a lista de alunos para cada viagem." },
            { icon: Shield, title: "Para Administradores", desc: "Gerencie alunos, motoristas, rotas e escalas em um só lugar." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-card border border-border rounded-xl p-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <f.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Bus className="w-4 h-4" />
          <span>OesteGoU © 2026 — Transporte Universitário</span>
        </div>
      </footer>
    </div>
  );
}
