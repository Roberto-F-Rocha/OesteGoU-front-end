import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { createAuditLog, getRequestAuditData } from "../utils/audit";
import { registerSchema } from "../validators/userSchemas";

export async function registerUser(req, res) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: parsed.error.flatten(),
    });
  }

  const data = parsed.data;

  if (data.role === "student" && !data.institution) {
    return res.status(400).json({
      error: "Instituição obrigatória para aluno",
    });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existingUser) {
    return res.status(409).json({
      error: "E-mail já cadastrado",
    });
  }

  if (data.cpf) {
    const existingCpf = await prisma.user.findUnique({
      where: { cpf: data.cpf },
    });

    if (existingCpf) {
      return res.status(409).json({
        error: "CPF já cadastrado",
      });
    }
  }

  const city = await prisma.city.upsert({
    where: {
      name_state: {
        name: data.city,
        state: data.state,
      },
    },
    update: {},
    create: {
      name: data.city,
      state: data.state,
    },
  });

  const senhaHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      nome: data.name,
      email: data.email.toLowerCase(),
      senha: senhaHash,
      role: data.role,
      cpf: data.cpf,
      phone: data.phone,
      institution:
        data.role === "student" ? data.institution : undefined,
      cep: data.cep,
      street: data.street,
      number: data.number,
      neighborhood: data.neighborhood,
      cityId: city.id,
      status: data.role === "admin" ? "active" : "pending",
    },
  });

  await createAuditLog({
    userId: user.id,
    cityId: city.id,
    action: "create",
    entity: "User",
    entityId: user.id,
    description: "Cadastro realizado",
    ...getRequestAuditData(req, res),
  });

  return res.status(201).json(user);
}