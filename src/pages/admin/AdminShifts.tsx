import { useMemo, useState } from "react";
import { Clock, Moon, Save, Sun, Sunset } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { listShiftsByCity, updateShiftTimes } from "@/data/shiftsStore";
import type { ShiftKey } from "@/data/shifts";

interface Props {
  adminCity: string;
  adminState: string;
}

const ICONS: Record<ShiftKey, typeof Sun> = {
  manha: Sun,
  tarde: Sunset,
  noite: Moon,
};

const HELP: Record<ShiftKey, string> = {
  manha: "Aulas matutinas — saída cedo, retorno antes do almoço.",
  tarde: "Aulas vespertinas — saída no início da tarde, retorno no fim da tarde.",
  noite: "Aulas noturnas — saída no fim da tarde, retorno à noite.",
};

export default function AdminShifts({ adminCity, adminState }: Props) {
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const list = useMemo(
    () => listShiftsByCity(adminCity, adminState),
    [adminCity, adminState, version],
  );

  // Estado local controlado por turno
  const [draft, setDraft] = useState<Record<string, { dep: string; ret: string }>>(
    () =>
      Object.fromEntries(
        list.map((s) => [s.id, { dep: s.departureTime, ret: s.returnTime }]),
      ),
  );

  // Re-sincroniza se a lista mudar (ex.: troca de cidade)
  useMemo(() => {
    setDraft(
      Object.fromEntries(
        list.map((s) => [s.id, { dep: s.departureTime, ret: s.returnTime }]),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.map((s) => s.id).join("|")]);

  const save = (id: string) => {
    const d = draft[id];
    if (!d?.dep || !d?.ret) {
      toast({ title: "Preencha os dois horários", variant: "destructive" });
      return;
    }
    updateShiftTimes(id, { departureTime: d.dep, returnTime: d.ret });
    toast({ title: "Turno atualizado" });
    setVersion((v) => v + 1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Turnos"
        description="Defina o horário de saída e de volta de cada turno. Esses horários valem para todas as universidades e pontos da cidade."
        icon={Clock}
      />

      <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        <span className="font-heading font-semibold text-primary">Como funciona:</span>{" "}
        existem sempre 3 turnos (Manhã, Tarde, Noite). O horário do turno é único — independe
        da universidade ou do ponto de embarque. Os pontos de saída/volta são cadastrados
        separadamente em cada horário.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {list.map((s) => {
          const Icon = ICONS[s.key];
          const d = draft[s.id] ?? { dep: s.departureTime, ret: s.returnTime };
          const dirty = d.dep !== s.departureTime || d.ret !== s.returnTime;
          return (
            <div key={s.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 text-primary p-2.5">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-lg text-foreground">
                    {s.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{HELP[s.key]}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Saída</Label>
                  <Input
                    type="time"
                    value={d.dep}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [s.id]: { ...d, dep: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Volta</Label>
                  <Input
                    type="time"
                    value={d.ret}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [s.id]: { ...d, ret: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <Button
                size="sm"
                className="w-full"
                disabled={!dirty}
                onClick={() => save(s.id)}
              >
                <Save className="w-4 h-4 mr-1.5" />
                {dirty ? "Salvar alterações" : "Salvo"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
