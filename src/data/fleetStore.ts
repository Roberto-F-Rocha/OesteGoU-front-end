// Frota e chamados de manutenção (in-memory, alinhado a um schema PostgreSQL futuro).
// Tabelas equivalentes:
//   buses(id, city, plate, model, capacity, year, status, notes, created_at)
//   maintenance_tickets(id, bus_id, city, opened_by_id, opened_by_name, title, description,
//                       severity, status, resolution, created_at, updated_at)

export type BusStatus = "available" | "in_use" | "maintenance" | "inactive";

export interface Bus {
  id: string;
  city: string;
  state: string;
  plate: string;
  model: string;
  capacity: number;
  year: number;
  status: BusStatus;
  notes?: string;
  assignedDriverId?: string | null;
  createdAt: string;
}

export type TicketSeverity = "low" | "medium" | "high";
export type TicketStatus = "open" | "in_progress" | "resolved";

export interface MaintenanceTicket {
  id: string;
  busId: string;
  city: string;
  openedById: string;
  openedByName: string;
  title: string;
  description: string;
  severity: TicketSeverity;
  status: TicketStatus;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

const buses: Bus[] = [];
const tickets: MaintenanceTicket[] = [];
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
  buses.push(
    {
      id: "bus-seed-1",
      city: "Riacho da Cruz",
      state: "RN",
      plate: "OYM-1A23",
      model: "Mercedes-Benz OF-1721",
      capacity: 46,
      year: 2019,
      status: "in_use",
      notes: "Ônibus principal da rota universitária noturna.",
      createdAt: now,
    },
    {
      id: "bus-seed-2",
      city: "Riacho da Cruz",
      state: "RN",
      plate: "OYM-4B56",
      model: "Volkswagen 17.230",
      capacity: 42,
      year: 2017,
      status: "available",
      notes: "Reserva para manhã/tarde.",
      createdAt: now,
    },
    {
      id: "bus-seed-3",
      city: "Riacho da Cruz",
      state: "RN",
      plate: "OYM-7C89",
      model: "Iveco CityClass",
      capacity: 38,
      year: 2015,
      status: "maintenance",
      notes: "Em revisão preventiva da suspensão.",
      createdAt: now,
    },
    {
      id: "bus-seed-4",
      city: "Pau dos Ferros",
      state: "RN",
      plate: "PDF-2D34",
      model: "Marcopolo Torino",
      capacity: 44,
      year: 2020,
      status: "available",
      createdAt: now,
    },
  );

  tickets.push({
    id: "tk-seed-1",
    busId: "bus-seed-3",
    city: "Riacho da Cruz",
    openedById: "3",
    openedByName: "Carlos Oliveira",
    title: "Barulho na suspensão dianteira",
    description:
      "Ao passar em lombadas e buracos, ouve-se um estalo do lado do motorista. Sugiro inspeção do amortecedor e bandeja.",
    severity: "high",
    status: "in_progress",
    createdAt: now,
    updatedAt: now,
  });
}

// ============== Buses ==============

export function listBusesByCity(city: string): Bus[] {
  bootstrap();
  return buses.filter((b) => norm(b.city) === norm(city));
}

export function getBusById(id: string): Bus | undefined {
  bootstrap();
  return buses.find((b) => b.id === id);
}

export function addBus(input: Omit<Bus, "id" | "createdAt">): Bus {
  bootstrap();
  const bus: Bus = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  buses.push(bus);
  return bus;
}

export function updateBus(
  id: string,
  data: Partial<Omit<Bus, "id" | "createdAt">>,
): Bus | undefined {
  bootstrap();
  const bus = buses.find((b) => b.id === id);
  if (!bus) return undefined;
  Object.assign(bus, data);
  return bus;
}

export function removeBus(id: string): void {
  bootstrap();
  const idx = buses.findIndex((b) => b.id === id);
  if (idx >= 0) buses.splice(idx, 1);
  // Remove chamados vinculados.
  for (let i = tickets.length - 1; i >= 0; i--) {
    if (tickets[i].busId === id) tickets.splice(i, 1);
  }
}

// ============== Tickets ==============

export function listTicketsByCity(city: string): MaintenanceTicket[] {
  bootstrap();
  return tickets
    .filter((t) => norm(t.city) === norm(city))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listTicketsByDriver(driverId: string): MaintenanceTicket[] {
  bootstrap();
  return tickets
    .filter((t) => t.openedById === driverId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addTicket(
  input: Omit<MaintenanceTicket, "id" | "status" | "createdAt" | "updatedAt"> & {
    status?: TicketStatus;
  },
): MaintenanceTicket {
  bootstrap();
  const now = new Date().toISOString();
  const ticket: MaintenanceTicket = {
    ...input,
    id: crypto.randomUUID(),
    status: input.status ?? "open",
    createdAt: now,
    updatedAt: now,
  };
  tickets.push(ticket);
  return ticket;
}

export function updateTicket(
  id: string,
  data: Partial<Omit<MaintenanceTicket, "id" | "createdAt" | "busId" | "city">>,
): MaintenanceTicket | undefined {
  bootstrap();
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return undefined;
  Object.assign(ticket, data, { updatedAt: new Date().toISOString() });
  return ticket;
}

export function removeTicket(id: string): void {
  bootstrap();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx >= 0) tickets.splice(idx, 1);
}

export function countOpenTicketsByCity(city: string): number {
  bootstrap();
  return listTicketsByCity(city).filter((t) => t.status !== "resolved").length;
}
