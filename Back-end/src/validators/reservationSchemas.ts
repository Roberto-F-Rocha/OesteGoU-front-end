import { z } from "zod";

export const createReservationSchema = z.object({
  scheduleId: z.coerce.number().int().positive(),
  routeId: z.coerce.number().int().positive().optional(),
  pickupPointId: z.coerce.number().int().positive().optional(),
  dayOfWeek: z.string().trim().min(1).max(20).optional(),
});

export const createRoundTripReservationSchema = z.object({
  dayOfWeek: z.string().trim().min(1).max(20),
  shift: z.enum(["manha", "tarde", "noite"]),
  going: z.object({
    scheduleId: z.coerce.number().int().positive(),
    routeId: z.coerce.number().int().positive(),
    pickupPointId: z.coerce.number().int().positive().optional(),
  }),
  returning: z.object({
    scheduleId: z.coerce.number().int().positive(),
    routeId: z.coerce.number().int().positive(),
    pickupPointId: z.coerce.number().int().positive().optional(),
  }),
});

export const cancelReservationSchema = z.object({
  id: z.coerce.number().int().positive(),
});
