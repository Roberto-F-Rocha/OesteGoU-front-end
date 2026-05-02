import { prisma } from "../lib/prisma";
import { emitToAdmins, emitToCity, emitToRoute, emitToUser } from "../lib/socket";
import { createAuditLog, getRequestAuditData } from "../utils/audit";
import {
  createReservationSchema,
  createRoundTripReservationSchema,
  cancelReservationSchema,
} from "../validators/reservationSchemas";

function tripLabel(type) {
  return type === "volta" ? "volta" : "ida";
}

function getHour(time) {
  const hour = Number(String(time ?? "").split(":")[0]);
  return Number.isFinite(hour) ? hour : -1;
}

function shiftFromTime(time) {
  const hour = getHour(time);
  if (hour >= 18) return "noite";
  if (hour >= 12) return "tarde";
  return "manha";
}

async function notifyUser(userId, title, message, type = "info", metadata = {}) {
  const notification = await prisma.notification.create({ data: { userId, title, message, type, metadata } });
  emitToUser(userId, "notification:new", notification);
  return notification;
}

async function notifyUsers(userIds, title, message, type = "info", metadata = {}) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return;
  const notifications = await prisma.notification.createMany({ data: uniqueUserIds.map((userId) => ({ userId, title, message, type, metadata })) });
  uniqueUserIds.forEach((userId) => emitToUser(userId, "notification:new", { title, message, type, metadata }));
  return notifications;
}

async function emitOccupancy(routeId, reservationId, scheduleId, dayOfWeek, status = "confirmed") {
  const route = await prisma.transportRoute.findUnique({
    where: { id: routeId },
    include: { vehicle: true, reservations: { where: { status: "confirmed" } } },
  });
  if (!route) return;
  const capacity = route.vehicle?.capacity ?? null;
  const currentCount = route.reservations.length;
  const payload = { reservationId, routeId, cityId: route.cityId, scheduleId, dayOfWeek, status, capacity, currentCount, overcapacity: Boolean(capacity && currentCount > capacity) };
  emitToRoute(routeId, "route:occupancy-updated", payload);
  emitToCity(route.cityId, "route:occupancy-updated", payload);
}

async function notifyRouteOvercapacity({ route, schedule, reservation, dayOfWeek, currentCount, capacity }) {
  const admins = await prisma.user.findMany({ where: { role: "admin", cityId: route.cityId, status: "active" }, select: { id: true } });
  const existingPassengers = await prisma.reservation.findMany({ where: { routeId: route.id, status: "confirmed" }, select: { userId: true } });
  const recipients = [reservation.userId, route.driverId, ...admins.map((admin) => admin.id), ...existingPassengers.map((passenger) => passenger.userId)];
  const payload = { reservationId: reservation.id, scheduleId: schedule.id, routeId: route.id, cityId: route.cityId, dayOfWeek, capacity, currentCount, overcapacity: currentCount > capacity, scheduleTime: schedule.time, tripType: schedule.type };
  await notifyUsers(recipients, "Ônibus superlotado", `${dayOfWeek ?? "Dia selecionado"}: a ${tripLabel(schedule.type)} às ${schedule.time} ultrapassou a capacidade do ônibus (${currentCount}/${capacity}). A reserva foi mantida para dar visibilidade ao problema.`, "warning", payload);
  emitToRoute(route.id, "route:capacity-alert", payload);
  emitToCity(route.cityId, "route:capacity-alert", payload);
  emitToAdmins("admin:capacity-alert", payload);
}

