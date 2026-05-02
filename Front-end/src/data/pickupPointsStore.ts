// Pontos de embarque/desembarque cadastrados pelo administrador,
// organizados por (cidade + universidade). Modelo coerente com um
// schema PostgreSQL futuro:
//
//   pickup_points (
//     id uuid pk,
//     city text,
//     university text,
//     kind text check (kind in ('departure','return')),
//     label text,
//     is_default boolean,
//     created_at timestamptz
//   )
//   unique (city, university, kind, label)

import { getInstitutionDefaults } from "@/data/institutionDefaults";

export type PickupKind = "departure" | "return";

export interface PickupPoint {
  id: string;
  city: string;
  university: string;
  kind: PickupKind;
  label: string;
  isDefault: boolean;
}

const points: PickupPoint[] = [];
const seededKeys = new Set<string>();

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const seedKey = (city: string, university: string) =>
  `${norm(city)}::${norm(university)}`;

function ensureDefaults(city: string, university: string) {
  const key = seedKey(city, university);
  if (seededKeys.has(key)) return;
  seededKeys.add(key);

  const hasAny = points.some(
    (p) => norm(p.city) === norm(city) && norm(p.university) === norm(university),
  );
  if (hasAny) return;

  const defaults = getInstitutionDefaults(university);
  points.push(
    {
      id: crypto.randomUUID(),
      city,
      university,
      kind: "departure",
      label: defaults.departureLocation,
      isDefault: true,
    },
    {
      id: crypto.randomUUID(),
      city,
      university,
      kind: "return",
      label: defaults.returnLocation,
      isDefault: true,
    },
  );
}

export function listPickupPoints(
  city: string,
  university: string,
  kind: PickupKind,
): PickupPoint[] {
  ensureDefaults(city, university);
  return points.filter(
    (p) =>
      norm(p.city) === norm(city) &&
      norm(p.university) === norm(university) &&
      p.kind === kind,
  );
}

export function listDeparturePointsByCity(city: string): PickupPoint[] {
  const cityPoints = points.filter(
    (p) => norm(p.city) === norm(city) && p.kind === "departure",
  );

  if (cityPoints.length > 0) {
    const unique = new Map<string, PickupPoint>();
    cityPoints.forEach((point) => {
      const key = norm(point.label);
      if (!unique.has(key)) unique.set(key, point);
    });
    return Array.from(unique.values());
  }

  return [
    {
      id: `default-departure-${norm(city)}`,
      city,
      university: "",
      kind: "departure",
      label: city,
      isDefault: true,
    },
  ];
}

export function listReturnPointsByUniversity(city: string, university: string): PickupPoint[] {
  return listPickupPoints(city, university, "return");
}

export function getSinglePickupPoint(
  city: string,
  university: string,
  kind: PickupKind,
): PickupPoint | null {
  const list = listPickupPoints(city, university, kind);
  return list.length === 1 ? list[0] : null;
}

export function getDefaultPickupPoint(
  city: string,
  university: string,
  kind: PickupKind,
): PickupPoint | null {
  const list = listPickupPoints(city, university, kind);
  return list.find((p) => p.isDefault) ?? list[0] ?? null;
}

export function addPickupPoint(input: Omit<PickupPoint, "id">): PickupPoint {
  ensureDefaults(input.city, input.university);
  const point: PickupPoint = { ...input, id: crypto.randomUUID() };
  points.push(point);
  return point;
}

export function removePickupPoint(id: string): void {
  const idx = points.findIndex((p) => p.id === id);
  if (idx >= 0) points.splice(idx, 1);
}
