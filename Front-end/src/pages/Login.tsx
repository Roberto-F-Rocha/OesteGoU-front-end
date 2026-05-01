import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bus,
  Eye,
  EyeOff,
  GraduationCap,
  MapPinned,
  Route,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/contexts/AuthContext";

const highlights = [
  {
    icon: Route,
    title: "Rotas organizadas",
    description: "Acompanhe linhas, horários e embarques em um só lugar.",
  },
  {
    icon: GraduationCap,
    title: "Foco universitário",
    description: "Uma experiência pensada para alunos, motoristas e gestores.",
  },
  {
    icon: ShieldCheck,
    title: "Gestão segura",
    description: "Acesso protegido para manter as operações sob controle.",
  },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) return;

    try {
      await login(email, password);

      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo ao OesteGoU!",
      });

      const role = user?.role;

      navigate(
        role === "admin"
          ? "/admin"
          : role === "driver"
          ? "/motorista"
          : "/aluno"
      );
    } catch (err: any) {
      toast({
        title: "Erro ao entrar",
        description: err?.response?.data?.error || "Falha no login",
        variant: "destructive",
      });
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)]">
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-primary/10 to-transparent" />
      <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-secondary/25 blur-3xl" />
      <div className="absolute -left-24 bottom-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

      <section className="relative z-10 grid min-h-screen grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-16 xl:px-24">
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-2xl"
        >
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/15 bg-white/70 px-4 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur">
            <MapPinned className="h-4 w-4" />
            Mobilidade universitária para o Alto Oeste
          </div>

          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-xl shadow-primary/25">
              <Bus className="h-9 w-9 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">
                App de transporte
              </p>
              <h1 className="text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl">
                OesteGoU
              </h1>
            </div>
          </div>

          <h2 className="mb-4 max-w-xl text-3xl font-heading font-bold leading-tight text-foreground sm:text-5xl">
            Gestão moderna para o transporte universitário.
          </h2>

          <p className="mb-8 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Controle rotas, horários, alunos e motoristas com uma plataforma
            visual, segura e preparada para o dia a dia do transporte estudantil.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto w-full max-w-md"
        >
          <form
            onSubmit={handleLogin}
            className="rounded-3xl border border-border/80 bg-card/95 p-6 shadow-2xl shadow-primary/10 backdrop-blur sm:p-8"
          >
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bus className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-foreground">
                Acesse sua conta
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Entre no painel do OesteGoU para continuar.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-11"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="h-12 w-full text-base font-semibold">
                Entrar no OesteGoU
              </Button>
            </div>

            <div className="mt-6 rounded-2xl bg-muted/70 p-4 text-center text-xs leading-5 text-muted-foreground">
              Sistema exclusivo para alunos, motoristas e administradores
              cadastrados na operação de transporte universitário.
            </div>
          </form>
        </motion.div>
      </section>
    </main>
  );
}