async function validateReservationInput(tx, user, input, expectedType) {
  const schedule = await tx.schedule.findUnique({ where: { id: input.scheduleId }, include: { university: true } });
  if (!schedule || !schedule.active) throw new Error("Horário não encontrado ou inativo");
  if (schedule.type !== expectedType) throw new Error(expectedType === "ida" ? "Selecione uma rota de ida válida" : "Selecione uma rota de volta válida");

  const route = await tx.transportRoute.findUnique({
    where: { id: input.routeId },
    include: {
      vehicle: true,
      points: { include: { pickupPoint: true } },
      reservations: { where: { status: "confirmed" } },
    },
  });

  if (!route) throw new Error("Rota não encontrada");
  if (!route.active) throw new Error("Rota inativa");
  if (route.scheduleId !== schedule.id) throw new Error("A rota não pertence ao horário informado");

  if (route.cityId !== user.cityId) {
    const agreement = await tx.cityAgreement.findFirst({
      where: {
        status: "active",
        OR: [
          { requesterCityId: user.cityId, partnerCityId: route.cityId },
          { requesterCityId: route.cityId, partnerCityId: user.cityId },
        ],
      },
    });
    if (!agreement) throw new Error("Sua cidade não possui vínculo ativo com a cidade desta rota");
  }

  const activePoints = route.points.filter((item) => item.pickupPoint?.active !== false);
  const matchingPoints = activePoints.filter((item) => item.pickupPoint?.type === expectedType);

  if (input.pickupPointId) {
    const routePoint = matchingPoints.find((item) => item.pickupPointId === input.pickupPointId);
    if (!routePoint) throw new Error(expectedType === "ida" ? "Ponto de ida não pertence à rota" : "Ponto de volta não pertence à rota");

    const point = routePoint.pickupPoint;
    if (point.cityId !== user.cityId) throw new Error("Ponto não pertence à sua cidade");
    if (point.type !== schedule.type) throw new Error("Ponto incompatível com o tipo do horário");
    if (point.type === "volta" && schedule.universityId && point.universityId !== schedule.universityId) throw new Error("Ponto de volta não pertence à universidade selecionada");
  } else if (matchingPoints.length > 1) {
    throw new Error(expectedType === "ida" ? "Selecione um ponto de ida" : "Selecione um ponto de volta");
  }

  const pickupPointId = input.pickupPointId ?? (matchingPoints.length === 1 ? matchingPoints[0].pickupPointId : null);
  return { schedule, route, pickupPointId };
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
  const route = routeId ? await prisma.transportRoute.findUnique({ where: { id: routeId }, include: { vehicle: true, points: { include: { pickupPoint: true } }, reservations: { where: { status: "confirmed" } } } }) : null;
  if (routeId && !route) return res.status(404).json({ error: "Rota não encontrada" });
  if (route && !route.active) return res.status(400).json({ error: "Rota inativa" });
  if (route && route.scheduleId !== scheduleId) return res.status(400).json({ error: "A rota não pertence ao horário informado" });

  if (pickupPointId) {
    const point = await prisma.pickupPoint.findUnique({ where: { id: pickupPointId } });
    if (!point || !point.active) return res.status(404).json({ error: "Ponto não encontrado ou inativo" });
    if (point.cityId !== user.cityId) return res.status(403).json({ error: "Ponto não pertence à sua cidade" });
    if (point.type !== schedule.type) return res.status(400).json({ error: "Ponto incompatível com o tipo do horário" });
    if (point.type === "volta" && schedule.universityId && point.universityId !== schedule.universityId) return res.status(400).json({ error: "Ponto de volta não pertence à universidade selecionada" });
    if (routeId) { const routePoint = route?.points.find((item) => item.pickupPointId === pickupPointId); if (!routePoint) return res.status(400).json({ error: "Ponto não pertence à rota" }); }
  } else if ((route?.points.length ?? 0) > 1) return res.status(400).json({ error: "Selecione um ponto para esta rota" });

  if (route && route.cityId !== user.cityId) {
    const agreement = await prisma.cityAgreement.findFirst({ where: { status: "active", OR: [{ requesterCityId: user.cityId, partnerCityId: route.cityId }, { requesterCityId: route.cityId, partnerCityId: user.cityId }] } });
    if (!agreement) return res.status(403).json({ error: "Sua cidade não possui vínculo ativo com a cidade desta rota" });
  }

  const activeExisting = await prisma.reservation.findFirst({ where: { userId: user.id, scheduleId, dayOfWeek: dayOfWeek ?? null, status: "confirmed" } });
  if (activeExisting) return res.status(409).json({ error: "Você já possui reserva confirmada para este horário" });

  const inactiveExisting = await prisma.reservation.findFirst({ where: { userId: user.id, scheduleId, dayOfWeek: dayOfWeek ?? null, status: { in: ["canceled", "absent"] } }, orderBy: { updatedAt: "desc" } });
  if (inactiveExisting) {
    req.params.id = String(inactiveExisting.id);
    return confirmReservation(req, res);
  }

  const reservation = await prisma.reservation.create({ data: { userId: user.id, scheduleId, routeId, pickupPointId, dayOfWeek, status: "confirmed" }, include: { schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true } });
  const capacity = route?.vehicle?.capacity ?? null;
  const currentCount = (route?.reservations.length ?? 0) + 1;
  const isOvercapacity = Boolean(capacity && currentCount > capacity);
  const reachedCapacity = Boolean(capacity && currentCount === capacity);

  await notifyUser(user.id, isOvercapacity ? "Horário confirmado com ônibus superlotado" : "Horário confirmado", `${dayOfWeek ?? "Dia selecionado"}: sua ${tripLabel(reservation.schedule.type)} para ${reservation.schedule.university?.name ?? "universidade"} às ${reservation.schedule.time} foi confirmada.${isOvercapacity ? ` Atenção: o ônibus está acima da capacidade (${currentCount}/${capacity}).` : ""}`, isOvercapacity ? "warning" : "success", { reservationId: reservation.id, scheduleId, routeId, pickupPointId, dayOfWeek, capacity, currentCount, overcapacity: isOvercapacity });
  if (route) { emitToUser(user.id, "reservation:created", reservation); await emitOccupancy(route.id, reservation.id, scheduleId, dayOfWeek, "confirmed"); }
  if (route && capacity && (reachedCapacity || isOvercapacity)) await notifyRouteOvercapacity({ route, schedule, reservation, dayOfWeek, currentCount, capacity });
  await createAuditLog({ userId: user.id, cityId: user.cityId, action: "create", entity: "Reservation", entityId: reservation.id, description: isOvercapacity ? "Aluno criou reserva acima da capacidade do ônibus" : "Aluno criou uma reserva de transporte", metadata: { scheduleId, routeId, pickupPointId, capacity, currentCount, overcapacity: isOvercapacity }, ...getRequestAuditData(req, res) });
  return res.status(201).json(reservation);
}

