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

async function createUser(passwordHash: string, data: any) {
  return prisma.user.create({
    data: {
      senha: passwordHash,
      status: "active",
      ...data,
    },
  });
}

async function createSchedulePair(universityId: number, goingTime: string, returnTime: string) {
  const going = await prisma.schedule.create({
    data: {
      time: goingTime,
      type: "ida",
      active: true,
      universityId,
    },
  });

  const returning = await prisma.schedule.create({
    data: {
      time: returnTime,
      type: "volta",
      active: true,
      universityId,
    },
  });

  return { going, returning };
}

async function attachPoints(routeId: number, pointIds: number[]) {
  await prisma.routePoint.createMany({
    data: pointIds.map((pickupPointId, index) => ({
      routeId,
      pickupPointId,
      order: index + 1,
    })),
  });
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

  const taboleiro = await prisma.city.create({
    data: { name: "Taboleiro Grande", state: "RN" },
  });

  const mossoro = await prisma.city.create({
    data: { name: "Mossoró", state: "RN" },
  });

  const adminRiacho = await createUser(senhaPadrao, {
    nome: "Administrador Riacho",
    email: "admin@demo.com",
    role: "admin",
    cpf: "10000000001",
    phone: "84999990001",
    cityId: riacho.id,
  });

  const adminApodi = await createUser(senhaPadrao, {
    nome: "Administrador Apodi",
    email: "admin.apodi@demo.com",
    role: "admin",
    cpf: "10000000002",
    phone: "84999990002",
    cityId: apodi.id,
  });

  const adminPau = await createUser(senhaPadrao, {
    nome: "Administrador Pau dos Ferros",
    email: "admin.pau@demo.com",
    role: "admin",
    cpf: "10000000003",
    phone: "84999990003",
    cityId: pauDosFerros.id,
  });

  const adminTaboleiro = await createUser(senhaPadrao, {
    nome: "Administrador Taboleiro",
    email: "admin.taboleiro@demo.com",
    role: "admin",
    cpf: "10000000004",
    phone: "84999990004",
    cityId: taboleiro.id,
  });

  const motoristaCarlos = await createUser(senhaPadrao, {
    nome: "Carlos Motorista",
    email: "motorista1@demo.com",
    role: "driver",
    cpf: "20000000001",
    phone: "84988880001",
    cityId: riacho.id,
  });

  const motoristaJoao = await createUser(senhaPadrao, {
    nome: "João Condutor",
    email: "motorista2@demo.com",
    role: "driver",
    cpf: "20000000002",
    phone: "84988880002",
    cityId: riacho.id,
  });

  const motoristaMarcos = await createUser(senhaPadrao, {
    nome: "Marcos Transporte",
    email: "motorista3@demo.com",
    role: "driver",
    cpf: "20000000003",
    phone: "84988880003",
    cityId: pauDosFerros.id,
  });

  const motoristaApodi = await createUser(senhaPadrao, {
    nome: "Francisco Apodi",
    email: "motorista.apodi@demo.com",
    role: "driver",
    cpf: "20000000004",
    phone: "84988880004",
    cityId: apodi.id,
  });

  const motoristaInativo = await createUser(senhaPadrao, {
    nome: "Motorista Inativo",
    email: "motorista.inativo@demo.com",
    role: "driver",
    status: "inactive",
    cpf: "20000000005",
    phone: "84988880005",
    cityId: riacho.id,
  });

  const alunoAna = await createUser(senhaPadrao, {
    nome: "Ana Beatriz",
    email: "aluno1@demo.com",
    role: "student",
    cpf: "30000000001",
    phone: "84977770001",
    institution: "UFERSA",
    cityId: riacho.id,
  });

  const alunoPedro = await createUser(senhaPadrao, {
    nome: "Pedro Henrique",
    email: "aluno2@demo.com",
    role: "student",
    cpf: "30000000002",
    phone: "84977770002",
    institution: "UERN",
    cityId: riacho.id,
  });

  const alunoMaria = await createUser(senhaPadrao, {
    nome: "Maria Clara",
    email: "aluno3@demo.com",
    role: "student",
    status: "pending",
    cpf: "30000000003",
    phone: "84977770003",
    institution: "IFRN",
    cityId: riacho.id,
  });

  const alunoLucas = await createUser(senhaPadrao, {
    nome: "Lucas Gabriel",
    email: "aluno4@demo.com",
    role: "student",
    cpf: "30000000004",
    phone: "84977770004",
    institution: "UFERSA",
    cityId: pauDosFerros.id,
  });

  const alunoTeste = await createUser(senhaPadrao, {
    nome: "Aluno Teste Sem Horário",
    email: "aluno.teste@demo.com",
    role: "student",
    cpf: "30000000005",
    phone: "84977770005",
    institution: "UFERSA",
    cityId: riacho.id,
  });

  const alunoBloqueado = await createUser(senhaPadrao, {
    nome: "Aluno Bloqueado",
    email: "aluno.bloqueado@demo.com",
    role: "student",
    status: "blocked",
    cpf: "30000000006",
    phone: "84977770006",
    institution: "UERN",
    cityId: riacho.id,
  });

  const alunoApodi = await createUser(senhaPadrao, {
    nome: "Aluno Apodi",
    email: "aluno.apodi@demo.com",
    role: "student",
    cpf: "30000000007",
    phone: "84977770007",
    institution: "IFRN",
    cityId: apodi.id,
  });

  const ufersa = await prisma.university.create({
    data: {
      name: "UFERSA - Campus Pau dos Ferros",
      cityName: "Pau dos Ferros",
      cityId: pauDosFerros.id,
    },
  });

  const uern = await prisma.university.create({
    data: {
      name: "UERN - Campus Pau dos Ferros",
      cityName: "Pau dos Ferros",
      cityId: pauDosFerros.id,
    },
  });

  const ifrnApodi = await prisma.university.create({
    data: {
      name: "IFRN - Campus Apodi",
      cityName: "Apodi",
      cityId: apodi.id,
    },
  });

  const unpMossoro = await prisma.university.create({
    data: {
      name: "UNP - Polo Mossoró",
      cityName: "Mossoró",
      cityId: mossoro.id,
    },
  });

  const faculdadeTeste = await prisma.university.create({
    data: {
      name: "Faculdade Teste - Rota Incompleta",
      cityName: "Pau dos Ferros",
      cityId: pauDosFerros.id,
    },
  });

  const riachoIdaCentro = await prisma.pickupPoint.create({
    data: {
      name: "Praça Central",
      address: "Centro",
      type: "ida",
      latitude: -5.926,
      longitude: -37.947,
      cityId: riacho.id,
    },
  });

  const riachoIdaPosto = await prisma.pickupPoint.create({
    data: {
      name: "Posto Oeste",
      address: "Entrada da cidade",
      type: "ida",
      latitude: -5.927,
      longitude: -37.951,
      cityId: riacho.id,
    },
  });

  const riachoIdaRodoviaria = await prisma.pickupPoint.create({
    data: {
      name: "Terminal Rodoviário",
      address: "Rodoviária",
      type: "ida",
      latitude: -5.928,
      longitude: -37.949,
      cityId: riacho.id,
    },
  });

  const riachoVoltaUfersaPortao = await prisma.pickupPoint.create({
    data: {
      name: "UFERSA - Portão Principal",
      address: "Campus Pau dos Ferros",
      type: "volta",
      universityId: ufersa.id,
      cityId: riacho.id,
    },
  });

  const riachoVoltaUfersaBiblioteca = await prisma.pickupPoint.create({
    data: {
      name: "UFERSA - Biblioteca",
      address: "Campus Pau dos Ferros",
      type: "volta",
      universityId: ufersa.id,
      cityId: riacho.id,
    },
  });

  const riachoVoltaUernEntrada = await prisma.pickupPoint.create({
    data: {
      name: "UERN - Entrada Principal",
      address: "Campus Pau dos Ferros",
      type: "volta",
      universityId: uern.id,
      cityId: riacho.id,
    },
  });

  const riachoVoltaIfrnEntrada = await prisma.pickupPoint.create({
    data: {
      name: "IFRN Apodi - Entrada Principal",
      address: "Campus Apodi",
      type: "volta",
      universityId: ifrnApodi.id,
      cityId: riacho.id,
    },
  });

  const pauIdaPraca = await prisma.pickupPoint.create({
    data: {
      name: "Praça da Matriz - Pau dos Ferros",
      address: "Centro",
      type: "ida",
      cityId: pauDosFerros.id,
    },
  });

  const pauIdaRodoviaria = await prisma.pickupPoint.create({
    data: {
      name: "Rodoviária - Pau dos Ferros",
      address: "Rodoviária",
      type: "ida",
      cityId: pauDosFerros.id,
    },
  });

  const pauVoltaUfersa = await prisma.pickupPoint.create({
    data: {
      name: "UFERSA - Saída Lateral",
      address: "Campus Pau dos Ferros",
      type: "volta",
      universityId: ufersa.id,
      cityId: pauDosFerros.id,
    },
  });

  const apodiIdaCentro = await prisma.pickupPoint.create({
    data: {
      name: "Praça Robson Lopes - Apodi",
      address: "Centro",
      type: "ida",
      cityId: apodi.id,
    },
  });

  const apodiVoltaIfrn = await prisma.pickupPoint.create({
    data: {
      name: "IFRN Apodi - Portaria",
      address: "Campus Apodi",
      type: "volta",
      universityId: ifrnApodi.id,
      cityId: apodi.id,
    },
  });

  const busRiacho01 = await prisma.vehicle.create({
    data: {
      plate: "ABC1D23",
      name: "Ônibus 01",
      model: "Mercedes-Benz OF-1721",
      capacity: 44,
      active: true,
      cityId: riacho.id,
    },
  });

  const busRiacho02 = await prisma.vehicle.create({
    data: {
      plate: "DEF4G56",
      name: "Micro-ônibus 02",
      model: "Volare W9",
      capacity: 28,
      active: true,
      cityId: riacho.id,
    },
  });

  const busRiachoReserva = await prisma.vehicle.create({
    data: {
      plate: "HIJ7K89",
      name: "Reserva 03",
      model: "Marcopolo Torino",
      capacity: 40,
      active: false,
      cityId: riacho.id,
    },
  });

  const busPau01 = await prisma.vehicle.create({
    data: {
      plate: "PFD2A10",
      name: "Ônibus Pau 01",
      model: "Caio Apache",
      capacity: 42,
      active: true,
      cityId: pauDosFerros.id,
    },
  });

  const busApodi01 = await prisma.vehicle.create({
    data: {
      plate: "APD7B20",
      name: "Ônibus Apodi 01",
      model: "Volare Fly",
      capacity: 36,
      active: true,
      cityId: apodi.id,
    },
  });

  const ufersaManha = await createSchedulePair(ufersa.id, "06:00", "11:40");
  const ufersaTarde = await createSchedulePair(ufersa.id, "12:20", "17:50");
  const ufersaNoite = await createSchedulePair(ufersa.id, "18:00", "22:10");

  const uernManha = await createSchedulePair(uern.id, "06:30", "11:30");
  const uernTarde = await createSchedulePair(uern.id, "12:30", "17:40");
  const uernNoite = await createSchedulePair(uern.id, "18:10", "22:00");

  const ifrnManha = await createSchedulePair(ifrnApodi.id, "06:10", "11:20");
  const ifrnTarde = await createSchedulePair(ifrnApodi.id, "12:40", "17:30");

  const unpNoite = await createSchedulePair(unpMossoro.id, "17:50", "22:30");

  const incompletoIda = await prisma.schedule.create({
    data: {
      time: "06:15",
      type: "ida",
      active: true,
      universityId: faculdadeTeste.id,
    },
  });

  async function createRoute(
    name: string,
    cityId: number,
    scheduleId: number,
    vehicleId: number,
    driverId: number | null,
    pointIds: number[],
    active = true,
  ) {
    const route = await prisma.transportRoute.create({
      data: {
        name,
        cityId,
        scheduleId,
        vehicleId,
        driverId,
        active,
      },
    });

    await attachPoints(route.id, pointIds);
    return route;
  }

  const rUfersaManhaIda = await createRoute(
    "Riacho da Cruz → UFERSA | Manhã",
    riacho.id,
    ufersaManha.going.id,
    busRiacho01.id,
    motoristaCarlos.id,
    [riachoIdaCentro.id, riachoIdaPosto.id, riachoIdaRodoviaria.id],
  );

  const rUfersaManhaVolta = await createRoute(
    "UFERSA → Riacho da Cruz | Manhã",
    riacho.id,
    ufersaManha.returning.id,
    busRiacho01.id,
    motoristaCarlos.id,
    [riachoVoltaUfersaPortao.id, riachoVoltaUfersaBiblioteca.id],
  );

  const rUfersaTardeIda = await createRoute(
    "Riacho da Cruz → UFERSA | Tarde",
    riacho.id,
    ufersaTarde.going.id,
    busRiacho02.id,
    motoristaJoao.id,
    [riachoIdaCentro.id, riachoIdaPosto.id],
  );

  const rUfersaTardeVolta = await createRoute(
    "UFERSA → Riacho da Cruz | Tarde",
    riacho.id,
    ufersaTarde.returning.id,
    busRiacho02.id,
    motoristaJoao.id,
    [riachoVoltaUfersaPortao.id],
  );

  const rUfersaNoiteIda = await createRoute(
    "Riacho da Cruz → UFERSA | Noite",
    riacho.id,
    ufersaNoite.going.id,
    busRiacho01.id,
    motoristaCarlos.id,
    [riachoIdaCentro.id, riachoIdaPosto.id, riachoIdaRodoviaria.id],
  );

  const rUfersaNoiteVolta = await createRoute(
    "UFERSA → Riacho da Cruz | Noite",
    riacho.id,
    ufersaNoite.returning.id,
    busRiacho01.id,
    motoristaCarlos.id,
    [riachoVoltaUfersaPortao.id, riachoVoltaUfersaBiblioteca.id],
  );

  const rUernManhaIda = await createRoute(
    "Riacho da Cruz → UERN | Manhã",
    riacho.id,
    uernManha.going.id,
    busRiacho02.id,
    motoristaJoao.id,
    [riachoIdaCentro.id, riachoIdaRodoviaria.id],
  );

  const rUernManhaVolta = await createRoute(
    "UERN → Riacho da Cruz | Manhã",
    riacho.id,
    uernManha.returning.id,
    busRiacho02.id,
    motoristaJoao.id,
    [riachoVoltaUernEntrada.id],
  );

  const rUernTardeIda = await createRoute(
    "Riacho da Cruz → UERN | Tarde",
    riacho.id,
    uernTarde.going.id,
    busRiacho02.id,
    motoristaJoao.id,
    [riachoIdaCentro.id, riachoIdaPosto.id],
  );

  const rUernTardeVolta = await createRoute(
    "UERN → Riacho da Cruz | Tarde",
    riacho.id,
    uernTarde.returning.id,
    busRiacho02.id,
    motoristaJoao.id,
    [riachoVoltaUernEntrada.id],
  );

  const rUernNoiteIda = await createRoute(
    "Riacho da Cruz → UERN | Noite",
    riacho.id,
    uernNoite.going.id,
    busRiacho02.id,
    motoristaJoao.id,
    [riachoIdaPosto.id],
  );

  const rUernNoiteVolta = await createRoute(
    "UERN → Riacho da Cruz | Noite",
    riacho.id,
    uernNoite.returning.id,
    busRiacho02.id,
    motoristaJoao.id,
    [riachoVoltaUernEntrada.id],
  );

  const rIfrnManhaIda = await createRoute(
    "Riacho da Cruz → IFRN Apodi | Manhã",
    riacho.id,
    ifrnManha.going.id,
    busRiacho01.id,
    motoristaCarlos.id,
    [riachoIdaCentro.id],
  );

  const rIfrnManhaVolta = await createRoute(
    "IFRN Apodi → Riacho da Cruz | Manhã",
    riacho.id,
    ifrnManha.returning.id,
    busRiacho01.id,
    motoristaCarlos.id,
    [riachoVoltaIfrnEntrada.id],
  );

  const rIfrnTardeIda = await createRoute(
    "Riacho da Cruz → IFRN Apodi | Tarde",
    riacho.id,
    ifrnTarde.going.id,
    busRiachoReserva.id,
    null,
    [riachoIdaCentro.id],
  );

  const rIfrnTardeVolta = await createRoute(
    "IFRN Apodi → Riacho da Cruz | Tarde",
    riacho.id,
    ifrnTarde.returning.id,
    busRiachoReserva.id,
    null,
    [riachoVoltaIfrnEntrada.id],
  );

  const rUnpNoiteIda = await createRoute(
    "Riacho da Cruz → UNP Mossoró | Noite",
    riacho.id,
    unpNoite.going.id,
    busRiacho01.id,
    motoristaCarlos.id,
    [riachoIdaCentro.id, riachoIdaPosto.id],
  );

  const rUnpNoiteVolta = await createRoute(
    "UNP Mossoró → Riacho da Cruz | Noite",
    riacho.id,
    unpNoite.returning.id,
    busRiacho01.id,
    motoristaCarlos.id,
    [riachoVoltaUfersaPortao.id],
  );

  await createRoute(
    "Riacho da Cruz → Faculdade Teste | Incompleta",
    riacho.id,
    incompletoIda.id,
    busRiacho01.id,
    motoristaCarlos.id,
    [riachoIdaCentro.id],
  );

  await createRoute(
    "Pau dos Ferros → UFERSA | Manhã",
    pauDosFerros.id,
    ufersaManha.going.id,
    busPau01.id,
    motoristaMarcos.id,
    [pauIdaPraca.id, pauIdaRodoviaria.id],
  );

  await createRoute(
    "UFERSA → Pau dos Ferros | Manhã",
    pauDosFerros.id,
    ufersaManha.returning.id,
    busPau01.id,
    motoristaMarcos.id,
    [pauVoltaUfersa.id],
  );

  await createRoute(
    "Apodi → IFRN Apodi | Manhã",
    apodi.id,
    ifrnManha.going.id,
    busApodi01.id,
    motoristaApodi.id,
    [apodiIdaCentro.id],
  );

  await createRoute(
    "IFRN Apodi → Apodi | Manhã",
    apodi.id,
    ifrnManha.returning.id,
    busApodi01.id,
    motoristaApodi.id,
    [apodiVoltaIfrn.id],
  );

  await prisma.reservation.createMany({
    data: [
      {
        userId: alunoAna.id,
        scheduleId: ufersaManha.going.id,
        routeId: rUfersaManhaIda.id,
        pickupPointId: riachoIdaCentro.id,
        dayOfWeek: "Segunda",
        status: "confirmed",
      },
      {
        userId: alunoAna.id,
        scheduleId: ufersaManha.returning.id,
        routeId: rUfersaManhaVolta.id,
        pickupPointId: riachoVoltaUfersaPortao.id,
        dayOfWeek: "Segunda",
        status: "confirmed",
      },
      {
        userId: alunoPedro.id,
        scheduleId: uernNoite.going.id,
        routeId: rUernNoiteIda.id,
        pickupPointId: riachoIdaPosto.id,
        dayOfWeek: "Terça",
        status: "confirmed",
      },
      {
        userId: alunoPedro.id,
        scheduleId: uernNoite.returning.id,
        routeId: rUernNoiteVolta.id,
        pickupPointId: riachoVoltaUernEntrada.id,
        dayOfWeek: "Terça",
        status: "confirmed",
      },
      {
        userId: alunoAna.id,
        scheduleId: ufersaTarde.going.id,
        routeId: rUfersaTardeIda.id,
        pickupPointId: riachoIdaPosto.id,
        dayOfWeek: "Quarta",
        status: "canceled",
      },
      {
        userId: alunoAna.id,
        scheduleId: ufersaTarde.returning.id,
        routeId: rUfersaTardeVolta.id,
        pickupPointId: riachoVoltaUfersaPortao.id,
        dayOfWeek: "Quarta",
        status: "canceled",
      },
      {
        userId: alunoLucas.id,
        scheduleId: ufersaManha.going.id,
        routeId: rUfersaManhaIda.id,
        pickupPointId: riachoIdaCentro.id,
        dayOfWeek: "Sexta",
        status: "confirmed",
      },
      {
        userId: alunoApodi.id,
        scheduleId: ifrnManha.going.id,
        routeId: rIfrnManhaIda.id,
        pickupPointId: riachoIdaCentro.id,
        dayOfWeek: "Segunda",
        status: "confirmed",
      },
      {
        userId: alunoApodi.id,
        scheduleId: ifrnManha.returning.id,
        routeId: rIfrnManhaVolta.id,
        pickupPointId: riachoVoltaIfrnEntrada.id,
        dayOfWeek: "Segunda",
        status: "confirmed",
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: alunoAna.id,
        title: "Conta aprovada",
        message: "Sua conta foi aprovada pela administração.",
        type: "success",
        link: "/student/horarios",
      },
      {
        userId: alunoPedro.id,
        title: "Viagem confirmada",
        message: "Sua reserva foi confirmada com sucesso.",
        type: "success",
        link: "/student/horarios",
      },
      {
        userId: motoristaCarlos.id,
        title: "Rota atribuída",
        message: "Você foi vinculado às rotas da UFERSA.",
        type: "info",
        link: "/driver/routes",
      },
      {
        userId: motoristaJoao.id,
        title: "Rotas da UERN",
        message: "Você foi vinculado às rotas da UERN.",
        type: "info",
        link: "/driver/routes",
      },
      {
        userId: adminRiacho.id,
        title: "Documentos pendentes",
        message: "Existem documentos aguardando análise.",
        type: "warning",
        link: "/admin/documentos",
      },
      {
        userId: alunoTeste.id,
        title: "Bem-vindo ao OesteGoU",
        message: "Sua conta está pronta para testar criação de horários.",
        type: "info",
        link: "/aluno/horarios",
      },
    ],
  });

  const pdfBuffer = Buffer.from("PDF demo OesteGoU");
  const jpgBuffer = Buffer.from("JPEG demo OesteGoU");

  await prisma.userDocument.createMany({
    data: [
      {
        userId: alunoAna.id,
        type: "profile_photo",
        status: "approved",
        fileName: "foto-ana.jpg",
        fileData: jpgBuffer,
        mimeType: "image/jpeg",
        sizeBytes: jpgBuffer.length,
        moderationStatus: "approved",
      },
      {
        userId: alunoAna.id,
        type: "enrollment_proof",
        status: "pending",
        fileName: "matricula-ana.pdf",
        fileData: pdfBuffer,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        moderationStatus: "pending",
      },
      {
        userId: alunoPedro.id,
        type: "enrollment_proof",
        status: "approved",
        fileName: "matricula-pedro.pdf",
        fileData: pdfBuffer,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        moderationStatus: "approved",
      },
      {
        userId: alunoMaria.id,
        type: "enrollment_proof",
        status: "rejected",
        fileName: "matricula-maria.pdf",
        fileData: pdfBuffer,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        moderationStatus: "rejected",
        moderationReason: "Documento ilegível",
      },
      {
        userId: alunoTeste.id,
        type: "enrollment_proof",
        status: "pending",
        fileName: "matricula-aluno-teste.pdf",
        fileData: pdfBuffer,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        moderationStatus: "pending",
      },
      {
        userId: motoristaCarlos.id,
        type: "driver_license",
        status: "approved",
        fileName: "cnh-carlos.pdf",
        fileData: pdfBuffer,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        moderationStatus: "approved",
      },
      {
        userId: motoristaJoao.id,
        type: "driver_license",
        status: "pending",
        fileName: "cnh-joao.pdf",
        fileData: pdfBuffer,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        moderationStatus: "pending",
      },
      {
        userId: motoristaMarcos.id,
        type: "driver_license",
        status: "rejected",
        fileName: "cnh-marcos.pdf",
        fileData: pdfBuffer,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        moderationStatus: "rejected",
        moderationReason: "CNH vencida",
      },
    ],
  });

  await prisma.cityAgreement.createMany({
    data: [
      {
        requesterCityId: riacho.id,
        partnerCityId: pauDosFerros.id,
        status: "active",
        title: "Convênio Riacho/Pau dos Ferros",
        description: "Permite rotas integradas para universidades em Pau dos Ferros.",
        requestedById: adminRiacho.id,
        approvedById: adminPau.id,
      },
      {
        requesterCityId: riacho.id,
        partnerCityId: apodi.id,
        status: "active",
        title: "Convênio Riacho/Apodi",
        description: "Permite rotas integradas para IFRN Apodi.",
        requestedById: adminRiacho.id,
        approvedById: adminApodi.id,
      },
      {
        requesterCityId: taboleiro.id,
        partnerCityId: riacho.id,
        status: "pending",
        title: "Convênio pendente",
        description: "Exemplo de convênio aguardando aprovação.",
        requestedById: adminTaboleiro.id,
      },
      {
        requesterCityId: apodi.id,
        partnerCityId: pauDosFerros.id,
        status: "inactive",
        title: "Convênio inativo",
        description: "Exemplo de convênio inativo para testes.",
        requestedById: adminApodi.id,
      },
    ],
  });

  await prisma.pushSendLog.create({
    data: {
      title: "Aviso geral",
      message: "Confira os horários atualizados no sistema.",
      url: "/admin/horarios",
      target: "all",
      sentById: adminRiacho.id,
      cityId: riacho.id,
      recipients: 9,
    },
  });

  await prisma.analyticsEvent.createMany({
    data: [
      {
        userId: adminRiacho.id,
        event: "LOGIN",
        metadata: { role: "admin" },
      },
      {
        userId: alunoAna.id,
        event: "RESERVATION_CREATED",
        metadata: { routeId: rUfersaManhaIda.id, dayOfWeek: "Segunda" },
      },
      {
        userId: alunoPedro.id,
        event: "RESERVATION_CREATED",
        metadata: { routeId: rUernNoiteIda.id, dayOfWeek: "Terça" },
      },
      {
        userId: alunoTeste.id,
        event: "TEST_USER_CREATED",
        metadata: { readyForRoundTripTests: true },
      },
      {
        userId: alunoPedro.id,
        event: "UPLOAD_CREATED",
        metadata: { type: "enrollment_proof" },
      },
    ],
  });

  console.log("Seed massivo concluído com sucesso!");
  console.table([
    { perfil: "Admin Riacho", email: "admin@demo.com", senha: "12345678", tipo: "admin" },
    { perfil: "Admin Apodi", email: "admin.apodi@demo.com", senha: "12345678", tipo: "admin" },
    { perfil: "Admin Pau dos Ferros", email: "admin.pau@demo.com", senha: "12345678", tipo: "admin" },
    { perfil: "Admin Taboleiro", email: "admin.taboleiro@demo.com", senha: "12345678", tipo: "admin" },
    { perfil: "Aluno com horários", email: "aluno1@demo.com", senha: "12345678", tipo: "student" },
    { perfil: "Aluno UERN", email: "aluno2@demo.com", senha: "12345678", tipo: "student" },
    { perfil: "Aluno pendente", email: "aluno3@demo.com", senha: "12345678", tipo: "student" },
    { perfil: "Aluno limpo para testes", email: "aluno.teste@demo.com", senha: "12345678", tipo: "student" },
    { perfil: "Motorista Carlos", email: "motorista1@demo.com", senha: "12345678", tipo: "driver" },
    { perfil: "Motorista João", email: "motorista2@demo.com", senha: "12345678", tipo: "driver" },
    { perfil: "Motorista Apodi", email: "motorista.apodi@demo.com", senha: "12345678", tipo: "driver" },
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