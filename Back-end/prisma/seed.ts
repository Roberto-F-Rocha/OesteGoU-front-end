import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const senhaHash = await bcrypt.hash("123456", 10);

  const city = await prisma.city.upsert({
    where: {
      name_state: {
        name: "Riacho da Cruz",
        state: "RN",
      },
    },
    update: {},
    create: {
      name: "Riacho da Cruz",
      state: "RN",
    },
  });

  const university = await prisma.university.upsert({
    where: { id: 1 },
    update: {
      name: "Universidade do Alto Oeste",
      cityName: city.name,
      cityId: city.id,
    },
    create: {
      name: "Universidade do Alto Oeste",
      cityName: city.name,
      cityId: city.id,
    },
  });

  const schedule = await prisma.schedule.upsert({
    where: { id: 1 },
    update: {
      time: "06:00",
      type: "ida",
      universityId: university.id,
      active: true,
    },
    create: {
      time: "06:00",
      type: "ida",
      universityId: university.id,
      active: true,
    },
  });

  const pickupPoint = await prisma.pickupPoint.upsert({
    where: { id: 1 },
    update: {
      name: "Praça Principal",
      address: "Centro",
      cityId: city.id,
    },
    create: {
      name: "Praça Principal",
      address: "Centro",
      cityId: city.id,
    },
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { plate: "ABC1D23" },
    update: {
      name: "Ônibus 01",
      model: "Micro-ônibus",
      capacity: 40,
      cityId: city.id,
      active: true,
    },
    create: {
      plate: "ABC1D23",
      name: "Ônibus 01",
      model: "Micro-ônibus",
      capacity: 40,
      cityId: city.id,
      active: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@oestegou.com" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@oestegou.com",
      senha: senhaHash,
      role: "admin",
      cpf: "00000000001",
      phone: "84999990001",
      cityId: city.id,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "aluno@oestegou.com" },
    update: {},
    create: {
      nome: "Aluno Teste",
      email: "aluno@oestegou.com",
      senha: senhaHash,
      role: "student",
      cpf: "00000000002",
      phone: "84999990002",
      institution: university.name,
      cityId: city.id,
      cep: "59820-000",
      street: "Rua Principal",
      number: "100",
      neighborhood: "Centro",
    },
  });

  const driver = await prisma.user.upsert({
    where: { email: "motorista@oestegou.com" },
    update: {},
    create: {
      nome: "Motorista Teste",
      email: "motorista@oestegou.com",
      senha: senhaHash,
      role: "driver",
      cpf: "00000000003",
      phone: "84999990003",
      cityId: city.id,
    },
  });

  const route = await prisma.transportRoute.upsert({
    where: { id: 1 },
    update: {
      name: "Rota Riacho da Cruz - Universidade",
      cityId: city.id,
      scheduleId: schedule.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      active: true,
    },
    create: {
      name: "Rota Riacho da Cruz - Universidade",
      cityId: city.id,
      scheduleId: schedule.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      active: true,
    },
  });

  await prisma.routePoint.upsert({
    where: {
      routeId_pickupPointId: {
        routeId: route.id,
        pickupPointId: pickupPoint.id,
      },
    },
    update: { order: 1 },
    create: {
      routeId: route.id,
      pickupPointId: pickupPoint.id,
      order: 1,
    },
  });

  await prisma.reservation.upsert({
    where: { id: 1 },
    update: {
      userId: student.id,
      scheduleId: schedule.id,
      routeId: route.id,
      pickupPointId: pickupPoint.id,
      status: "confirmed",
    },
    create: {
      userId: student.id,
      scheduleId: schedule.id,
      routeId: route.id,
      pickupPointId: pickupPoint.id,
      status: "confirmed",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      cityId: city.id,
      action: "create",
      entity: "seed",
      description: "Carga inicial de dados de teste do OesteGoU",
    },
  });

  console.log("Usuários e dados de teste criados com sucesso.");
  console.table([
    { perfil: "Administrador", email: "admin@oestegou.com", senha: "123456" },
    { perfil: "Aluno", email: "aluno@oestegou.com", senha: "123456" },
    { perfil: "Motorista", email: "motorista@oestegou.com", senha: "123456" },
  ]);
}

main()
  .catch((error) => {
    console.error("Erro ao criar dados de teste:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
