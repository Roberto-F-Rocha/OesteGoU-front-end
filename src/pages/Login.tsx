import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, GraduationCap, Shield, Truck, Eye, EyeOff } from "lucide-react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const roles: { value: UserRole; label: string; icon: typeof Bus; desc: string }[] = [
  { value: "student", label: "Aluno", icon: GraduationCap, desc: "Confirme presença e veja horários" },
  { value: "driver", label: "Motorista", icon: Truck, desc: "Acesse escalas e rotas" },
  { value: "admin", label: "Administrador", icon: Shield, desc: "Gerencie todo o sistema" },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    const success = login(email, password, selectedRole);
    if (success) {
      navigate(selectedRole === "admin" ? "/admin" : selectedRole === "driver" ? "/motorista" : "/aluno");
    } else {
      toast({ title: "Erro ao entrar", description: "Email ou senha incorretos.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Bus className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">OesteGoU</h1>
          <p className="text-muted-foreground mt-1">Transporte Universitário Inteligente</p>
        </div>

        {!selectedRole ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-center text-sm text-muted-foreground mb-4">Selecione seu tipo de acesso</p>
            {roles.map((role, i) => (
              <motion.button
                key={role.value}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedRole(role.value)}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <role.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-heading font-semibold text-foreground">{role.label}</p>
                  <p className="text-sm text-muted-foreground">{role.desc}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleLogin}
            className="space-y-4 bg-card p-6 rounded-xl border border-border"
          >
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar
            </button>
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              {(() => {
                const role = roles.find(r => r.value === selectedRole)!;
                return (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <role.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-foreground">{role.label}</p>
                      <p className="text-xs text-muted-foreground">{role.desc}</p>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full">Entrar</Button>
            <p className="text-xs text-center text-muted-foreground">
              Não tem conta?{" "}
              <button
                type="button"
                onClick={() => navigate(`/cadastro?role=${selectedRole}`)}
                className="text-primary hover:underline font-medium"
              >
                Cadastre-se
              </button>
            </p>
            <p className="text-xs text-center text-muted-foreground">
              Demo: {selectedRole === "admin" ? "admin@altobus.com / admin123" : selectedRole === "student" ? "aluno@altobus.com / aluno123" : "motorista@altobus.com / motorista123"}
            </p>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
