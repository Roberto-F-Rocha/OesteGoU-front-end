import { prisma } from "../lib/prisma";
import { emitToAdmins, emitToCity, emitToRoute, emitToUser } from "../lib/socket";
import { createAuditLog, getRequestAuditData } from "../utils/audit";
import {
  createReservationSchema,
  cancelReservationSchema,
} from "../validators/reservationSchemas";

function tripLabel(type) {
  return type === "volta" ? "volta" : "ida";
}

async function notifyUser(userId, title, message, type = "info", metadata = {}) {
  const notification = await prisma.notification.create({
    data: { userId, title, message, type, metadata },
  });

  emitToUser(userId, "notification:new", notification);
  return notification;
}

async function notifyUsers(userIds, title, message, type = "info", metadata = {}) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return;

  const notifications = await prisma.notification.createMany({
    data: uniqueUserIds.map((userId) => ({ userId, title, message, type, metadata })),
  });

  uniqueUserIds.forEach((userId) => {
    emitToUser(userId, "notification:new", { title, message, type, metadata });
  });

  return notifications;
}

async function notifyRouteOvercapacity({ route, schedule, reservation, dayOfWeek, currentCount, capacity }) {
  const admins = await prisma.user.findMany({
    where: { role: "admin", cityId: route.cityId, status: "active" },
    select: { id: true },
  });

  const existingPassengers = await prisma.reservation.findMany({
    where: { routeId: route.id, status: "confirmed" },
    select: { userId: true },
  });

  const recipients = [
    reservation.userId,
    route.driverId,
    ...admins.map((admin) => admin.id),
    ...existingPassengers.map((passenger) => passenger.userId),
  ];

  const payload = {
    reservationId: reservation.id,
    scheduleId: schedule.id,
    routeId: route.id,
    cityId: route.cityId,
    dayOfWeek,
    capacity,
    currentCount,
    overcapacity: currentCount > capacity,
    scheduleTime: schedule.time,
    tripType: schedule.type,
  };

  await notifyUsers(
    recipients,
    "Ônibus superlotado",
    `${dayOfWeek ?? "Dia selecionado"}: a ${tripLabel(schedule.type)} às ${schedule.time} ultrapassou a capacidade do ônibus (${currentCount}/${capacity}). A reserva foi mantida para dar visibilidade ao problema.`,
    "warning",
    payload,
  );

  emitToRoute(route.id, "route:capacity-alert", payload);
  emitToCity(route.cityId, "route:capacity-alert", payload);
  emitToAdmins("admin:capacity-alert", payload);
}

