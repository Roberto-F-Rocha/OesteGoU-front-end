import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, MapPin, Bus, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Reservation {
  id: number;
  status: "confirmed" | "canceled" | "absent";
  schedule?: { id: number; time: string; type: "ida" | "volta"; university?: { name: string } | null };
  route?: {
    id: number;
    name: string;
    city?: { name: string; state: string } | null;
    vehicle?: { name?: string | null; plate: string; capacity: number } | null;
    driver?: { nome: string; email: string } | null;
  } | null;
  pickupPoint?: { id: number; name: string; address?: string | null } | null;
}

interface Passenger { nome: string; instituicao?: string | null; ponto?: string | null; }
function tripLabel(type?: string) { return type === "volta" ? "Volta" : "Ida"; }

export default function StudentTrip() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const confirmedReservations = useMemo(() => reservations.filter((item) => item.status === "confirmed"), [reservations]);

  async function loadData() {
    try {
      setLoading(true);
      const [reservationsResponse, passengersResponse] = await Promise.all([api.get("/my-reservations"), api.get("/students/my-trip-passengers")]);
      setReservations(reservationsResponse.data ?? []);
      setPassengers(passengersResponse.data ?? []);
    } catch {
      toast({ title: "Erro ao carregar viagem", description: "Não foi possível buscar suas reservas agora.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const handleCancel = async (reservation: Reservation) => {
    try {
      setActionLoading(reservation.id);
      await api.patch(`/reservations/${reservation.id}/cancel`);
      toast({ title: "Ausência registrada", description: `${tripLabel(reservation.schedule?.type)} cancelada com sucesso.` });
      await loadData();
    } catch {
      toast({ title: "Erro ao cancelar", description: "Não foi possível cancelar esta reserva.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 min-w-0">
      <div className="min-w-0">
        <h1 className="text-2xl font-heading font-bold text-foreground break-words">Olá, {user?.name ?? "Aluno"}! 👋</h1>
        <p className="text-muted-foreground text-sm capitalize">{today}</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl overflow-hidden min-w-0">
        <div className="bg-primary/5 p-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Calendar className="w-5 h-5 text-primary" /></div>
            <div className="min-w-0">
              <h2 className="font-heading font-semibold text-foreground">Minha Viagem</h2>
              <p className="text-sm text-muted-foreground truncate">{confirmedReservations[0]?.schedule?.university?.name ?? "Reservas confirmadas"}</p>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-4">
          {loading ? <div className="p-6 text-center text-sm text-muted-foreground">Carregando viagem...</div> : confirmedReservations.length === 0 ? (
            <div className="p-6 text-center space-y-2"><p className="font-heading font-semibold text-foreground">Nenhuma viagem confirmada</p><p className="text-sm text-muted-foreground">Quando você confirmar presença em um horário, ele aparecerá aqui.</p></div>
          ) : confirmedReservations.map((reservation) => (
            <div key={reservation.id} className="p-3 sm:p-4 bg-muted/30 rounded-xl space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0"><Bus className="w-5 h-5 text-primary shrink-0" /><span className="font-heading font-semibold text-foreground truncate">{tripLabel(reservation.schedule?.type)}</span></div>
                <span className="text-lg font-heading font-bold text-primary shrink-0">{reservation.schedule?.time ?? "--:--"}</span>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground min-w-0">
                <div className="flex items-start gap-2 min-w-0"><MapPin className="w-4 h-4 shrink-0 mt-0.5" /><span className="break-words">{reservation.pickupPoint?.name ?? reservation.route?.name ?? "Ponto não informado"}</span></div>
                {reservation.route?.driver && <p className="break-words">Motorista: {reservation.route.driver.nome}</p>}
                {reservation.route?.vehicle && <p className="break-words">Veículo: {reservation.route.vehicle.name ?? "Ônibus"} - {reservation.route.vehicle.plate}</p>}
              </div>

              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
                <Button size="sm" variant="default" className="w-full" disabled><CheckCircle className="w-4 h-4 mr-1" /> Vou</Button>
                <Button size="sm" variant="outline" onClick={() => handleCancel(reservation)} disabled={actionLoading === reservation.id} className="w-full"><XCircle className="w-4 h-4 mr-1" /> Não vou</Button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-3 sm:p-4 min-w-0">
        <div className="flex items-center gap-2 mb-3 min-w-0"><Users className="w-5 h-5 text-primary shrink-0" /><h2 className="font-heading font-semibold text-foreground truncate">Alunos na minha viagem</h2></div>
        {passengers.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum passageiro confirmado encontrado.</p> : (
          <div className="space-y-2">
            {passengers.map((passenger, index) => (
              <div key={`${passenger.nome}-${index}`} className="flex flex-col min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between gap-2 rounded-lg border border-border p-3 text-sm min-w-0">
                <div className="min-w-0"><p className="font-medium text-foreground truncate">{passenger.nome}</p><p className="text-muted-foreground truncate">{passenger.instituicao ?? "Instituição não informada"}</p></div>
                <span className="text-xs text-muted-foreground min-[420px]:text-right break-words">{passenger.ponto ?? "Ponto não informado"}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
