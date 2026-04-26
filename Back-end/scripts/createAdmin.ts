import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function run() {
  const hash = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@altobus.com",
      senha: hash,
      role: "admin",
    },
  });

  console.log("Usuário criado:", user);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });