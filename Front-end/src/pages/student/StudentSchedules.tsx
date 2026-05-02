import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  Calendar,
  Clock,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  School,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  addSchedule,
  getDriversByCity,
  getSchedulesByCity,
  removeSchedule,
  updateSchedule,
} from "@/data/registrationsStore";
import { searchInstitutions } from "@/data/institutionDefaults";
import {
  getDefaultPickupPoint,
  listPickupPoints,
  type PickupPoint,
} from "@/data/pickupPointsStore";
import { defaultShifts, getShift, getShiftByTimes, type ShiftKey } from "@/data/shifts";
import { cn } from "@/lib/utils";

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DEFAULT_DEPARTURE_LOCATION = "Ponto definido pela administração";
const DEFAULT_RETURN_LOCATION = "Ponto definido pela administração";

const emptyForm = {
  id: "",
  title: "",
  dayOfWeek: "Segunda",
  shift: "manha" as ShiftKey,
  departureLocation: "",
  returnLocation: "",
};

export default function StudentSchedules() {
  const { user } = useAuth();
  const { toast } = useToast();
  const city = user?.city?.name ?? "Riacho da Cruz";
  const state = user?.city?.state ?? "RN";

  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterDay, setFilterDay] = useState<string>("Todos");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [institutionQuery, setInstitutionQuery] = useState("");
  const [showInstitutionList, setShowInstitutionList] = useState(false);
  const institutionWrapperRef = useRef<HTMLDivElement | null>(null);

  const schedules = useMemo(() => getSchedulesByCity(city), [city, version]);
  const drivers = useMemo(() => getDriversByCity(city), [city, version]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchSearch = search.trim()
        ? s.title.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchDay = filterDay === "Todos" ? true : s.dayOfWeek === filterDay;
      return matchSearch && matchDay;
    });
  }, [schedules, search, filterDay]);

  const institutionSuggestions = useMemo(
    () => searchInstitutions(institutionQuery, 8),
    [institutionQuery],
  );

  const departurePoints = useMemo<PickupPoint[]>(
    () => (form.title ? listPickupPoints(city, form.title, "departure") : []),
    [city, form.title, version],
  );
  const returnPoints = useMemo<PickupPoint[]>(
    () => (form.title ? listPickupPoints(city, form.title, "return") : []),
    [city, form.title, version],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        institutionWrapperRef.current &&
        !institutionWrapperRef.current.contains(e.target as Node)
      ) {
        setShowInstitutionList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setInstitutionQuery("");
  };

  const applyInstitution = (name: string) => {
    const departureList = listPickupPoints(city, name, "departure");
    const returnList = listPickupPoints(city, name, "return");
    const dep =
      departureList.length === 1
        ? departureList[0].label
        : getDefaultPickupPoint(city, name, "departure")?.label ?? DEFAULT_DEPARTURE_LOCATION;
    const ret =
      returnList.length === 1
        ? returnList[0].label
        : getDefaultPickupPoint(city, name, "return")?.label ?? DEFAULT_RETURN_LOCATION;

    setForm((s) => ({
      ...s,
      title: name,
      departureLocation: departureList.length > 1 ? "" : dep,
      returnLocation: returnList.length > 1 ? "" : ret,
    }));
    setInstitutionQuery(name);
    setShowInstitutionList(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({
        title: "Selecione uma universidade",
        description: "Digite e escolha uma universidade da lista.",
        variant: "destructive",
      });
      return;
    }

    const shift = getShift(form.shift);
    const departureLocation =
      departurePoints.length === 1
        ? departurePoints[0].label
        : form.departureLocation || DEFAULT_DEPARTURE_LOCATION;
    const returnLocation =
      returnPoints.length === 1
        ? returnPoints[0].label
        : form.returnLocation || DEFAULT_RETURN_LOCATION;

    const payload = {
      title: form.title,
      dayOfWeek: form.dayOfWeek,
      departureTime: shift.departureTime,
      departureLocation,
      returnTime: shift.returnTime,
      returnLocation,
    };

    if (form.id) {
      updateSchedule(form.id, payload);
      toast({ title: "Horário atualizado com sucesso" });
    } else {
      addSchedule({
        city,
        state,
        ...payload,
        driverId: null,
      });
      toast({
        title: "Horário criado",
        description: "O motorista será definido pelo administrador.",
      });
    }

    setOpen(false);
    resetForm();
    setVersion((v) => v + 1);
  };

  const handleEdit = (id: string) => {
    const s = schedules.find((item) => item.id === id);
    if (!s) return;
    setForm({
      id: s.id,
      title: s.title,
      dayOfWeek: s.dayOfWeek,
      shift: getShiftByTimes(s.departureTime, s.returnTime) ?? "manha",
      departureLocation: s.departureLocation,
      returnLocation: s.returnLocation,
    });
    setInstitutionQuery(s.title);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    removeSchedule(id);
    toast({ title: "Horário removido" });
    setVersion((v) => v + 1);
    setConfirmDeleteId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" /> Horários
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as rotas universitárias de {city}. O motorista é definido pelo administrador.
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="gap-2">
          <Plus className="w-4 h-4" /> Novo horário
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por universidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Todos", ...days].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setFilterDay(d)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                filterDay === d
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {filteredSchedules.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-foreground mb-1">
            {schedules.length === 0 ? "Nenhum horário cadastrado" : "Nenhum resultado"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {schedules.length === 0
              ? 'Crie o primeiro horário clicando em "Novo horário".'
              : "Tente ajustar a busca ou o filtro de dia."}
          </p>
          {schedules.length === 0 && (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Criar primeiro horário
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredSchedules.map((s, i) => {
              const driver = drivers.find((d) => d.id === s.driverId);
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        Universidade
                      </div>
                      <h3
                        className="font-heading font-semibold text-foreground leading-tight line-clamp-2"
                        title={s.title}
                      >
                        {s.title}
                      </h3>
                      <Badge variant="secondary" className="mt-2">
                        <Calendar className="w-3 h-3 mr-1" />
                        {s.dayOfWeek}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(s.id)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(s.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1 bg-background/60 rounded-lg p-2.5 border border-border">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                        <ArrowLeftRight className="w-3 h-3 text-primary" /> Ida
                      </div>
                      <p className="font-heading font-bold text-foreground text-base">{s.departureTime}</p>
                      <div className="flex items-start gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{s.departureLocation}</span>
                      </div>
                    </div>
                    <div className="space-y-1 bg-background/60 rounded-lg p-2.5 border border-border">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                        <ArrowLeftRight className="w-3 h-3 text-accent rotate-180" /> Volta
                      </div>
                      <p className="font-heading font-bold text-foreground text-base">{s.returnTime}</p>
                      <div className="flex items-start gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{s.returnLocation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs border-t border-border pt-2.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Motorista:</span>
                    {driver ? (
                      <span className="text-foreground font-medium">{driver.name}</span>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0 h-5">
                        Aguardando alocação
                      </Badge>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {form.id ? "Editar horário" : "Novo horário"}
            </DialogTitle>
            <DialogDescription>
              Cadastre a rota universitária. O motorista será definido pelo administrador quando você escolher o turno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2" ref={institutionWrapperRef}>
              <Label className="flex items-center gap-1.5">
                <School className="w-4 h-4 text-primary" />
                Universidade
              </Label>
              <div className="relative">
                <Input
                  placeholder="Digite o nome da universidade..."
                  value={institutionQuery}
                  onChange={(e) => {
                    setInstitutionQuery(e.target.value);
                    setForm((s) => ({ ...s, title: e.target.value }));
                    setShowInstitutionList(true);
                  }}
                  onFocus={() => setShowInstitutionList(true)}
                  autoComplete="off"
                  required
                />
                {institutionQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setInstitutionQuery("");
                      setForm((s) => ({ ...s, title: "" }));
                      setShowInstitutionList(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showInstitutionList && institutionSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
                    {institutionSuggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => applyInstitution(name)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                      >
                        <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="line-clamp-1">{name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione uma universidade da lista para preencher os locais automaticamente.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {days.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, dayOfWeek: day }))}
                    className={cn(
                      "px-2 py-2 text-xs font-medium rounded-md border transition-colors",
                      form.dayOfWeek === day
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40",
                    )}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Turno</Label>
              <div className="grid grid-cols-3 gap-2">
                {defaultShifts.map((shift) => {
                  const selected = form.shift === shift.key;
                  return (
                    <button
                      key={shift.key}
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, shift: shift.key }))}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-all",
                        selected
                          ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                          : "bg-background border-border hover:border-primary/40",
                      )}
                    >
                      <p className={cn("font-heading font-semibold text-sm", selected ? "text-primary" : "text-foreground")}>{shift.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{shift.description}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Os horários de ida e volta são pré-definidos pelo administrador.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3 space-y-2 bg-background/40">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
                  <ArrowLeftRight className="w-3 h-3 text-primary" /> Ida
                </div>
                <p className="font-heading font-bold text-foreground text-lg">{getShift(form.shift).departureTime}</p>
                {form.title ? (
                  departurePoints.length > 1 ? (
                    <select value={form.departureLocation} onChange={(e) => setForm((s) => ({ ...s, departureLocation: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Ponto definido pela administração</option>
                      {departurePoints.map((p) => <option key={p.id} value={p.label}>{p.label}{p.isDefault ? " (padrão)" : ""}</option>)}
                    </select>
                  ) : (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" /><span className="line-clamp-2">{form.departureLocation || DEFAULT_DEPARTURE_LOCATION}</span></div>
                  )
                ) : <p className="text-xs text-muted-foreground italic">Selecione uma universidade para ver os pontos.</p>}
              </div>
              <div className="rounded-lg border border-border p-3 space-y-2 bg-background/40">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
                  <ArrowLeftRight className="w-3 h-3 text-accent rotate-180" /> Volta
                </div>
                <p className="font-heading font-bold text-foreground text-lg">{getShift(form.shift).returnTime}</p>
                {form.title ? (
                  returnPoints.length > 1 ? (
                    <select value={form.returnLocation} onChange={(e) => setForm((s) => ({ ...s, returnLocation: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Ponto definido pela administração</option>
                      {returnPoints.map((p) => <option key={p.id} value={p.label}>{p.label}{p.isDefault ? " (padrão)" : ""}</option>)}
                    </select>
                  ) : (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" /><span className="line-clamp-2">{form.returnLocation || DEFAULT_RETURN_LOCATION}</span></div>
                  )
                ) : <p className="text-xs text-muted-foreground italic">Selecione uma universidade para ver os pontos.</p>}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">{form.id ? "Salvar alterações" : "Criar horário"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este horário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O horário será removido para todos os alunos da cidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
