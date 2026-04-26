import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/contexts/AuthContext";

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
        description: "Bem-vindo ao sistema!",
      });

      // 🔥 user já vem atualizado do context
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Bus className="w-8 h-8 text-primary-foreground" />
          </div>

          <h1 className="text-3xl font-heading font-bold text-foreground">
            OesteGoU
          </h1>

          <p className="text-muted-foreground mt-1">
            Transporte Universitário Inteligente
          </p>
        </div>

        {/* FORM */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleLogin}
          className="space-y-4 bg-card p-6 rounded-xl border border-border"
        >
          {/* EMAIL */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* SENHA */}
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* BOTÃO */}
          <Button type="submit" className="w-full">
            Entrar
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Use suas credenciais fornecidas pelo sistema.
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}