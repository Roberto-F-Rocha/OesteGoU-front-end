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

const TICKETS_KEY = "oestegou:maintenanceTickets";
const buses: Bus[] = [];
let bootstrapped = false;

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function loadTickets(): MaintenanceTicket[] {
  try {
    const raw = localStorage.getItem(TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTickets(tickets: MaintenanceTicket[]) {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  const now = new Date().toISOString();
  buses.push(
    { id: "bus-seed-1", city: "Riacho da Cruz", state: "RN", plate: "OYM-1A23", model: "Mercedes-Benz OF-1721", capacity: 46, year: 2019, status: "in_use", notes: "Ônibus principal da rota universitária noturna.", createdAt: now },
    { id: "bus-seed-2", city: "Riacho da Cruz", state: "RN", plate: "OYM-4B56", model: "Volkswagen 17.230", capacity: 42, year: 2017, status: "available", notes: "Reserva para manhã/tarde.", createdAt: now },
    { id: "bus-seed-3", city: "Riacho da Cruz", state: "RN", plate: "OYM-7C89", model: "Iveco CityClass", capacity: 38, year: 2015, status: "maintenance", notes: "Em revisão preventiva da suspensão.", createdAt: now },
    { id: "bus-seed-4", city: "Pau dos Ferros", state: "RN", plate: "PDF-2D34", model: "Marcopolo Torino", capacity: 44, year: 2020, status: "available", createdAt: now },
  );
}

export function listBusesByCity(city: string): Bus[] { bootstrap(); return buses.filter((b) => norm(b.city) === norm(city)); }
export function getBusById(id: string): Bus | undefined { bootstrap(); return buses.find((b) => b.id === id); }
export function addBus(input: Omit<Bus, "id" | "createdAt">): Bus { bootstrap(); const bus: Bus = { ...input, id: makeId("bus"), createdAt: new Date().toISOString() }; buses.push(bus); return bus; }
export function updateBus(id: string, data: Partial<Omit<Bus, "id" | "createdAt">>): Bus | undefined { bootstrap(); const bus = buses.find((b) => b.id === id); if (!bus) return undefined; Object.assign(bus, data); return bus; }
export function removeBus(id: string): void { bootstrap(); const idx = buses.findIndex((b) => b.id === id); if (idx >= 0) buses.splice(idx, 1); const remaining = loadTickets().filter((ticket) => ticket.busId !== id); saveTickets(remaining); }

export function listTicketsByCity(city: string): MaintenanceTicket[] { return loadTickets().filter((t) => norm(t.city) === norm(city)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function listTicketsByDriver(driverId: string): MaintenanceTicket[] { const id = String(driverId); return loadTickets().filter((t) => String(t.openedById) === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }

export function addTicket(input: Omit<MaintenanceTicket, "id" | "status" | "createdAt" | "updatedAt"> & { status?: TicketStatus }): MaintenanceTicket {
  const now = new Date().toISOString();
  const ticket: MaintenanceTicket = { ...input, openedById: String(input.openedById), busId: String(input.busId), id: makeId("ticket"), status: input.status ?? "open", createdAt: now, updatedAt: now };
  const tickets = loadTickets();
  tickets.push(ticket);
  saveTickets(tickets);
  return ticket;
}

export function updateTicket(id: string, data: Partial<Omit<MaintenanceTicket, "id" | "createdAt" | "busId" | "city">>): MaintenanceTicket | undefined {
  const tickets = loadTickets();
  const index = tickets.findIndex((t) => t.id === id);
  if (index < 0) return undefined;
  tickets[index] = { ...tickets[index], ...data, updatedAt: new Date().toISOString() };
  saveTickets(tickets);
  return tickets[index];
}

export function removeTicket(id: string): void { saveTickets(loadTickets().filter((t) => t.id !== id)); }
export function countOpenTicketsByCity(city: string): number { return listTicketsByCity(city).filter((t) => t.status !== "resolved").length; }
export function listBusesByDriver(driverId: string): Bus[] { bootstrap(); return buses.filter((b) => b.assignedDriverId === driverId); }
export function assignDriverToBuses(driverId: string, busIds: string[]): void { bootstrap(); for (const b of buses) { if (b.assignedDriverId === driverId && !busIds.includes(b.id)) b.assignedDriverId = null; } for (const id of busIds) { const b = buses.find((x) => x.id === id); if (b) b.assignedDriverId = driverId; } }