export async function createRoundTripReservation(req, res) {
  const user = req.user;
  const parsed = createRoundTripReservationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
  if (!user?.cityId) return res.status(403).json({ error: "Usuário sem cidade definida" });
  if (user.role !== "student") return res.status(403).json({ error: "Apenas alunos podem criar reservas" });

  const { dayOfWeek, shift, going, returning } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const activeExistingForDay = await tx.reservation.findFirst({
        where: { userId: user.id, dayOfWeek, status: "confirmed" },
        include: { schedule: true },
      });
      if (activeExistingForDay) throw new Error("Você já possui horário confirmado para este dia. Remova o horário atual antes de cadastrar outro.");

      const goingData = await validateReservationInput(tx, user, going, "ida");
      const returningData = await validateReservationInput(tx, user, returning, "volta");

      if (goingData.schedule.universityId && returningData.schedule.universityId && goingData.schedule.universityId !== returningData.schedule.universityId) {
        throw new Error("A ida e a volta precisam ser da mesma universidade");
      }

      if (shiftFromTime(goingData.schedule.time) !== shift || shiftFromTime(returningData.schedule.time) !== shift) {
        throw new Error("Os horários selecionados não pertencem ao turno escolhido");
      }

      const goingReservation = await tx.reservation.create({
        data: {
          userId: user.id,
          scheduleId: going.scheduleId,
          routeId: going.routeId,
          pickupPointId: goingData.pickupPointId,
          dayOfWeek,
          status: "confirmed",
        },
        include: { schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true },
      });

      const returnReservation = await tx.reservation.create({
        data: {
          userId: user.id,
          scheduleId: returning.scheduleId,
          routeId: returning.routeId,
          pickupPointId: returningData.pickupPointId,
          dayOfWeek,
          status: "confirmed",
        },
        include: { schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true },
      });

      return { going: goingReservation, returning: returnReservation };
    });

    await notifyUser(user.id, "Horário confirmado", `${dayOfWeek}: sua ida e volta foram confirmadas com sucesso.`, "success", { dayOfWeek, shift, goingReservationId: result.going.id, returningReservationId: result.returning.id });
    if (result.going.routeId) await emitOccupancy(result.going.routeId, result.going.id, result.going.scheduleId, dayOfWeek, "confirmed");
    if (result.returning.routeId) await emitOccupancy(result.returning.routeId, result.returning.id, result.returning.scheduleId, dayOfWeek, "confirmed");
    await createAuditLog({ userId: user.id, cityId: user.cityId, action: "create", entity: "Reservation", entityId: `${result.going.id},${result.returning.id}`, description: "Aluno criou reserva de ida e volta", metadata: { dayOfWeek, shift, going, returning }, ...getRequestAuditData(req, res) });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Erro ao salvar horário completo" });
  }
}