export async function createReservation(req, res) {
  const user = req.user;
  const parsed = createReservationSchema.safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });

  const { scheduleId, routeId, pickupPointId, dayOfWeek } = parsed.data;

  if (!user?.cityId) return res.status(403).json({ error: "Usuário sem cidade definida" });
  if (user.role !== "student") return res.status(403).json({ error: "Apenas alunos podem criar reservas" });

  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId }, include: { university: true } });
  if (!schedule || !schedule.active) return res.status(404).json({ error: "Horário não encontrado ou inativo" });

  const route = routeId
    ? await prisma.transportRoute.findUnique({
        where: { id: routeId },
        include: { vehicle: true, points: { include: { pickupPoint: true } }, reservations: { where: { status: "confirmed" } } },
      })
    : null;

  if (routeId && !route) return res.status(404).json({ error: "Rota não encontrada" });
  if (route && !route.active) return res.status(400).json({ error: "Rota inativa" });
  if (route && route.scheduleId !== scheduleId) return res.status(400).json({ error: "A rota não pertence ao horário informado" });

  if (pickupPointId) {
    const point = await prisma.pickupPoint.findUnique({ where: { id: pickupPointId } });
    if (!point || !point.active) return res.status(404).json({ error: "Ponto não encontrado ou inativo" });
    if (point.cityId !== user.cityId) return res.status(403).json({ error: "Ponto não pertence à sua cidade" });
    if (point.type !== schedule.type) return res.status(400).json({ error: "Ponto incompatível com o tipo do horário" });
    if (point.type === "volta" && schedule.universityId && point.universityId !== schedule.universityId) {
      return res.status(400).json({ error: "Ponto de volta não pertence à universidade selecionada" });
    }
    if (routeId) {
      const routePoint = route?.points.find((item) => item.pickupPointId === pickupPointId);
      if (!routePoint) return res.status(400).json({ error: "Ponto não pertence à rota" });
    }
  } else if ((route?.points.length ?? 0) > 1) {
    return res.status(400).json({ error: "Selecione um ponto para esta rota" });
  }

  if (route && route.cityId !== user.cityId) {
    const agreement = await prisma.cityAgreement.findFirst({
      where: {
        status: "active",
        OR: [
          { requesterCityId: user.cityId, partnerCityId: route.cityId },
          { requesterCityId: route.cityId, partnerCityId: user.cityId },
        ],
      },
    });
    if (!agreement) return res.status(403).json({ error: "Sua cidade não possui vínculo ativo com a cidade desta rota" });
  }

  const existing = await prisma.reservation.findFirst({
    where: { userId: user.id, scheduleId, dayOfWeek: dayOfWeek ?? null, status: "confirmed" },
  });
  if (existing) return res.status(409).json({ error: "Você já possui reserva confirmada para este horário" });

  const reservation = await prisma.reservation.create({
    data: { userId: user.id, scheduleId, routeId, pickupPointId, dayOfWeek, status: "confirmed" },
    include: {
      schedule: { include: { university: true } },
      route: { include: { city: true, vehicle: true, driver: true } },
      pickupPoint: true,
    },
  });

  const capacity = route?.vehicle?.capacity ?? null;
  const currentCount = (route?.reservations.length ?? 0) + 1;
  const isOvercapacity = Boolean(capacity && currentCount > capacity);
  const reachedCapacity = Boolean(capacity && currentCount === capacity);

  await notifyUser(
    user.id,
    isOvercapacity ? "Horário confirmado com ônibus superlotado" : "Horário confirmado",
    `${dayOfWeek ?? "Dia selecionado"}: sua ${tripLabel(reservation.schedule.type)} para ${reservation.schedule.university?.name ?? "universidade"} às ${reservation.schedule.time} foi confirmada.${isOvercapacity ? ` Atenção: o ônibus está acima da capacidade (${currentCount}/${capacity}).` : ""}`,
    isOvercapacity ? "warning" : "success",
    { reservationId: reservation.id, scheduleId, routeId, pickupPointId, dayOfWeek, capacity, currentCount, overcapacity: isOvercapacity },
  );

  if (route) {
    const payload = {
      reservationId: reservation.id,
      routeId: route.id,
      cityId: route.cityId,
      scheduleId,
      pickupPointId,
      dayOfWeek,
      capacity,
      currentCount,
      overcapacity: isOvercapacity,
    };

    emitToUser(user.id, "reservation:created", reservation);
    emitToRoute(route.id, "route:occupancy-updated", payload);
    emitToCity(route.cityId, "route:occupancy-updated", payload);
  }

  if (route && capacity && (reachedCapacity || isOvercapacity)) {
    await notifyRouteOvercapacity({ route, schedule, reservation, dayOfWeek, currentCount, capacity });
  }

  await createAuditLog({
    userId: user.id,
    cityId: user.cityId,
    action: "create",
    entity: "Reservation",
    entityId: reservation.id,
    description: isOvercapacity ? "Aluno criou reserva acima da capacidade do ônibus" : "Aluno criou uma reserva de transporte",
    metadata: { scheduleId, routeId, pickupPointId, capacity, currentCount, overcapacity: isOvercapacity },
    ...getRequestAuditData(req, res),
  });

  return res.status(201).json(reservation);
}

export async function getMyReservations(req, res) {
  const user = req.user;
  const reservations = await prisma.reservation.findMany({
    where: { userId: user.id },
    include: {
      schedule: { include: { university: true } },
      route: { include: { city: true, vehicle: true, driver: true } },
      pickupPoint: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(reservations);
}

export async function cancelReservation(req, res) {
  const user = req.user;
  const parsed = cancelReservationSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
  const { id } = parsed.data;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { schedule: { include: { university: true } }, route: { include: { vehicle: true } }, pickupPoint: true },
  });
  if (!reservation) return res.status(404).json({ error: "Reserva não encontrada" });
  if (reservation.userId !== user.id && user.role !== "admin") return res.status(403).json({ error: "Você não tem permissão para cancelar esta reserva" });
  const updated = await prisma.reservation.update({ where: { id }, data: { status: "canceled" } });

  await notifyUser(
    reservation.userId,
    "Horário cancelado",
    `${reservation.dayOfWeek ?? "Dia selecionado"}: sua ${tripLabel(reservation.schedule.type)} às ${reservation.schedule.time} foi removida da sua semana.`,
    "warning",
    { reservationId: reservation.id, scheduleId: reservation.scheduleId, routeId: reservation.routeId, dayOfWeek: reservation.dayOfWeek },
  );

  emitToUser(reservation.userId, "reservation:canceled", updated);

  if (reservation.routeId) {
    emitToRoute(reservation.routeId, "route:occupancy-updated", {
      reservationId: reservation.id,
      routeId: reservation.routeId,
      scheduleId: reservation.scheduleId,
      dayOfWeek: reservation.dayOfWeek,
      status: "canceled",
    });
  }

  await createAuditLog({ userId: user.id, cityId: user.cityId, action: "cancel", entity: "Reservation", entityId: updated.id, description: "Reserva cancelada", ...getRequestAuditData(req, res) });
  return res.json(updated);
}
