import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const QUERY_KEY = ["driver-maintenance"] as const;

function normalizeTicketResponse(payload: any): MaintenanceTicket[] {
  const list = payload?.data ?? payload ?? [];
  return Array.isArray(list) ? list.map((ticket) => ({ ...ticket, vehicleId: Number(ticket.vehicleId ?? ticket.busId) })) : [];
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

async function fetchDriverMaintenance() {
  const [routesResponse, ticketsResponse] = await Promise.all([
    api.get("/driver/routes"),
    api.get("/maintenance-tickets/my"),
  ]);

  return {
    routes: routesResponse.data ?? [],
    tickets: normalizeTicketResponse(ticketsResponse.data),
  } as { routes: DriverRoute[]; tickets: MaintenanceTicket[] };
}

export function useDriverMaintenance() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchDriverMaintenance,
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: async (input: { vehicleId: number; title: string; description: string; severity: TicketSeverity }) => {
      const response = await api.post("/maintenance-tickets", input);
      return { ...response.data, vehicleId: Number(response.data.vehicleId ?? response.data.busId) } as MaintenanceTicket;
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData(QUERY_KEY, (current: { routes: DriverRoute[]; tickets: MaintenanceTicket[] } | undefined) => ({
        routes: current?.routes ?? [],
        tickets: upsertTicket(current?.tickets ?? [], ticket),
      }));
    },
  });

  useEffect(() => {
    const handleTicket = (ticket: MaintenanceTicket) => {
      queryClient.setQueryData(QUERY_KEY, (current: { routes: DriverRoute[]; tickets: MaintenanceTicket[] } | undefined) => ({
        routes: current?.routes ?? [],
        tickets: upsertTicket(current?.tickets ?? [], ticket),
      }));
    };

    const handleRoutes = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    };

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
  }, [queryClient]);

  const routes = query.data?.routes ?? [];
  const tickets = query.data?.tickets ?? [];
  const vehicles = useMemo(() => {
    const map = new Map<number, NonNullable<DriverRoute["vehicle"]> & { routes: DriverRoute[]; passengers: number }>();
    routes.forEach((route) => {
      if (!route.vehicle) return;
      const current = map.get(route.vehicle.id) ?? { ...route.vehicle, routes: [], passengers: 0 };
      current.routes.push(route);
      current.passengers += route.reservations?.length ?? 0;
      map.set(route.vehicle.id, current);
    });
    return Array.from(map.values());
  }, [routes]);

  return {
    routes,
    tickets,
    vehicles,
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    error: query.error,
    reload: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    createTicket: mutation.mutateAsync,
    creatingTicket: mutation.isPending,
  };
}

export type { TicketSeverity, TicketStatus };
