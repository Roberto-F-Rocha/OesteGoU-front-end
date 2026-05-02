import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { socket } from "@/services/socket";

type TicketSeverity = "low" | "medium" | "high";
type TicketStatus = "open" | "in_progress" | "resolved" | "canceled";

export interface DriverRoute {
  id: number;
  name: string;
  active?: boolean;
  schedule?: { id?: number; time: string; type: "ida" | "volta"; university?: { name: string } | null };
  vehicle?: { id: number; name?: string | null; model?: string | null; plate: string; capacity: number; active?: boolean } | null;
  city?: { name: string; state: string } | null;
  points?: { pickupPoint?: { name: string; address?: string | null } }[];
  reservations?: unknown[];
}

export interface MaintenanceTicket {
  id: number;
  vehicleId: number;
  busId?: number;
  title: string;
  description: string;
  severity: TicketSeverity;
  status: TicketStatus;
  resolution?: string | null;
  createdAt: string;
  vehicle?: { id: number; plate: string; model?: string | null; name?: string | null } | null;
}

interface CacheShape {
  routes: DriverRoute[];
  tickets: MaintenanceTicket[];
  timestamp: number;
}

const CACHE_TTL = 45_000;
let cache: CacheShape | null = null;
let inflight: Promise<CacheShape> | null = null;

function normalizeTicketResponse(payload: any): MaintenanceTicket[] {
  return payload?.data ?? payload ?? [];
}

async function fetchDriverMaintenance(): Promise<CacheShape> {
  if (inflight) return inflight;
  inflight = Promise.all([api.get("/driver/routes"), api.get("/maintenance-tickets/my")])
    .then(([routesResponse, ticketsResponse]) => {
      const data: CacheShape = {
        routes: routesResponse.data ?? [],
        tickets: normalizeTicketResponse(ticketsResponse.data),
        timestamp: Date.now(),
      };
      cache = data;
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function upsertTicket(list: MaintenanceTicket[], ticket: MaintenanceTicket) {
  const normalized = { ...ticket, vehicleId: Number(ticket.vehicleId ?? ticket.busId) };
  const index = list.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    const next = [...list];
    next[index] = { ...next[index], ...normalized };
    return next;
  }
  return [normalized, ...list];
}

export function useDriverMaintenance() {
  const [routes, setRoutes] = useState<DriverRoute[]>(cache?.routes ?? []);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(cache?.tickets ?? []);
  const [loading, setLoading] = useState(!cache);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  const syncCache = useCallback((next: Partial<CacheShape>) => {
    cache = {
      routes: next.routes ?? cache?.routes ?? [],
      tickets: next.tickets ?? cache?.tickets ?? [],
      timestamp: Date.now(),
    };
  }, []);

  const load = useCallback(async (options?: { force?: boolean; silent?: boolean }) => {
    const fresh = cache && Date.now() - cache.timestamp < CACHE_TTL;
    if (!options?.force && fresh) {
      setRoutes(cache.routes);
      setTickets(cache.tickets);
      setLoading(false);
      return cache;
    }

    if (options?.silent) setRefreshing(true);
    else setLoading(true);

    const data = await fetchDriverMaintenance();
    if (mounted.current) {
      setRoutes(data.routes);
      setTickets(data.tickets);
      setLoading(false);
      setRefreshing(false);
    }
    return data;
  }, []);

  const createTicket = useCallback(async (input: { vehicleId: number; title: string; description: string; severity: TicketSeverity }) => {
    const response = await api.post("/maintenance-tickets", input);
    const ticket = response.data as MaintenanceTicket;
    setTickets((current) => {
      const next = upsertTicket(current, ticket);
      syncCache({ tickets: next });
      return next;
    });
    return ticket;
  }, [syncCache]);

  useEffect(() => {
    mounted.current = true;
    load().catch(() => {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    });
    return () => { mounted.current = false; };
  }, [load]);

  useEffect(() => {
    const handleTicket = (ticket: MaintenanceTicket) => {
      setTickets((current) => {
        const next = upsertTicket(current, ticket);
        syncCache({ tickets: next });
        return next;
      });
    };
    const handleRoutes = () => load({ force: true, silent: true }).catch(() => undefined);

    socket.on("maintenance:ticket-created", handleTicket);
    socket.on("maintenance:ticket-updated", handleTicket);
    socket.on("route:occupancy-updated", handleRoutes);
    socket.on("route:capacity-alert", handleRoutes);
    socket.on("reservation:created", handleRoutes);
    socket.on("reservation:canceled", handleRoutes);

    return () => {
      socket.off("maintenance:ticket-created", handleTicket);
      socket.off("maintenance:ticket-updated", handleTicket);
      socket.off("route:occupancy-updated", handleRoutes);
      socket.off("route:capacity-alert", handleRoutes);
      socket.off("reservation:created", handleRoutes);
      socket.off("reservation:canceled", handleRoutes);
    };
  }, [load, syncCache]);

  const vehicles = useMemo(() => {
    const map = new Map<number, DriverRoute["vehicle"] & { routes: DriverRoute[]; passengers: number }>();
    routes.forEach((route) => {
      if (!route.vehicle) return;
      const current = map.get(route.vehicle.id) ?? { ...route.vehicle, routes: [], passengers: 0 };
      current.routes.push(route);
      current.passengers += route.reservations?.length ?? 0;
      map.set(route.vehicle.id, current);
    });
    return Array.from(map.values()).filter(Boolean) as Array<NonNullable<DriverRoute["vehicle"]> & { routes: DriverRoute[]; passengers: number }>;
  }, [routes]);

  return { routes, tickets, vehicles, loading, refreshing, reload: () => load({ force: true }), createTicket };
}

export type { TicketSeverity, TicketStatus };
