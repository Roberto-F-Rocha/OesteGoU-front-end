import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function clearData() {
  await prisma.analyticsEvent.deleteMany();
  await prisma.pushSendLog.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userDocument.deleteMany();
  await prisma.session.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.routePoint.deleteMany();
  await prisma.transportRoute.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.pickupPoint.deleteMany();
  await prisma.university.deleteMany();
  await prisma.cityAgreement.deleteMany();
  await prisma.user.deleteMany();
  await prisma.city.deleteMany();
}

async function main() {
  await clearData();

  const senhaPadrao = await bcrypt.hash("12345678", 10);

  const riacho = await prisma.city.create({
    data: { name: "Riacho da Cruz", state: "RN" },
  });

  const pauDosFerros = await prisma.city.create({
    data: { name: "Pau dos Ferros", state: "RN" },
  });

  const apodi = await prisma.city.create({
    data: { name: "Apodi", state: "RN" },
  });

  const admin = await prisma.user.create({
    data: {
      nome: "Administrador Demo",
      email: "admin@demo.com",
      senha: senhaPadrao,
      role: "admin",
      status: "active",
      cpf: "10000000001",
      phone: "84999990001",
      cityId: riacho.id,
    },
  });

  const adminApodi = await prisma.user.create({
    data: {
      nome: "Administrador Apodi",
      email: "admin.apodi@demo.com",
      senha: senhaPadrao,
      role: "admin",
      status: "active",
      cpf: "10000000002",
      phone: "84999990002",
      cityId: apodi.id,
    },
  });

  const motorista1 = await prisma.user.create({
    data: {
      nome: "Carlos Motorista",
      email: "motorista1@demo.com",
      senha: senhaPadrao,
      role: "driver",
      status: "active",
      cpf: "20000000001",
      phone: "84988880001",
      cityId: riacho.id,
    },
  });

  const motorista2 = await prisma.user.create({
    data: {
      nome: "João Condutor",
      email: "motorista2@demo.com",
      senha: senhaPadrao,
      role: "driver",
      status: "active",
      cpf: "20000000002",
      phone: "84988880002",
      cityId: riacho.id,
    },
  });

  const motorista3 = await prisma.user.create({
    data: {
      nome: "Marcos Transporte",
      email: "motorista3@demo.com",
      senha: senhaPadrao,
      role: "driver",
      status: "inactive",
      cpf: "20000000003",
      phone: "84988880003",
      cityId: pauDosFerros.id,
    },
  });

  const aluno1 = await prisma.user.create({
    data: {
      nome: "Ana Beatriz",
      email: "aluno1@demo.com",
      senha: senhaPadrao,
      role: "student",
      status: "active",
      cpf: "30000000001",
      phone: "84977770001",
      institution: "UFERSA",
      cityId: riacho.id,
    },
  });

  const aluno2 = await prisma.user.create({
    data: {
      nome: "Pedro Henrique",
      email: "aluno2@demo.com",
      senha: senhaPadrao,
      role: "student",
      status: "active",
      cpf: "30000000002",
      phone: "84977770002",
      institution: "UERN",
      cityId: riacho.id,
    },
  });

  const aluno3 = await prisma.user.create({
    data: {
      nome: "Maria Clara",
      email: "aluno3@demo.com",
      senha: senhaPadrao,
      role: "student",
      status: "pending",
      cpf: "30000000003",
      phone: "84977770003",
      institution: "IFRN",
      cityId: riacho.id,
    },
  });

  const aluno4 = await prisma.user.create({
    data: {
      nome: "Lucas Gabriel",
      email: "aluno4@demo.com",
      senha: senhaPadrao,
      role: "student",
      status: "active",
      cpf: "30000000004",
      phone: "84977770004",
      institution: "UFERSA",
      cityId: pauDosFerros.id,
    },
  });

  const ufersa = await prisma.university.create({
    data: {
      name: "UFERSA - Campus Pau dos Ferros",
      cityName: "Pau dos Ferros",
      cityId: riacho.id,
    },
  });

  const uern = await prisma.university.create({
    data: {
      name: "UERN - Campus Pau dos Ferros",
      cityName: "Pau dos Ferros",
      cityId: riacho.id,
    },
  });

  await prisma.university.create({
    data: {
      name: "IFRN - Campus Apodi",
      cityName: "Apodi",
      cityId: apodi.id,
    },
  });

  const ponto1 = await prisma.pickupPoint.create({
    data: {
      name: "Praça Central",
      address: "Centro",
      latitude: -5.926,
      longitude: -37.947,
      cityId: riacho.id,
    },
  });

  const ponto2 = await prisma.pickupPoint.create({
    data: {
      name: "Posto Oeste",
      address: "Entrada da cidade",
      latitude: -5.927,
      longitude: -37.951,
      cityId: riacho.id,
    },
  });

  const ponto3 = await prisma.pickupPoint.create({
    data: {
      name: "Terminal Rodoviário",
      address: "Rodoviária",
      latitude: -5.928,
      longitude: -37.949,
      cityId: riacho.id,
    },
  });

  const veiculo1 = await prisma.vehicle.create({
    data: {
      plate: "ABC1D23",
      name: "Ônibus 01",
      model: "Mercedes-Benz",
      capacity: 44,
      active: true,
      cityId: riacho.id,
    },
  });

  const veiculo2 = await prisma.vehicle.create({
    data: {
      plate: "DEF4G56",
      name: "Micro-ônibus 02",
      model: "Volare",
      capacity: 28,
      active: true,
      cityId: riacho.id,
    },
  });

  await prisma.vehicle.create({
    data: {
      plate: "HIJ7K89",
      name: "Reserva 03",
      model: "Marcopolo",
      capacity: 40,
      active: false,
      cityId: riacho.id,
    },
  });

  const horarioIda = await prisma.schedule.create({
    data: {
      time: "06:00",
      type: "ida",
      active: true,
      universityId: ufersa.id,
    },
  });

  const horarioVolta = await prisma.schedule.create({
    data: {
      time: "22:10",
      type: "volta",
      active: true,
      universityId: ufersa.id,
    },
  });

  const horarioTarde = await prisma.schedule.create({
    data: {
      time: "12:30",
      type: "ida",
      active: true,
      universityId: uern.id,
    },
  });

  const rotaIda = await prisma.transportRoute.create({
    data: {
      name: "Riacho da Cruz → UFERSA",
      cityId: riacho.id,
      scheduleId: horarioIda.id,
      vehicleId: veiculo1.id,
      driverId: motorista1.id,
      active: true,
    },
  });

  const rotaVolta = await prisma.transportRoute.create({
    data: {
      name: "UFERSA → Riacho da Cruz",
      cityId: riacho.id,
      scheduleId: horarioVolta.id,
      vehicleId: veiculo1.id,
      driverId: motorista1.id,
      active: true,
    },
  });

  const rotaTarde = await prisma.transportRoute.create({
    data: {
      name: "Riacho da Cruz → UERN",
      cityId: riacho.id,
      scheduleId: horarioTarde.id,
      vehicleId: veiculo2.id,
      driverId: motorista2.id,
      active: true,
    },
  });

  const rotas = [rotaIda, rotaVolta, rotaTarde];

  for (const rota of rotas) {
    await prisma.routePoint.create({
      data: { routeId: rota.id, pickupPointId: ponto1.id, order: 1 },
    });

    await prisma.routePoint.create({
      data: { routeId: rota.id, pickupPointId: ponto2.id, order: 2 },
    });

    await prisma.routePoint.create({
      data: { routeId: rota.id, pickupPointId: ponto3.id, order: 3 },
    });
  }

  await prisma.reservation.create({
    data: {
      userId: aluno1.id,
      scheduleId: horarioIda.id,
      routeId: rotaIda.id,
      pickupPointId: ponto1.id,
      status: "confirmed",
    },
  });

  await prisma.reservation.create({
    data: {
      userId: aluno2.id,
      scheduleId: horarioIda.id,
      routeId: rotaIda.id,
      pickupPointId: ponto2.id,
      status: "confirmed",
    },
  });

  await prisma.reservation.create({
    data: {
      userId: aluno1.id,
      scheduleId: horarioVolta.id,
      routeId: rotaVolta.id,
      pickupPointId: ponto1.id,
      status: "confirmed",
    },
  });

  await prisma.reservation.create({
    data: {
      userId: aluno2.id,
      scheduleId: horarioTarde.id,
      routeId: rotaTarde.id,
      pickupPointId: ponto2.id,
      status: "canceled",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: aluno1.id,
        title: "Conta aprovada",
        message: "Sua conta foi aprovada pela administração.",
        type: "success",
        link: "/student/trip",
      },
      {
        userId: aluno2.id,
        title: "Viagem confirmada",
        message: "Sua reserva foi confirmada com sucesso.",
        type: "success",
        link: "/student/trip",
      },
      {
        userId: motorista1.id,
        title: "Rota atribuída",
        message: "Você foi vinculado à rota da manhã.",
        type: "info",
        link: "/driver/routes",
      },
    ],
  });

  await prisma.userDocument.createMany({
    data: [
      {
        userId: aluno1.id,
        type: "profile_photo",
        status: "approved",
        fileName: "foto-aluno-demo.jpg",
        filePath: "uploads/foto-aluno-demo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 120000,
        moderationStatus: "approved",
      },
      {
        userId: aluno1.id,
        type: "enrollment_proof",
        status: "pending",
        fileName: "matricula-demo.pdf",
        filePath: "uploads/matricula-demo.pdf",
        mimeType: "application/pdf",
        sizeBytes: 300000,
        moderationStatus: "not_required",
      },
      {
        userId: motorista1.id,
        type: "driver_license",
        status: "approved",
        fileName: "cnh-demo.pdf",
        filePath: "uploads/cnh-demo.pdf",
        mimeType: "application/pdf",
        sizeBytes: 280000,
        moderationStatus: "not_required",
      },
    ],
  });

  await prisma.pushSendLog.create({
    data: {
      title: "Aviso geral",
      message: "Confira os horários atualizados no sistema.",
      url: "/admin/horarios",
      target: "all",
      sentById: admin.id,
      cityId: riacho.id,
      recipients: 4,
    },
  });

  await prisma.analyticsEvent.createMany({
    data: [
      {
        userId: admin.id,
        event: "LOGIN",
        metadata: { role: "admin" },
      },
      {
        userId: aluno1.id,
        event: "RESERVATION_CREATED",
        metadata: { routeId: rotaIda.id },
      },
      {
        userId: aluno2.id,
        event: "UPLOAD_CREATED",
        metadata: { type: "enrollment_proof" },
      },
    ],
  });

  await prisma.cityAgreement.create({
    data: {
      requesterCityId: riacho.id,
      partnerCityId: pauDosFerros.id,
      status: "active",
      title: "Convênio de transporte universitário",
      description: "Convênio fictício para transporte integrado entre municípios.",
      requestedById: admin.id,
      approvedById: adminApodi.id,
    },
  });

  console.log("Seed demo concluído com sucesso!");
  console.log("Admin: admin@demo.com / 12345678");
  console.log("Admin Apodi: admin.apodi@demo.com / 12345678");
  console.log("Aluno: aluno1@demo.com / 12345678");
  console.log("Motorista: motorista1@demo.com / 12345678");
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });