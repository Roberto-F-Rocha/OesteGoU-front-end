import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

function maskCpf(cpf) {
  if (!cpf) return null;
  return cpf.slice(0, 3) + "***" + cpf.slice(-2);
}

function maskPhone(phone) {
  if (!phone) return null;
  return phone.slice(0, 2) + "*****" + phone.slice(-2);
}

function ensureAdmin(req, res) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Acesso permitido apenas para administradores" });
    return false;
  }

  if (!req.user?.cityId) {
    res.status(403).json({ error: "Administrador sem cidade definida" });
    return false;
  }

  return true;
}

function parseId(value) {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

export async function getAdminDashboard(req, res) {
  if (!ensureAdmin(req, res)) return;

  const cityIds = req.allowedCities ?? [req.user.cityId];

  const [students, drivers, admins, vehicles, routes, reservations, pendingUsers, activeAgreements] = await Promise.all([
    prisma.user.count({ where: { role: "student", cityId: { in: cityIds } } }),
    prisma.user.count({ where: { role: "driver", cityId: { in: cityIds } } }),
    prisma.user.count({ where: { role: "admin", cityId: { in: cityIds } } }),
    prisma.vehicle.count({ where: { cityId: { in: cityIds } } }),
    prisma.transportRoute.count({ where: { cityId: { in: cityIds } } }),
    prisma.reservation.count({ where: { user: { cityId: { in: cityIds } }, status: "confirmed" } }),
    prisma.user.count({ where: { cityId: { in: cityIds }, status: "pending" } }),
    prisma.cityAgreement.count({
      where: {
        status: "active",
        OR: [
          { requesterCityId: req.user.cityId },
          { partnerCityId: req.user.cityId },
        ],
      },
    }),
  ]);

  return res.json({
    students,
    drivers,
    admins,
    vehicles,
    routes,
    reservations,
    pendingUsers,
    activeAgreements,
    allowedCities: cityIds,
  });
}

export async function listAdminUsers(req, res) {
  if (!ensureAdmin(req, res)) return;

  const cityIds = req.allowedCities ?? [req.user.cityId];
  const { role, status, cityId } = req.query;

  const targetCityIds = cityId ? [Number(cityId)] : cityIds;

  const users = await prisma.user.findMany({
    where: {
      cityId: { in: targetCityIds },
      ...(role ? { role: String(role) as any } : {}),
      ...(status ? { status: String(status) as any } : {}),
    },
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      status: true,
      cpf: true,
      phone: true,
      institution: true,
      city: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(
    users.map((u) => ({
      ...u,
      cpf: maskCpf(u.cpf),
      phone: maskPhone(u.phone),
    }))
  );
}

export async function updateUserStatus(req, res) {
  if (!ensureAdmin(req, res)) return;

  const id = parseId(req.params.id);
  const { status } = req.body;
  const validStatuses = ["active", "pending", "inactive", "blocked"];

  if (!id) return res.status(400).json({ error: "ID inválido" });
  if (!validStatuses.includes(status)) return res.status(400).json({ error: "Status inválido" });

  const cityIds = req.allowedCities ?? [req.user.cityId];

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user || !user.cityId || !cityIds.includes(user.cityId)) {
    return res.status(404).json({ error: "Usuário não encontrado para sua cidade" });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
    select: { id: true, nome: true, email: true, role: true, status: true, city: true },
  });

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: "update",
    entity: "User",
    entityId: id,
    description: `Status do usuário alterado para ${status}`,
    metadata: { status },
    ...getRequestAuditData(req, res),
  });

  return res.json(updated);
}

export async function createDriver(req, res) {
  if (!ensureAdmin(req, res)) return;

  const { nome, email, senha, cpf, phone, cityId } = req.body;
  const selectedCityId = cityId ? Number(cityId) : req.user.cityId;
  const cityIds = req.allowedCities ?? [req.user.cityId];

  if (!cityIds.includes(selectedCityId)) {
    return res.status(403).json({ error: "Cidade não permitida" });
  }

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios" });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const driver = await prisma.user.create({
    data: {
      nome,
      email: String(email).trim().toLowerCase(),
      senha: senhaHash,
      role: "driver",
      status: "active",
      cpf,
      phone,
      cityId: selectedCityId,
    },
    select: { id: true, nome: true, email: true, role: true, status: true, city: true },
  });

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: "create",
    entity: "User",
    entityId: driver.id,
    description: "Motorista criado pelo administrador",
    ...getRequestAuditData(req, res),
  });

  return res.status(201).json(driver);
}

export async function listVehicles(req, res) {
  if (!ensureAdmin(req, res)) return;

  const cityIds = req.allowedCities ?? [req.user.cityId];
  const vehicles = await prisma.vehicle.findMany({
    where: { cityId: { in: cityIds } },
    include: { city: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json(vehicles);
}

export async function createVehicle(req, res) {
  if (!ensureAdmin(req, res)) return;

  const { plate, name, model, capacity, cityId } = req.body;
  const selectedCityId = cityId ? Number(cityId) : req.user.cityId;
  const cityIds = req.allowedCities ?? [req.user.cityId];

  if (!cityIds.includes(selectedCityId)) {
    return res.status(403).json({ error: "Cidade não permitida" });
  }

  if (!plate || !capacity) {
    return res.status(400).json({ error: "Placa e capacidade são obrigatórias" });
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      plate,
      name,
      model,
      capacity: Number(capacity),
      cityId: selectedCityId,
    },
    include: { city: true },
  });

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: "create",
    entity: "Vehicle",
    entityId: vehicle.id,
    description: "Veículo cadastrado",
    ...getRequestAuditData(req, res),
  });

  return res.status(201).json(vehicle);
}

