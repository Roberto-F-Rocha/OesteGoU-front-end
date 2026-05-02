import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  Calendar,
  Clock,
  MapPin,
  Plus,
  School,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

interface PickupPoint {
  id: number;
  name: string;
  address?: string | null;
  type?: "ida" | "volta";
  active?: boolean;
  universityId?: number | null;
}

interface RoutePoint {
  pickupPoint?: PickupPoint | null;
}

interface RouteItem {
  id: number;
  name: string;
  active: boolean;
  schedule?: {
    id: number;
    time: string;
    type: "ida" | "volta";
    university?: { name: string } | null;
  };
  city?: { name: string; state: string } | null;
  driver?: { nome: string } | null;
  vehicle?: { name?: string | null; plate: string; capacity?: number | null } | null;
  points?: RoutePoint[];
  reservations?: { id: number }[];
}

interface Reservation {
  id: number;
  status: "confirmed" | "canceled" | "absent";
  routeId: number;
  scheduleId: number;
  pickupPointId?: number | null;
  dayOfWeek?: string | null;
  schedule?: RouteItem["schedule"];
  route?: Omit<RouteItem, "schedule"> | null;
  pickupPoint?: PickupPoint | null;
}

type ShiftKey = "manha" | "tarde" | "noite";

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const SHIFTS: Array<{ key: ShiftKey; label: string; startHour: number; endHour: number }> = [
  { key: "manha", label: "Manhã", startHour: 0, endHour: 11 },
  { key: "tarde", label: "Tarde", startHour: 12, endHour: 17 },
  { key: "noite", label: "Noite", startHour: 18, endHour: 23 },
];

function tripLabel(type?: string) {
  return type === "volta" ? "Volta" : "Ida";
}

function routePoints(route?: RouteItem | null, type?: "ida" | "volta") {
  return (route?.points ?? [])
    .map((item) => item.pickupPoint)
    .filter((point): point is PickupPoint => Boolean(point && point.active !== false))
    .filter((point) => !type || !point.type || point.type === type);
}

function universityName(route: RouteItem) {
  return route.schedule?.university?.name ?? route.name;
}

function reservationUniversity(reservation: Reservation) {
  return reservation.schedule?.university?.name ?? reservation.route?.name ?? "Universidade não informada";
}

function getHour(time?: string) {
  const hour = Number((time ?? "").split(":")[0]);
  return Number.isFinite(hour) ? hour : -1;
}

function shiftFromTime(time?: string): ShiftKey {
  const hour = getHour(time);
  if (hour >= 18) return "noite";
  if (hour >= 12) return "tarde";
  return "manha";
}

function routeBelongsToShift(route: RouteItem, shift: ShiftKey) {
  return shiftFromTime(route.schedule?.time) === shift;
}

function displayRoutePath(route?: RouteItem | null, fallbackUniversity = "Universidade") {
  if (!route) return "Rota não encontrada";
  const university = route.schedule?.university?.name ?? fallbackUniversity;
  const city = route.city?.name ?? "Cidade";
  return route.schedule?.type === "volta" ? `${university} → ${city}` : `${city} → ${university}`;
}

const emptyForm = {
  university: "",
  dayOfWeek: "Segunda",
  shift: "" as ShiftKey | "",
  goingRouteId: "",
  returnRouteId: "",
  goingPickupPointId: "",
  returnPickupPointId: "",
};

