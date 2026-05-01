// Turnos por cidade — sempre 3 fixos: manhã, tarde, noite.
// O admin só edita os horários de saída/volta. Esses horários valem
// para QUALQUER universidade ou ponto da cidade.
//
// Schema PostgreSQL futuro:
//   shifts (
//     id uuid pk,
//     city text,
//     state text,
//     key text check (key in ('manha','tarde','noite')),
//     label text,
//     departure_time text, -- HH:mm
//     return_time text,    -- HH:mm
//     created_at timestamptz,
//     unique (city, key)
//   )

import { defaultShifts, type ShiftKey } from "@/data/shifts";

export interface Shift {
  id: string;
  city: string;
  state: string;
  key: ShiftKey;
  label: string;
  departureTime: string;
  returnTime: string;
  createdAt: string;
}

const shifts: Shift[] = [];
const seededCities = new Set<string>();

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

function ensureSeed(city: string, state: string) {
  const key = norm(city);
  if (seededCities.has(key)) return;
  seededCities.add(key);
  const now = new Date().toISOString();
  for (const def of defaultShifts) {
    const exists = shifts.some(
      (s) => norm(s.city) === key && s.key === def.key,
    );
    if (exists) continue;
    shifts.push({
      id: crypto.randomUUID(),
      city,
      state,
      key: def.key,
      label: def.label,
      departureTime: def.departureTime,
      returnTime: def.returnTime,
      createdAt: now,
    });
  }
}

const ORDER: ShiftKey[] = ["manha", "tarde", "noite"];

export function listShiftsByCity(city: string, state = "RN"): Shift[] {
  ensureSeed(city, state);
  return shifts
    .filter((s) => norm(s.city) === norm(city))
    .sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
}

export function getShiftById(id: string): Shift | undefined {
  return shifts.find((s) => s.id === id);
}

export function getCityShiftByKey(
  city: string,
  state: string,
  key: ShiftKey,
): Shift | undefined {
  ensureSeed(city, state);
  return shifts.find((s) => norm(s.city) === norm(city) && s.key === key);
}

export function getCityShiftByTimes(
  city: string,
  state: string,
  departureTime: string,
  returnTime: string,
): Shift | undefined {
  ensureSeed(city, state);
  return shifts.find(
    (s) =>
      norm(s.city) === norm(city) &&
      s.departureTime === departureTime &&
      s.returnTime === returnTime,
  );
}

export function updateShiftTimes(
  id: string,
  data: { departureTime?: string; returnTime?: string },
): Shift | undefined {
  const s = shifts.find((x) => x.id === id);
  if (!s) return undefined;
  if (data.departureTime) s.departureTime = data.departureTime;
  if (data.returnTime) s.returnTime = data.returnTime;
  return s;
}
