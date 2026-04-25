// Turnos padrão da cidade — horários pré-estabelecidos pelo administrador.
// O aluno apenas escolhe o turno; ida/volta são preenchidos automaticamente.

export type ShiftKey = "manha" | "tarde" | "noite";

export interface ShiftDefaults {
  key: ShiftKey;
  label: string;
  description: string;
  departureTime: string;
  returnTime: string;
}

export const defaultShifts: ShiftDefaults[] = [
  {
    key: "manha",
    label: "Manhã",
    description: "Saída 05:40 · Volta 11:50",
    departureTime: "05:40",
    returnTime: "11:50",
  },
  {
    key: "tarde",
    label: "Tarde",
    description: "Saída 11:40 · Volta 17:50",
    departureTime: "11:40",
    returnTime: "17:50",
  },
  {
    key: "noite",
    label: "Noite",
    description: "Saída 17:40 · Volta 21:50",
    departureTime: "17:40",
    returnTime: "21:50",
  },
];

export function getShiftByTimes(departureTime: string, returnTime: string): ShiftKey | null {
  const found = defaultShifts.find(
    (s) => s.departureTime === departureTime && s.returnTime === returnTime,
  );
  return found?.key ?? null;
}

export function getShift(key: ShiftKey): ShiftDefaults {
  return defaultShifts.find((s) => s.key === key) ?? defaultShifts[0];
}
