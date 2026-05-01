import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const senhaHash = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { email: "admin@oestegou.com" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@oestegou.com",
      senha: senhaHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "aluno@oestegou.com" },
    update: {},
    create: {
      nome: "Aluno Teste",
      email: "aluno@oestegou.com",
      senha: senhaHash,
      role: "STUDENT",
    },
  });

  await prisma.user.upsert({
    where: { email: "motorista@oestegou.com" },
    update: {},
    create: {
      nome: "Motorista Teste",
      email: "motorista@oestegou.com",
      senha: senhaHash,
      role: "DRIVER",
    },
  });

  console.log("✅ Usuários criados");
}

main().finally(() => prisma.$disconnect());