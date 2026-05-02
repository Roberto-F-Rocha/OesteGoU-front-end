import { z } from "zod";

function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, "");

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;

  return digit === Number(cpf[10]);
}

export const cpfSchema = z
  .string()
  .min(11, "CPF inválido")
  .max(14, "CPF inválido")
  .regex(/^[0-9.\-]+$/, "CPF deve conter apenas números")
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => isValidCpf(v), "CPF inválido");

export const phoneSchema = z
  .string()
  .min(10, "Telefone inválido")
  .max(16, "Telefone inválido")
  .regex(/^[0-9()\-\s+]+$/, "Telefone inválido");

export const ufSchema = z
  .string()
  .length(2, "UF deve ter 2 letras")
  .transform((v) => v.toUpperCase());

export const registerSchema = z.object({
  name: z.string().trim().min(3, "Nome muito curto").max(120, "Nome muito longo"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  role: z.enum(["admin", "student"]),
  cpf: cpfSchema.optional(),
  phone: phoneSchema.optional(),
  birthDate: z.string().optional(),
  institution: z.string().trim().max(180).optional(),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  street: z.string().trim().min(3, "Rua obrigatória").max(180),
  number: z.string().trim().min(1, "Número obrigatório").max(20),
  neighborhood: z.string().trim().min(2, "Bairro obrigatório").max(120),
  city: z.string().trim().min(2, "Cidade obrigatória").max(120),
  state: ufSchema,
});