export default function StudentSchedules() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState("Segunda");

  async function loadData(showLoading = false) {
    try {
      if (showLoading) setLoading(true);
      const [routesRes, reservationsRes] = await Promise.all([
        api.get("/routes/available"),
        api.get("/my-reservations"),
      ]);

      const availableRoutes: RouteItem[] = routesRes.data ?? [];
      setRoutes(availableRoutes.filter((route) => route.active));
      setReservations(reservationsRes.data ?? []);
    } catch {
      toast({
        title: "Erro ao carregar horários",
        description: "Não foi possível buscar as rotas disponíveis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(true);
  }, []);

  useLiveRefresh(() => loadData(false), { intervalMs: 10000 });

  const activeReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status === "confirmed"),
    [reservations],
  );

  const weeklyReservations = useMemo(() => {
    const grouped: Record<string, Reservation[]> = Object.fromEntries(DAYS.map((day) => [day, []]));

    activeReservations.forEach((reservation) => {
      const day = reservation.dayOfWeek || "Sem dia";
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(reservation);
    });

    Object.values(grouped).forEach((items) => {
      items.sort((a, b) => (a.schedule?.time ?? "").localeCompare(b.schedule?.time ?? ""));
    });

    return grouped;
  }, [activeReservations]);

  const universities = useMemo(() => {
    return Array.from(new Set(routes.map(universityName))).sort((a, b) => a.localeCompare(b));
  }, [routes]);

  const counts = useMemo(() => ({
    total: routes.length,
    ida: routes.filter((route) => route.schedule?.type === "ida").length,
    volta: routes.filter((route) => route.schedule?.type === "volta").length,
    confirmed: activeReservations.length,
  }), [routes, activeReservations]);

  const universityRoutes = useMemo(() => {
    return routes.filter((route) => universityName(route) === form.university);
  }, [routes, form.university]);

  const availableShifts = useMemo(() => {
    if (!form.university) return [];
    return SHIFTS.filter((shift) =>
      universityRoutes.some((route) => route.schedule?.type === "ida" && routeBelongsToShift(route, shift.key)) &&
      universityRoutes.some((route) => route.schedule?.type === "volta" && routeBelongsToShift(route, shift.key)),
    );
  }, [form.university, universityRoutes]);

  const goingRoutesForShift = useMemo(() => {
    if (!form.shift) return [];
    return universityRoutes.filter(
      (route) => route.schedule?.type === "ida" && routeBelongsToShift(route, form.shift as ShiftKey),
    );
  }, [universityRoutes, form.shift]);

  const returnRoutesForShift = useMemo(() => {
    if (!form.shift) return [];
    return universityRoutes.filter(
      (route) => route.schedule?.type === "volta" && routeBelongsToShift(route, form.shift as ShiftKey),
    );
  }, [universityRoutes, form.shift]);

  const goingRoute = useMemo(() => {
    return goingRoutesForShift.find((route) => String(route.id) === form.goingRouteId) ?? goingRoutesForShift[0] ?? null;
  }, [goingRoutesForShift, form.goingRouteId]);

  const returnRoute = useMemo(() => {
    return returnRoutesForShift.find((route) => String(route.id) === form.returnRouteId) ?? returnRoutesForShift[0] ?? null;
  }, [returnRoutesForShift, form.returnRouteId]);

  const goingPoints = routePoints(goingRoute, "ida");
  const returnPoints = routePoints(returnRoute, "volta");

  const canSave =
    !!goingRoute?.schedule?.id &&
    !!returnRoute?.schedule?.id &&
    (goingPoints.length <= 1 || !!form.goingPickupPointId) &&
    (returnPoints.length <= 1 || !!form.returnPickupPointId);

  function autoPointId(points: PickupPoint[]) {
    return points.length === 1 ? String(points[0].id) : "";
  }

  function openCreate(route?: RouteItem) {
    if (route) {
      const university = universityName(route);
      const shift = shiftFromTime(route.schedule?.time);
      const routesFromUniversity = routes.filter((item) => universityName(item) === university);
      const going = routesFromUniversity.find((item) => item.schedule?.type === "ida" && routeBelongsToShift(item, shift));
      const returning = routesFromUniversity.find((item) => item.schedule?.type === "volta" && routeBelongsToShift(item, shift));
      setForm({
        university,
        dayOfWeek: selectedWeekDay,
        shift,
        goingRouteId: going ? String(going.id) : "",
        returnRouteId: returning ? String(returning.id) : "",
        goingPickupPointId: autoPointId(routePoints(going, "ida")),
        returnPickupPointId: autoPointId(routePoints(returning, "volta")),
      });
    } else {
      setForm({ ...emptyForm, dayOfWeek: selectedWeekDay });
    }
    setCreateOpen(true);
  }

  function handleUniversityChange(value: string) {
    setForm((current) => ({
      ...current,
      university: value,
      shift: "",
      goingRouteId: "",
      returnRouteId: "",
      goingPickupPointId: "",
      returnPickupPointId: "",
    }));
  }

  function handleShiftChange(shift: ShiftKey) {
    const routesFromUniversity = routes.filter((route) => universityName(route) === form.university);
    const going = routesFromUniversity.find((route) => route.schedule?.type === "ida" && routeBelongsToShift(route, shift));
    const returning = routesFromUniversity.find((route) => route.schedule?.type === "volta" && routeBelongsToShift(route, shift));
    setForm((current) => ({
      ...current,
      shift,
      goingRouteId: going ? String(going.id) : "",
      returnRouteId: returning ? String(returning.id) : "",
      goingPickupPointId: autoPointId(routePoints(going, "ida")),
      returnPickupPointId: autoPointId(routePoints(returning, "volta")),
    }));
  }

  function handleGoingRouteChange(routeId: string) {
    const route = routes.find((item) => String(item.id) === routeId);
    setForm((current) => ({
      ...current,
      goingRouteId: routeId,
      goingPickupPointId: autoPointId(routePoints(route, "ida")),
    }));
  }

  function handleReturnRouteChange(routeId: string) {
    const route = routes.find((item) => String(item.id) === routeId);
    setForm((current) => ({
      ...current,
      returnRouteId: routeId,
      returnPickupPointId: autoPointId(routePoints(route, "volta")),
    }));
  }

  async function createReservation(route: RouteItem, pickupPointId: string) {
    await api.post("/reservations", {
      scheduleId: route.schedule?.id,
      routeId: route.id,
      pickupPointId: pickupPointId ? Number(pickupPointId) : undefined,
      dayOfWeek: form.dayOfWeek,
    });
  }

  async function handleSave() {
    if (!goingRoute?.schedule?.id || !returnRoute?.schedule?.id) {
      toast({
        title: "Rotas obrigatórias",
        description: "Selecione uma universidade e um turno que possuam ida e volta cadastradas.",
        variant: "destructive",
      });
      return;
    }

    const goingPickupPointId = form.goingPickupPointId || autoPointId(goingPoints);
    const returnPickupPointId = form.returnPickupPointId || autoPointId(returnPoints);

    if (goingPoints.length > 1 && !goingPickupPointId) {
      toast({ title: "Selecione o ponto de ida", variant: "destructive" });
      return;
    }

    if (returnPoints.length > 1 && !returnPickupPointId) {
      toast({ title: "Selecione o ponto de volta", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      await api.post("/reservations/roundtrip", {
        dayOfWeek: form.dayOfWeek,
        shift: form.shift,
        going: {
          scheduleId: goingRoute.schedule.id,
          routeId: goingRoute.id,
          pickupPointId: goingPickupPointId || undefined,
        },
        returning: {
          scheduleId: returnRoute.schedule.id,
          routeId: returnRoute.id,
          pickupPointId: returnPickupPointId || undefined,
        },
      });

      toast({ title: "Horário salvo", description: `${form.dayOfWeek} adicionado com ida e volta.` });
      setCreateOpen(false);
      setForm(emptyForm);
      await loadData(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error?.response?.data?.error ?? "Não foi possível salvar este horário.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(reservationId: number) {
    try {
      setRemovingId(reservationId);
      await api.patch(`/reservations/${reservationId}/cancel`);
      toast({ title: "Horário removido", description: "O horário foi removido da sua semana." });
      await loadData(false);
    } catch {
      toast({ title: "Erro ao remover", description: "Não foi possível remover este horário.", variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" /> Horários
          </h1>
          <p className="text-muted-foreground text-sm">
            Monte sua semana escolhendo universidade, dia, turno e pontos cadastrados pelo administrador.
          </p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2">
          <Plus className="w-4 h-4" /> Novo horário
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Rotas" value={counts.total} />
        <SummaryCard label="Ida" value={counts.ida} tone="primary" />
        <SummaryCard label="Volta" value={counts.volta} tone="accent" />
        <SummaryCard label="Na semana" value={counts.confirmed} tone="success" />
      </div>

      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Minha semana
            </h2>
            <p className="text-sm text-muted-foreground">Seus horários salvos por dia.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedWeekDay(day)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                selectedWeekDay === day
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40",
              )}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {activeReservations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-heading font-semibold text-foreground">Nenhum horário na semana</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em “Novo horário” para montar sua rotina.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-background/40 p-3 space-y-2 min-h-[120px]">
              <div className="flex items-center justify-between">
                <p className="font-heading font-semibold text-foreground">{selectedWeekDay}</p>
                <Badge variant="secondary">{weeklyReservations[selectedWeekDay]?.length ?? 0}</Badge>
              </div>
              {(weeklyReservations[selectedWeekDay]?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground pt-2">Nenhum horário cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {weeklyReservations[selectedWeekDay].map((reservation) => (
                    <motion.div
                      key={reservation.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-border bg-card p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{reservationUniversity(reservation)}</p>
                          <p className="text-xs text-muted-foreground truncate">{reservation.route?.name ?? "Rota não informada"}</p>
                        </div>
                        <Badge variant="outline" className={cn("shrink-0", reservation.schedule?.type === "volta" ? "text-accent" : "text-primary")}>
                          {tripLabel(reservation.schedule?.type)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {reservation.schedule?.time ?? "--:--"}</p>
                        <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {reservation.pickupPoint?.name ?? "Ponto definido pela administração"}</p>
                        <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {reservation.route?.driver?.nome ?? "Motorista a definir"}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-center text-destructive hover:text-destructive"
                        onClick={() => handleRemove(reservation.id)}
                        disabled={removingId === reservation.id}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> {removingId === reservation.id ? "Removendo..." : "Remover"}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Novo horário
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha universidade, dia, turno e ponto para montar sua semana.
                </p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><School className="w-4 h-4 text-primary" /> Universidade</Label>
                <select value={form.university} onChange={(event) => handleUniversityChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Selecione uma universidade...</option>
                  {universities.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Dia da semana</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {DAYS.map((day) => (
                    <button key={day} type="button" onClick={() => setForm((current) => ({ ...current, dayOfWeek: day }))} className={cn("px-2 py-2 text-xs font-medium rounded-md border transition-colors", form.dayOfWeek === day ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40")}>{day.slice(0, 3)}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Turno</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SHIFTS.map((shift) => {
                    const enabled = availableShifts.some((item) => item.key === shift.key);
                    const selected = form.shift === shift.key;
                    return (
                      <button
                        key={shift.key}
                        type="button"
                        disabled={!enabled}
                        onClick={() => enabled && handleShiftChange(shift.key)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-all",
                          selected ? "bg-primary/10 border-primary ring-2 ring-primary/20" : "bg-background border-border hover:border-primary/40",
                          !enabled && "opacity-50 cursor-not-allowed hover:border-border",
                        )}
                      >
                        <p className={cn("font-heading font-semibold text-sm", selected ? "text-primary" : "text-foreground")}>{shift.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{enabled ? "Ida e volta disponíveis" : "Sem rota completa"}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {!form.university ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
                  Selecione uma universidade para carregar os turnos disponíveis.
                </div>
              ) : !form.shift ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
                  Selecione um turno para visualizar ida, volta e pontos.
                </div>
              ) : !goingRoute || !returnRoute ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
                  É necessário existir uma rota de ida e uma rota de volta para essa universidade e turno.
                </div>
              ) : (
                <div className="space-y-3">
                  {(goingRoutesForShift.length > 1 || returnRoutesForShift.length > 1) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {goingRoutesForShift.length > 1 && (
                        <div className="space-y-2">
                          <Label>Rota de ida</Label>
                          <select value={String(goingRoute.id)} onChange={(event) => handleGoingRouteChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            {goingRoutesForShift.map((route) => <option key={route.id} value={route.id}>{route.name} · {route.schedule?.time ?? "--:--"}</option>)}
                          </select>
                        </div>
                      )}
                      {returnRoutesForShift.length > 1 && (
                        <div className="space-y-2">
                          <Label>Rota de volta</Label>
                          <select value={String(returnRoute.id)} onChange={(event) => handleReturnRouteChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            {returnRoutesForShift.map((route) => <option key={route.id} value={route.id}>{route.name} · {route.schedule?.time ?? "--:--"}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RouteInfoCard title="Ida" route={goingRoute} university={form.university} />
                    <RouteInfoCard title="Volta" route={returnRoute} university={form.university} />
                  </div>

                  <div className="space-y-2">
                    <Label>Ponto de ida</Label>
                    {goingPoints.length > 1 ? (
                      <select value={form.goingPickupPointId} onChange={(event) => setForm((current) => ({ ...current, goingPickupPointId: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">Selecione o ponto de ida...</option>
                        {goingPoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
                      </select>
                    ) : (
                      <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" /> {goingPoints[0]?.name ?? "Ponto definido pela administração"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Ponto de volta</Label>
                    {returnPoints.length > 1 ? (
                      <select value={form.returnPickupPointId} onChange={(event) => setForm((current) => ({ ...current, returnPickupPointId: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">Selecione o ponto de volta...</option>
                        {returnPoints.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
                      </select>
                    ) : (
                      <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-accent" /> {returnPoints[0]?.name ?? "Ponto definido pela administração"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!canSave || saving}>{saving ? "Salvando..." : "Salvar horário"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RouteInfoCard({ title, route, university }: { title: "Ida" | "Volta"; route: RouteItem; university: string }) {
  const isReturn = route.schedule?.type === "volta";
  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-background/40">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
        <ArrowLeftRight className={cn("w-3 h-3", isReturn ? "text-accent rotate-180" : "text-primary")} /> {title}
      </div>
      <p className="font-heading font-bold text-foreground text-lg">{route.schedule?.time ?? "--:--"}</p>
      <p className="text-xs text-muted-foreground">{displayRoutePath(route, university)}</p>
      <div className="pt-2 border-t border-border text-xs text-muted-foreground space-y-1">
        <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {route.driver?.nome ?? "Motorista a definir"}</p>
        {route.vehicle && <p>{route.vehicle.name ?? "Ônibus"} · {route.vehicle.plate}</p>}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "primary" | "accent" | "success";
}) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary",
    accent: "text-accent",
    success: "text-emerald-600 dark:text-emerald-400",
  }[tone];

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-heading font-bold", toneClass)}>{value}</p>
    </div>
  );
}
