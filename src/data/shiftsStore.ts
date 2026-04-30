// Turnos por cidade — definidos pelo administrador.
// Schema PostgreSQL futuro:
//   shifts (
//     id uuid pk,
//     city text,
//     state text,
//     key text,           -- ex: 'manha' | 'tarde' | 'noite' | custom
//     label text,
//     departure_time text, -- HH:mm
//     return_time text,    -- HH:mm
//     created_at timestamptz,
//     unique (city, key)
//   )

import { defaultShifts } from "@/data/shifts";

export interface Shift {
  id: string;
  city: string;
  state: string;
  key: string;
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
  const has = shifts.some((s) => norm(s.city) === key);
  if (has) return;
  const now = new Date().toISOString();
  for (const def of defaultShifts) {
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

export function listShiftsByCity(city: string, state = "RN"): Shift[] {
  ensureSeed(city, state);
  return shifts
    .filter((s) => norm(s.city) === norm(city))
    .sort((a, b) => a.departureTime.localeCompare(b.departureTime));
}

export function getShiftById(id: string): Shift | undefined {
  return shifts.find((s) => s.id === id);
}

export function addShift(input: Omit<Shift, "id" | "createdAt">): Shift {
  ensureSeed(input.city, input.state);
  const s: Shift = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  shifts.push(s);
  return s;
}

export function updateShift(id: string, data: Partial<Omit<Shift, "id" | "createdAt">>): Shift | undefined {
  const s = shifts.find((x) => x.id === id);
  if (!s) return undefined;
  Object.assign(s, data);
  return s;
}

export function removeShift(id: string): void {
  const idx = shifts.findIndex((s) => s.id === id);
  if (idx >= 0) shifts.splice(idx, 1);
}
