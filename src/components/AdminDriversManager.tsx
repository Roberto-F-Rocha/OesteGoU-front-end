import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  Plus,
  Trash2,
  Camera,
  Upload,
  X,
  FileText,
  Copy,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  addDriverByAdmin,
  generateTempPassword,
  getDriversByCity,
  removeUser,
  StoredUser,
} from "@/data/registrationsStore";

interface Props {
  /** City of the logged-in admin (controls scoping). */
  adminCity: string;
  adminState: string;
}

export default function AdminDriversManager({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cnhInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [cnhName, setCnhName] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
  });

  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);

  const drivers = useMemo(
    () => getDriversByCity(adminCity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adminCity, version],
  );

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", birthDate: "" });
    setPhoto(null);
    setCnhName(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (cnhInputRef.current) cnhInputRef.current.value = "";
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Envie uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máx 5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCnh = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máx 5MB.", variant: "destructive" });
      return;
    }
    setCnhName(file.name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      toast({ title: "Foto obrigatória", variant: "destructive" });
      return;
    }
    if (!cnhName) {
      toast({ title: "CNH obrigatória", description: "Envie a CNH digital.", variant: "destructive" });
      return;
    }
    const tempPassword = generateTempPassword(10);
    addDriverByAdmin({
      name: form.name,
      email: form.email,
      phone: form.phone,
      birthDate: form.birthDate,
      cnhName,
      photo,
      city: adminCity,
      state: adminState,
      tempPassword,
    });
    setCredentials({ email: form.email, password: tempPassword, name: form.name });
    setVersion((v) => v + 1);
    resetForm();
    setOpen(false);
  };

  const handleRemove = (driver: StoredUser) => {
    if (!confirm(`Remover o motorista ${driver.name}?`)) return;
    removeUser(driver.id);
    setVersion((v) => v + 1);
    toast({ title: "Motorista removido" });
  };

  const copyCreds = () => {
    if (!credentials) return;
    const text = `OesteGoU - Acesso de motorista\nNome: ${credentials.name}\nEmail: ${credentials.email}\nSenha temporária: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Credenciais copiadas" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Motoristas de {adminCity || "sua cidade"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Cadastre, visualize e remova motoristas. As credenciais são geradas pelo sistema.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Novo motorista
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {drivers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum motorista cadastrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-heading font-semibold text-foreground">Motorista</th>
                  <th className="text-left p-3 font-heading font-semibold text-foreground hidden sm:table-cell">Contato</th>
                  <th className="text-left p-3 font-heading font-semibold text-foreground hidden md:table-cell">CNH</th>
                  <th className="text-left p-3 font-heading font-semibold text-foreground">Status</th>
                  <th className="text-right p-3 font-heading font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {drivers.map((d) => (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {d.photo ? (
                            <img src={d.photo} alt={d.name} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                              <Truck className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{d.name}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{d.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">
                        <p>{d.email}</p>
                        <p className="text-xs">{d.phone}</p>
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                        {d.cnhName || "—"}
                      </td>
                      <td className="p-3">
                        <Badge variant={d.status === "active" ? "default" : "secondary"}>
                          {d.status === "active" ? "Ativo" : "Pendente"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemove(d)}
                          aria-label={`Remover ${d.name}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cadastro de novo motorista */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar motorista</DialogTitle>
            <DialogDescription>
              O motorista será vinculado a {adminCity}/{adminState}. Uma senha temporária será gerada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Foto <span className="text-destructive">*</span></Label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-border bg-muted/30 flex items-center justify-center shrink-0">
                  {photo ? (
                    <>
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhoto(null)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    {photo ? "Alterar foto" : "Enviar foto"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="d-name">Nome completo <span className="text-destructive">*</span></Label>
              <Input id="d-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="d-email">Email <span className="text-destructive">*</span></Label>
              <Input id="d-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="d-phone">Telefone <span className="text-destructive">*</span></Label>
              <Input id="d-phone" placeholder="(00) 00000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="d-birth">Data de nascimento <span className="text-destructive">*</span></Label>
              <Input
                id="d-birth"
                type="date"
                value={form.birthDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>CNH digital <span className="text-destructive">*</span></Label>
              <input ref={cnhInputRef} type="file" accept="image/*,application/pdf" onChange={handleCnh} className="hidden" />
              <Button type="button" variant="outline" onClick={() => cnhInputRef.current?.click()} className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                {cnhName ? <span className="truncate">{cnhName}</span> : "Enviar CNH digital"}
              </Button>
              <p className="text-xs text-muted-foreground">Imagem ou PDF, até 5MB</p>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Cadastrar e gerar acesso</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credenciais geradas */}
      <Dialog open={!!credentials} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Motorista cadastrado
            </DialogTitle>
            <DialogDescription>
              Compartilhe as credenciais abaixo com {credentials?.name}. Ele poderá fazer login imediatamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 bg-muted/40 rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-foreground">{credentials?.email}</span>
            </div>
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-1">Senha temporária</p>
              <p className="font-mono text-lg text-foreground tracking-wider">{credentials?.password}</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={copyCreds}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={() => setCredentials(null)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