export async function updateVehicle(req, res) {
  if (!ensureAdmin(req, res)) return;

  const id = parseId(req.params.id);
  const { plate, name, model, capacity, active } = req.body;
  const cityIds = req.allowedCities ?? [req.user.cityId];

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle || !cityIds.includes(vehicle.cityId)) {
    return res.status(404).json({ error: "Veículo não encontrado" });
  }

  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      plate,
      name,
      model,
      capacity: capacity !== undefined ? Number(capacity) : undefined,
      active,
    },
    include: { city: true },
  });

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: "update",
    entity: "Vehicle",
    entityId: id,
    description: "Veículo atualizado",
    ...getRequestAuditData(req, res),
  });

  return res.json(updated);
}

export async function listSchedules(req, res) {
  if (!ensureAdmin(req, res)) return;

  const schedules = await prisma.schedule.findMany({
    include: { university: true },
    orderBy: { time: "asc" },
  });

  return res.json(schedules);
}

export async function createSchedule(req, res) {
  if (!ensureAdmin(req, res)) return;

  const { time, type, universityId } = req.body;

  if (!time || !type) {
    return res.status(400).json({ error: "Horário e tipo são obrigatórios" });
  }

  const schedule = await prisma.schedule.create({
    data: {
      time,
      type,
      universityId: universityId ? Number(universityId) : undefined,
    },
    include: { university: true },
  });

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: "create",
    entity: "Schedule",
    entityId: schedule.id,
    description: "Horário cadastrado",
    ...getRequestAuditData(req, res),
  });

  return res.status(201).json(schedule);
}

export async function listPickupPoints(req, res) {
  if (!ensureAdmin(req, res)) return;

  const cityIds = req.allowedCities ?? [req.user.cityId];
  const points = await prisma.pickupPoint.findMany({
    where: { cityId: { in: cityIds } },
    include: { city: true },
    orderBy: { name: "asc" },
  });

  return res.json(points);
}

export async function createPickupPoint(req, res) {
  if (!ensureAdmin(req, res)) return;

  const { name, address, latitude, longitude, cityId } = req.body;
  const selectedCityId = cityId ? Number(cityId) : req.user.cityId;
  const cityIds = req.allowedCities ?? [req.user.cityId];

  if (!cityIds.includes(selectedCityId)) {
    return res.status(403).json({ error: "Cidade não permitida" });
  }

  const point = await prisma.pickupPoint.create({
    data: {
      name,
      address,
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      cityId: selectedCityId,
    },
    include: { city: true },
  });

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: "create",
    entity: "PickupPoint",
    entityId: point.id,
    description: "Ponto de embarque cadastrado",
    ...getRequestAuditData(req, res),
  });

  return res.status(201).json(point);
}

