import { z } from "zod";

export const cpfSchema = z
  .string()
  .min(11, "CPF inválido")
  .max(14, "CPF inválido")
  .regex(/^[0-9.\-]+$/, "CPF deve conter apenas números")
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 11, "CPF deve ter 11 dígitos");

export const phoneSchema = z
  .string()
  .min(10, "Telefone inválido")
  .max(15, "Telefone inválido");

export const registerSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: z.enum(["admin", "student", "driver"]),
  cpf: cpfSchema.optional(),
  phone: phoneSchema.optional(),
  birthDate: z.string().optional(),
  institution: z.string().optional(),
  cep: z.string().min(8).max(9),
  street: z.string().min(3),
  number: z.string().min(1),
  neighborhood: z.string().min(2),
  city: z.string().min(2),
  state: z.string().length(2),
});
