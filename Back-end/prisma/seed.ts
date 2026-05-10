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

  const cidade = await prisma.city.create({
    data: {
      name: "Riacho da Cruz",
      state: "RN",
    },
  });

  const universidade = await prisma.university.create({
    data: {
      name: "UFERSA - Campus Pau dos Ferros",
      cityName: "Pau dos Ferros",
      cityId: cidade.id,
    },
  });

  const adminDemo = await prisma.user.create({
    data: {
      nome: "Admin Demo",
      email: "admindemo@demo.com",
      senha: senhaPadrao,
      role: "admin",
      status: "active",
      cpf: "10000000001",
      phone: "84999990001",
      cityId: cidade.id,
    },
  });

  const adminLimpo = await prisma.user.create({
    data: {
      nome: "Admin Limpo",
      email: "adminlimpo@demo.com",
      senha: senhaPadrao,
      role: "admin",
      status: "active",
      cpf: "10000000002",
      phone: "84999990002",
      cityId: cidade.id,
    },
  });

  const motoristaDemo = await prisma.user.create({
    data: {
      nome: "Motorista Demo",
      email: "motoristademo@demo.com",
      senha: senhaPadrao,
      role: "driver",
      status: "active",
      cpf: "20000000001",
      phone: "84988880001",
      cityId: cidade.id,
    },
  });

  const motoristaLimpo = await prisma.user.create({
    data: {
      nome: "Motorista Limpo",
      email: "motoristalimpo@demo.com",
      senha: senhaPadrao,
      role: "driver",
      status: "active",
      cpf: "20000000002",
      phone: "84988880002",
      cityId: cidade.id,
    },
  });

  const alunoDemo = await prisma.user.create({
    data: {
      nome: "Aluno Demo",
      email: "alunodemo@demo.com",
      senha: senhaPadrao,
      role: "student",
      status: "active",
      cpf: "30000000001",
      phone: "84977770001",
      institution: "UFERSA",
      cityId: cidade.id,
    },
  });

  const alunoLimpo = await prisma.user.create({
    data: {
      nome: "Aluno Limpo",
      email: "alunolimpo@demo.com",
      senha: senhaPadrao,
      role: "student",
      status: "active",
      cpf: "30000000002",
      phone: "84977770002",
      institution: "UFERSA",
      cityId: cidade.id,
    },
  });

  const pontoIdaCentro = await prisma.pickupPoint.create({
    data: {
      name: "Praça Central",
      address: "Centro de Riacho da Cruz",
      type: "ida",
      active: true,
      latitude: -5.926,
      longitude: -37.947,
      cityId: cidade.id,
    },
  });

  const pontoIdaRodoviaria = await prisma.pickupPoint.create({
    data: {
      name: "Terminal Rodoviário",
      address: "Rodoviária Municipal",
      type: "ida",
      active: true,
      latitude: -5.928,
      longitude: -37.949,
      cityId: cidade.id,
    },
  });

  const pontoVoltaUfersa = await prisma.pickupPoint.create({
    data: {
      name: "UFERSA - Portão Principal",
      address: "Campus Pau dos Ferros",
      type: "volta",
      active: true,
      universityId: universidade.id,
      cityId: cidade.id,
    },
  });

  const pontoVoltaBiblioteca = await prisma.pickupPoint.create({
    data: {
      name: "UFERSA - Biblioteca",
      address: "Campus Pau dos Ferros",
      type: "volta",
      active: true,
      universityId: universidade.id,
      cityId: cidade.id,
    },
  });

  const veiculoDemo = await prisma.vehicle.create({
    data: {
      plate: "DEM0A01",
      name: "Ônibus Demo",
      model: "Mercedes-Benz OF-1721",
      capacity: 44,
      active: true,
      cityId: cidade.id,
    },
  });

  await prisma.vehicle.create({
    data: {
      plate: "LMP0A02",
      name: "Ônibus Limpo",
      model: "Volare W9",
      capacity: 28,
      active: true,
      cityId: cidade.id,
    },
  });

  const idaManha = await prisma.schedule.create({
    data: {
      time: "06:00",
      type: "ida",
      active: true,
      universityId: universidade.id,
    },
  });

  const voltaManha = await prisma.schedule.create({
    data: {
      time: "11:40",
      type: "volta",
      active: true,
      universityId: universidade.id,
    },
  });

  const idaNoite = await prisma.schedule.create({
    data: {
      time: "18:00",
      type: "ida",
      active: true,
      universityId: universidade.id,
    },
  });

  const voltaNoite = await prisma.schedule.create({
    data: {
      time: "22:10",
      type: "volta",
      active: true,
      universityId: universidade.id,
    },
  });

  const rotaIdaManha = await prisma.transportRoute.create({
    data: {
      name: "Riacho da Cruz → UFERSA | Manhã",
      cityId: cidade.id,
      scheduleId: idaManha.id,
      vehicleId: veiculoDemo.id,
      driverId: motoristaDemo.id,
      active: true,
    },
  });

  const rotaVoltaManha = await prisma.transportRoute.create({
    data: {
      name: "UFERSA → Riacho da Cruz | Manhã",
      cityId: cidade.id,
      scheduleId: voltaManha.id,
      vehicleId: veiculoDemo.id,
      driverId: motoristaDemo.id,
      active: true,
    },
  });

  const rotaIdaNoite = await prisma.transportRoute.create({
    data: {
      name: "Riacho da Cruz → UFERSA | Noite",
      cityId: cidade.id,
      scheduleId: idaNoite.id,
      vehicleId: veiculoDemo.id,
      driverId: motoristaDemo.id,
      active: true,
    },
  });

  const rotaVoltaNoite = await prisma.transportRoute.create({
    data: {
      name: "UFERSA → Riacho da Cruz | Noite",
      cityId: cidade.id,
      scheduleId: voltaNoite.id,
      vehicleId: veiculoDemo.id,
      driverId: motoristaDemo.id,
      active: true,
    },
  });

  await prisma.routePoint.createMany({
    data: [
      { routeId: rotaIdaManha.id, pickupPointId: pontoIdaCentro.id, order: 1 },
      { routeId: rotaIdaManha.id, pickupPointId: pontoIdaRodoviaria.id, order: 2 },
      { routeId: rotaVoltaManha.id, pickupPointId: pontoVoltaUfersa.id, order: 1 },
      { routeId: rotaVoltaManha.id, pickupPointId: pontoVoltaBiblioteca.id, order: 2 },
      { routeId: rotaIdaNoite.id, pickupPointId: pontoIdaCentro.id, order: 1 },
      { routeId: rotaIdaNoite.id, pickupPointId: pontoIdaRodoviaria.id, order: 2 },
      { routeId: rotaVoltaNoite.id, pickupPointId: pontoVoltaUfersa.id, order: 1 },
      { routeId: rotaVoltaNoite.id, pickupPointId: pontoVoltaBiblioteca.id, order: 2 },
    ],
  });

  await prisma.reservation.createMany({
    data: [
      {
        userId: alunoDemo.id,
        scheduleId: idaManha.id,
        routeId: rotaIdaManha.id,
        pickupPointId: pontoIdaCentro.id,
        dayOfWeek: "Segunda",
        status: "pending",
      },
      {
        userId: alunoDemo.id,
        scheduleId: voltaManha.id,
        routeId: rotaVoltaManha.id,
        pickupPointId: pontoVoltaUfersa.id,
        dayOfWeek: "Segunda",
        status: "pending",
      },
      {
        userId: alunoDemo.id,
        scheduleId: idaNoite.id,
        routeId: rotaIdaNoite.id,
        pickupPointId: pontoIdaRodoviaria.id,
        dayOfWeek: "Terça",
        status: "confirmed",
      },
      {
        userId: alunoDemo.id,
        scheduleId: voltaNoite.id,
        routeId: rotaVoltaNoite.id,
        pickupPointId: pontoVoltaBiblioteca.id,
        dayOfWeek: "Terça",
        status: "canceled",
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: alunoDemo.id,
        title: "Confirmação pendente",
        message: "Você possui viagens aguardando confirmação para segunda-feira.",
        type: "warning",
        link: "/aluno/notificacoes",
        metadata: {
          source: "reservation_pending",
          senderRole: "system",
        },
      },
      {
        userId: motoristaDemo.id,
        title: "Rota atribuída",
        message: "Você foi vinculado às rotas demo da UFERSA.",
        type: "info",
        link: "/motorista/notificacoes",
        metadata: {
          source: "admin_route_assignment",
          senderRole: "admin",
          senderId: adminDemo.id,
        },
      },
      {
        userId: adminDemo.id,
        title: "Ambiente demo preparado",
        message: "O seed criou usuários, rotas, horários, veículo e reservas de teste.",
        type: "success",
        link: "/admin",
        metadata: {
          source: "seed_demo_ready",
          senderRole: "system",
        },
      },
      {
        userId: alunoLimpo.id,
        title: "Bem-vindo ao OesteGoU",
        message: "Seu usuário limpo está pronto para testar cadastro de horários do zero.",
        type: "info",
        link: "/aluno/notificacoes",
        metadata: {
          source: "seed_clean_user",
          senderRole: "system",
        },
      },
    ],
  });

  const pdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 30 80 Td (Documento demo OesteGoU) Tj ET\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
  );

  await prisma.userDocument.createMany({
    data: [
      {
        userId: alunoDemo.id,
        type: "enrollment_proof",
        status: "pending",
        fileName: "matricula-aluno-demo.pdf",
        fileData: pdfBuffer,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        moderationStatus: "pending",
      },
      {
        userId: motoristaDemo.id,
        type: "driver_license",
        status: "approved",
        fileName: "cnh-motorista-demo.pdf",
        fileData: pdfBuffer,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        moderationStatus: "approved",
      },
    ],
  });

  await prisma.auditLog.create({
  data: {
    userId: adminDemo.id,
    cityId: cidade.id,
    action: "create",
    entity: "Database",
    entityId: 1,
    description: "Seed demo simplificado executado com sucesso",
    metadata: {
      users: {
        adminDemo: "admindemo@demo.com",
        adminLimpo: "adminlimpo@demo.com",
        alunoDemo: "alunodemo@demo.com",
        alunoLimpo: "alunolimpo@demo.com",
        motoristaDemo: "motoristademo@demo.com",
        motoristaLimpo: "motoristalimpo@demo.com",
      },
    },
  },
});

  console.log("Seed simplificado executado com sucesso.");
  console.table([
    { perfil: "Admin Demo", email: "admindemo@demo.com", senha: "12345678" },
    { perfil: "Admin Limpo", email: "adminlimpo@demo.com", senha: "12345678" },
    { perfil: "Aluno Demo", email: "alunodemo@demo.com", senha: "12345678" },
    { perfil: "Aluno Limpo", email: "alunolimpo@demo.com", senha: "12345678" },
    { perfil: "Motorista Demo", email: "motoristademo@demo.com", senha: "12345678" },
    { perfil: "Motorista Limpo", email: "motoristalimpo@demo.com", senha: "12345678" },
  ]);
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });