import { useState, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, GraduationCap, Truck, Camera, Upload, X, FileText, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { rnInstitutions } from "@/data/institutions";

type Role = "student" | "driver";

export default function Register() {
  const [params] = useSearchParams();
  const initialRole = (params.get("role") as Role) || "student";
  const [role, setRole] = useState<Role>(initialRole);
  const navigate = useNavigate();
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [docName, setDocName] = useState<string | null>(null);

  const [institutionQuery, setInstitutionQuery] = useState("");
  const [institutionOpen, setInstitutionOpen] = useState(false);

  const [cepLoading, setCepLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    birthDate: "",
    institution: "",
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    password: "",
  });

  const filteredInstitutions = useMemo(() => {
    const q = institutionQuery.trim().toLowerCase();
    if (!q) return rnInstitutions.slice(0, 8);
    return rnInstitutions
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [institutionQuery]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Envie uma imagem (JPG ou PNG).", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "O tamanho máximo é 5MB.", variant: "destructive" });
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoFile(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocName(file.name);
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  };

  const handleCepChange = async (raw: string) => {
    const masked = formatCep(raw);
    setForm((f) => ({ ...f, cep: masked }));
    const digits = masked.replace(/\D/g, "");
    if (digits.length !== 8) {
      setForm((f) => ({ ...f, city: "", state: "" }));
      return;
    }
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast({ title: "CEP não encontrado", description: "Verifique o CEP digitado.", variant: "destructive" });
        setForm((f) => ({ ...f, city: "", state: "" }));
      } else {
        setForm((f) => ({
          ...f,
          city: data.localidade || "",
          state: data.uf || "",
          street: f.street || data.logradouro || "",
          neighborhood: f.neighborhood || data.bairro || "",
        }));
      }
    } catch {
      toast({ title: "Erro ao buscar CEP", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!photoFile) {
      toast({
        title: "Foto obrigatória",
        description: "Você precisa enviar uma foto para concluir o cadastro.",
        variant: "destructive",
      });
      return;
    }

    if (role === "student" && !form.institution) {
      toast({
        title: "Instituição obrigatória",
        description: "Selecione sua instituição da lista.",
        variant: "destructive",
      });
      return;
    }

    if (role === "student" && !docName) {
      toast({
        title: "Declaração obrigatória",
        description: "Envie o comprovante de matrícula.",
        variant: "destructive",
      });
      return;
    }

    if (!form.city || !form.state) {
      toast({
        title: "CEP inválido",
        description: "Informe um CEP válido para preencher cidade e estado.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Cadastro enviado!",
      description:
        role === "student"
          ? "Seu cadastro foi enviado para análise do administrador."
          : "Cadastro de motorista realizado com sucesso.",
    });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-3">
            <Bus className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">OesteGoU</h1>
          <p className="text-muted-foreground text-sm mt-1">Criar nova conta</p>
        </div>

        {/* Role toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-muted rounded-lg">
          {([
            { value: "student", label: "Aluno", icon: GraduationCap },
            { value: "driver", label: "Motorista", icon: Truck },
          ] as const).map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                role === r.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <r.icon className="w-4 h-4" />
              {r.label}
            </button>
          ))}
        </div>

        <motion.form
          key={role}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleSubmit}
          className="space-y-4 bg-card p-6 rounded-xl border border-border"
        >
          {/* Photo upload (mandatory) */}
          <div className="space-y-2">
            <Label>
              Foto <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-border bg-muted/30 flex items-center justify-center shrink-0">
                {photo ? (
                  <>
                    <img src={photo} alt="Pré-visualização" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      aria-label="Remover foto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhoto}
                  className="hidden"
                  id="photo-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {photo ? "Alterar foto" : "Enviar foto"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG ou PNG, até 5MB</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome completo <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {role === "student" && (
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF <span className="text-destructive">*</span></Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de nascimento <span className="text-destructive">*</span></Label>
            <Input
              id="birthDate"
              type="date"
              value={form.birthDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone <span className="text-destructive">*</span></Label>
            <Input
              id="phone"
              placeholder="(00) 00000-0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>

          {role === "student" && (
            <div className="space-y-2 relative">
              <Label htmlFor="institution">
                Instituição <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="institution"
                  className="pl-9"
                  placeholder="Digite para buscar (ex: UFRN, IFRN...)"
                  value={institutionQuery}
                  onFocus={() => setInstitutionOpen(true)}
                  onBlur={() => setTimeout(() => setInstitutionOpen(false), 150)}
                  onChange={(e) => {
                    setInstitutionQuery(e.target.value);
                    setForm({ ...form, institution: "" });
                    setInstitutionOpen(true);
                  }}
                  autoComplete="off"
                  required
                />
              </div>
              {institutionOpen && filteredInstitutions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover shadow-lg">
                  {filteredInstitutions.map((inst) => (
                    <li key={inst}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setForm({ ...form, institution: inst });
                          setInstitutionQuery(inst);
                          setInstitutionOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {inst}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {institutionOpen && institutionQuery && filteredInstitutions.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma instituição encontrada.</p>
              )}
            </div>
          )}

          {/* Endereço */}
          <div className="pt-2 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Endereço</h3>

            <div className="space-y-2">
              <Label htmlFor="cep">CEP <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  maxLength={9}
                  required
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={form.city}
                  readOnly
                  disabled
                  placeholder="Preenchido pelo CEP"
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={form.state}
                  readOnly
                  disabled
                  placeholder="UF"
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2 mt-3">
              <Label htmlFor="street">
                Endereço (Rua) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="street"
                placeholder="Nome da rua"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="space-y-2 col-span-1">
                <Label htmlFor="number">
                  Número <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="number"
                  placeholder="Nº"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="neighborhood">
                  Bairro <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="neighborhood"
                  placeholder="Bairro"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {role === "student" && (
            <div className="space-y-2">
              <Label>
                Declaração de matrícula <span className="text-destructive">*</span>
              </Label>
              <input
                ref={docInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleDoc}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => docInputRef.current?.click()}
                className="w-full justify-start"
              >
                <FileText className="w-4 h-4 mr-2" />
                {docName ? <span className="truncate">{docName}</span> : "Enviar comprovante"}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Senha <span className="text-destructive">*</span></Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full">
            Criar conta
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Já tem conta?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-primary hover:underline font-medium"
            >
              Entrar
            </button>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
