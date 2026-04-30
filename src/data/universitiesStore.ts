// Universidades cadastradas pelo administrador, escopadas por cidade.
// Schema PostgreSQL futuro:
//   universities (
//     id uuid pk,
//     city text,
//     state text,
//     name text,
//     short_name text,
//     address text,
//     created_at timestamptz,
//     unique (city, name)
//   )

import { rnInstitutions } from "@/data/institutions";

export interface University {
  id: string;
  city: string;
  state: string;
  name: string;
  shortName?: string;
  address?: string;
  createdAt: string;
}

const universities: University[] = [];
let bootstrapped = false;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  const now = new Date().toISOString();
  const seed = [
    { name: "UFERSA - Universidade Federal Rural do Semi-Árido", short: "UFERSA", address: "Mossoró/RN" },
    { name: "UERN - Universidade do Estado do Rio Grande do Norte", short: "UERN", address: "Mossoró/RN" },
    { name: "IFRN - Campus Pau dos Ferros", short: "IFRN", address: "Pau dos Ferros/RN" },
  ];
  for (const item of seed) {
    universities.push({
      id: crypto.randomUUID(),
      city: "Riacho da Cruz",
      state: "RN",
      name: item.name,
      shortName: item.short,
      address: item.address,
      createdAt: now,
    });
  }
}

export function listUniversitiesByCity(city: string): University[] {
  bootstrap();
  return universities
    .filter((u) => norm(u.city) === norm(city))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listUniversityCatalog(): string[] {
  return rnInstitutions;
}

export function addUniversity(input: Omit<University, "id" | "createdAt">): University {
  bootstrap();
  const u: University = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  universities.push(u);
  return u;
}

export function updateUniversity(
  id: string,
  data: Partial<Omit<University, "id" | "createdAt">>,
): University | undefined {
  bootstrap();
  const u = universities.find((x) => x.id === id);
  if (!u) return undefined;
  Object.assign(u, data);
  return u;
}

export function removeUniversity(id: string): void {
  bootstrap();
  const idx = universities.findIndex((u) => u.id === id);
  if (idx >= 0) universities.splice(idx, 1);
}
