import { z } from "zod";

export const createReservationSchema = z.object({
  scheduleId: z.coerce.number().int().positive(),
  routeId: z.coerce.number().int().positive().optional(),
  pickupPointId: z.coerce.number().int().positive().optional(),
});

export const cancelReservationSchema = z.object({
  id: z.coerce.number().int().positive(),
});
