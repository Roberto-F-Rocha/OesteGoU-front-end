import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("ID inválido"),
});

export const routeIdParamSchema = z.object({
  routeId: z.coerce.number().int().positive("ID da rota inválido"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export function formatZodError(error: z.ZodError) {
  return {
    fieldErrors: error.flatten().fieldErrors,
    formErrors: error.flatten().formErrors,
  };
}
