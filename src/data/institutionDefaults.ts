import { rnInstitutions } from "@/data/institutions";

export interface InstitutionDefaults {
  departureLocation: string;
  returnLocation: string;
}

// Defaults específicos por universidade (quando conhecidos)
const specificDefaults: Record<string, InstitutionDefaults> = {
  "UFRN - Universidade Federal do Rio Grande do Norte": {
    departureLocation: "Terminal Central",
    returnLocation: "UFRN - Portaria Principal (Av. Sen. Salgado Filho)",
  },
  "UERN - Universidade do Estado do Rio Grande do Norte": {
    departureLocation: "Terminal Central",
    returnLocation: "UERN - Campus Central (BR-110, Mossoró)",
  },
  "IFRN - Universidade do Estado do Rio Grande do Norte": {
    departureLocation: "Terminal Central",
    returnLocation: "IFRN - Portaria Principal",
  },
  "UFERSA - Universidade Federal Rural do Semi-Árido": {
    departureLocation: "Terminal Central",
    returnLocation: "UFERSA - Portaria Principal (Mossoró)",
  },
};

export function getInstitutionDefaults(institution: string): InstitutionDefaults {
  if (specificDefaults[institution]) return specificDefaults[institution];

  // Fallback inteligente: usa o nome curto da instituição como local de volta
  const shortName = institution.split(" - ")[0] ?? institution;
  return {
    departureLocation: "Terminal Central",
    returnLocation: `${shortName} - Portaria Principal`,
  };
}

export function searchInstitutions(query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return rnInstitutions.slice(0, limit);
  return rnInstitutions
    .filter((name) => name.toLowerCase().includes(q))
    .slice(0, limit);
}