export async function listRoutes(req, res) {
  if (!ensureAdmin(req, res)) return;

  const cityIds = req.allowedCities ?? [req.user.cityId];
  const routes = await prisma.transportRoute.findMany({
    where: { cityId: { in: cityIds } },
    include: {
      city: true,
      schedule: { include: { university: true } },
      vehicle: true,
      driver: { select: { id: true, nome: true, email: true, phone: true } },
      points: { include: { pickupPoint: true }, orderBy: { order: "asc" } },
      reservations: { where: { status: "confirmed" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(routes);
}

export async function createRoute(req, res) {
  if (!ensureAdmin(req, res)) return;

  const { name, cityId, scheduleId, vehicleId, driverId, pointIds } = req.body;
  const selectedCityId = cityId ? Number(cityId) : req.user.cityId;
  const cityIds = req.allowedCities ?? [req.user.cityId];

  if (!cityIds.includes(selectedCityId)) {
    return res.status(403).json({ error: "Cidade não permitida" });
  }

  if (!name || !scheduleId) {
    return res.status(400).json({ error: "Nome e horário são obrigatórios" });
  }

  const route = await prisma.transportRoute.create({
    data: {
      name,
      cityId: selectedCityId,
      scheduleId: Number(scheduleId),
      vehicleId: vehicleId ? Number(vehicleId) : undefined,
      driverId: driverId ? Number(driverId) : undefined,
      points: Array.isArray(pointIds)
        ? {
            create: pointIds.map((pointId, index) => ({
              pickupPointId: Number(pointId),
              order: index + 1,
            })),
          }
        : undefined,
    },
    include: {
      city: true,
      schedule: true,
      vehicle: true,
      driver: true,
      points: { include: { pickupPoint: true }, orderBy: { order: "asc" } },
    },
  });

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: "create",
    entity: "TransportRoute",
    entityId: route.id,
    description: "Rota cadastrada",
    ...getRequestAuditData(req, res),
  });

  return res.status(201).json(route);
}

export async function listAuditLogs(req, res) {
  if (!ensureAdmin(req, res)) return;

  const cityIds = req.allowedCities ?? [req.user.cityId];
  const logs = await prisma.auditLog.findMany({
    where: { cityId: { in: cityIds } },
    include: {
      user: { select: { id: true, nome: true, email: true, role: true } },
      city: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return res.json(logs);
}

export async function listUniversities(req, res) {
  const universities = await prisma.university.findMany();
  return res.json(universities);
}

export async function createUniversity(req, res) {
  const uni = await prisma.university.create({
    data: req.body,
  });
  return res.json(uni);
}

export async function updateUniversity(req, res) {
  if (!ensureAdmin(req, res)) return;

  const id = parseId(req.params.id);
  const { name, cityName, cityId } = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const university = await prisma.university.findUnique({
    where: { id },
  });

  if (!university) {
    return res.status(404).json({ error: "Universidade não encontrada" });
  }

  const updated = await prisma.university.update({
    where: { id },
    data: {
      name,
      cityName,
      cityId: cityId ? Number(cityId) : undefined,
    },
    include: {
      city: true,
    },
  });

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: "update",
    entity: "University",
    entityId: id,
    description: "Universidade atualizada",
    ...getRequestAuditData(req, res),
  });

  return res.json(updated);
}

export async function updateSchedule(req, res) {
  if (!ensureAdmin(req, res)) return;

  const id = parseId(req.params.id);
  const { time, type, universityId, active } = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const schedule = await prisma.schedule.findUnique({
    where: { id },
  });

  if (!schedule) {
    return res.status(404).json({ error: "Horário não encontrado" });
  }

  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      time,
      type,
      universityId: universityId !== undefined ? Number(universityId) : undefined,
      active,
    },
    include: {
      university: true,
    },
  });

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: "update",
    entity: "Schedule",
    entityId: id,
    description: "Horário atualizado",
    ...getRequestAuditData(req, res),
  });

  return res.json(updated);
}

export async function updatePickupPoint(req, res) {
  if (!ensureAdmin(req, res)) return;

  const id = parseId(req.params.id);
  const { name, address, latitude, longitude, cityId } = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const cityIds = req.allowedCities ?? [req.user.cityId];

  const point = await prisma.pickupPoint.findUnique({
    where: { id },
  });

  if (!point || !cityIds.includes(point.cityId)) {
    return res.status(404).json({ error: "Ponto de embarque não encontrado" });
  }

  if (cityId && !cityIds.includes(Number(cityId))) {
    return res.status(403).json({ error: "Cidade não permitida" });
  }

  const updated = await prisma.pickupPoint.update({
    where: { id },
    data: {
      name,
      address,
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      cityId: cityId !== undefined ? Number(cityId) : undefined,
    },
    include: {
      city: true,
    },
  });

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: "update",
    entity: "PickupPoint",
    entityId: id,
    description: "Ponto de embarque atualizado",
    ...getRequestAuditData(req, res),
  });

  return res.json(updated);
}

export async function updateRoute(req, res) {
  if (!ensureAdmin(req, res)) return;

  const id = parseId(req.params.id);
  const {
    name,
    cityId,
    scheduleId,
    vehicleId,
    driverId,
    active,
    pointIds,
  } = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const cityIds = req.allowedCities ?? [req.user.cityId];

  const route = await prisma.transportRoute.findUnique({
    where: { id },
  });

  if (!route || !cityIds.includes(route.cityId)) {
    return res.status(404).json({ error: "Rota não encontrada" });
  }

  if (cityId && !cityIds.includes(Number(cityId))) {
    return res.status(403).json({ error: "Cidade não permitida" });
  }

  const updated = await prisma.transportRoute.update({
    where: { id },
    data: {
      name,
      cityId: cityId !== undefined ? Number(cityId) : undefined,
      scheduleId: scheduleId !== undefined ? Number(scheduleId) : undefined,
      vehicleId: vehicleId !== undefined ? Number(vehicleId) : undefined,
      driverId: driverId !== undefined ? Number(driverId) : undefined,
      active,
    },
    include: {
      city: true,
      schedule: {
        include: {
          university: true,
        },
      },
      vehicle: true,
      driver: {
        select: {
          id: true,
          nome: true,
          email: true,
          phone: true,
        },
      },
      points: {
        include: {
          pickupPoint: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (Array.isArray(pointIds)) {
    await prisma.routePoint.deleteMany({
      where: {
        routeId: id,
      },
    });

    await prisma.routePoint.createMany({
      data: pointIds.map((pointId, index) => ({
        routeId: id,
        pickupPointId: Number(pointId),
        order: index + 1,
      })),
    });
  }

  await createAuditLog({
    userId: req.user.id,
    cityId: req.user.cityId,
    action: "update",
    entity: "TransportRoute",
    entityId: id,
    description: "Rota atualizada",
    ...getRequestAuditData(req, res),
  });

  return res.json(updated);
}