export async function getMyReservations(req, res) {
  const reservations = await prisma.reservation.findMany({ where: { userId: req.user.id }, include: { schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true }, orderBy: { createdAt: "desc" } });
  return res.json(reservations);
}

export async function confirmReservation(req, res) {
  const user = req.user;
  const parsed = cancelReservationSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
  const { id } = parsed.data;
  const reservation = await prisma.reservation.findUnique({ where: { id }, include: { schedule: { include: { university: true } }, route: { include: { vehicle: true, reservations: { where: { status: "confirmed" } } } }, pickupPoint: true } });
  if (!reservation) return res.status(404).json({ error: "Reserva não encontrada" });
  if (reservation.userId !== user.id && user.role !== "admin") return res.status(403).json({ error: "Você não tem permissão para confirmar esta reserva" });
  if (reservation.status === "confirmed") return res.json(reservation);
  const activeExisting = await prisma.reservation.findFirst({ where: { id: { not: id }, userId: reservation.userId, scheduleId: reservation.scheduleId, dayOfWeek: reservation.dayOfWeek, status: "confirmed" } });
  if (activeExisting) return res.status(409).json({ error: "Já existe uma reserva confirmada para este horário" });
  const updated = await prisma.reservation.update({ where: { id }, data: { status: "confirmed" }, include: { schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true } });
  await notifyUser(reservation.userId, "Presença confirmada", `${reservation.dayOfWeek ?? "Dia selecionado"}: sua ${tripLabel(reservation.schedule.type)} às ${reservation.schedule.time} foi confirmada novamente.`, "success", { reservationId: reservation.id, scheduleId: reservation.scheduleId, routeId: reservation.routeId, dayOfWeek: reservation.dayOfWeek });
  emitToUser(reservation.userId, "reservation:created", updated);
  if (reservation.routeId) await emitOccupancy(reservation.routeId, reservation.id, reservation.scheduleId, reservation.dayOfWeek, "confirmed");
  await createAuditLog({ userId: user.id, cityId: user.cityId, action: "update", entity: "Reservation", entityId: updated.id, description: "Reserva confirmada novamente", ...getRequestAuditData(req, res) });
  return res.json(updated);
}

export async function cancelReservation(req, res) {
  const user = req.user;
  const parsed = cancelReservationSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
  const { id } = parsed.data;
  const reservation = await prisma.reservation.findUnique({ where: { id }, include: { schedule: { include: { university: true } }, route: { include: { vehicle: true } }, pickupPoint: true } });
  if (!reservation) return res.status(404).json({ error: "Reserva não encontrada" });
  if (reservation.userId !== user.id && user.role !== "admin") return res.status(403).json({ error: "Você não tem permissão para cancelar esta reserva" });
  if (reservation.status === "canceled") return res.json(reservation);
  const updated = await prisma.reservation.update({ where: { id }, data: { status: "canceled" } });
  await notifyUser(reservation.userId, "Horário cancelado", `${reservation.dayOfWeek ?? "Dia selecionado"}: sua ${tripLabel(reservation.schedule.type)} às ${reservation.schedule.time} foi removida da sua semana.`, "warning", { reservationId: reservation.id, scheduleId: reservation.scheduleId, routeId: reservation.routeId, dayOfWeek: reservation.dayOfWeek });
  emitToUser(reservation.userId, "reservation:canceled", updated);
  if (reservation.routeId) await emitOccupancy(reservation.routeId, reservation.id, reservation.scheduleId, reservation.dayOfWeek, "canceled");
  await createAuditLog({ userId: user.id, cityId: user.cityId, action: "cancel", entity: "Reservation", entityId: updated.id, description: "Reserva cancelada", ...getRequestAuditData(req, res) });
  return res.json(updated);
}
