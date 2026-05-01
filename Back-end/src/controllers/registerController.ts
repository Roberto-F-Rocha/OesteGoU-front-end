import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function registerUser(req, res) {
  const {
    name,
    email,
    password,
    role,
    cpf,
    phone,
    birthDate,
    institution,
    photo,
    cep,
    street,
    number,
    neighborhood,
    city,
    state,
  } = req.body;

  if (!name || !email || !password || !role || !city || !state) {
    return res.status(400).json({ error: "Nome, e-mail, senha, perfil, cidade e estado são obrigatórios" });
  }

  const allowedRoles = ["admin", "student", "driver"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: "Perfil inválido" });
  }

  if (role === "student" && !institution) {
    return res.status(400).json({ error: "Instituição é obrigatória para alunos" });
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    return res.status(409).json({ error: "E-mail já cadastrado" });
  }

  if (cpf) {
    const existingCpf = await prisma.user.findUnique({ where: { cpf } });
    if (existingCpf) {
      return res.status(409).json({ error: "CPF já cadastrado" });
    }
  }

  const userCity = await prisma.city.upsert({
    where: {
      name_state: {
        name: city,
        state,
      },
    },
    update: {},
    create: {
      name: city,
      state,
    },
  });

  const senhaHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      nome: name,
      email: normalizedEmail,
      senha: senhaHash,
      role,
      cpf,
      phone,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      institution: role === "student" ? institution : undefined,
      photo,
      cep,
      street,
      number,
      neighborhood,
      cityId: userCity.id,
      status: role === "admin" ? "active" : "pending",
    },
    include: { city: true },
  });

  await createAuditLog({
    userId: user.id,
    cityId: userCity.id,
    action: "create",
    entity: "User",
    entityId: user.id,
    description: `Cadastro de ${role} criado`,
    metadata: { role, status: user.status },
    ...getRequestAuditData(req, res),
  });

  return res.status(201).json({
    id: user.id,
    name: user.nome,
    email: user.email,
    role: user.role,
    status: user.status,
    city: user.city
      ? {
          id: user.city.id,
          name: user.city.name,
          state: user.city.state,
        }
      : null,
  });
}
