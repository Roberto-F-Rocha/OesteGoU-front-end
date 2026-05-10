import { NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { emitToAdmins, emitToCity, emitToRoute, emitToUser } from "../lib/socket";
import { createNotification, notifyUsers as notifyManyUsers } from "../services/notificationService";
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

async function notifyUser(userId: number, title: string, message: string, type: NotificationType = NotificationType.info, metadata: Record<string, unknown> = {}) {
  const notification = await createNotification({ userId, title, message, type, metadata });
  emitToUser(userId, "notification:new", notification);
  return notification;
}

async function notifyUsers(userIds: Array<number | null | undefined>, title: string, message: string, type: NotificationType = NotificationType.info, metadata: Record<string, unknown> = {}) {
  const uniqueUserIds = Array.from(new Set(userIds.filter((userId): userId is number => typeof userId === "number")));
  if (uniqueUserIds.length === 0) return;
  await notifyManyUsers(uniqueUserIds, { title, message, type, metadata });
  uniqueUserIds.forEach((userId) => emitToUser(userId, "notification:new", { title, message, type, metadata }));
}

async function buildRouteLivePayload(routeId: number, reservationId?: number) {
  const route = await prisma.transportRoute.findUnique({
    where: { id: routeId },
    include: {
      city: true,
      vehicle: true,
      driver: { select: { id: true, nome: true, email: true } },
      schedule: { include: { university: true } },
      points: { include: { pickupPoint: true }, orderBy: { order: "asc" } },
      reservations: {
        include: { user: { select: { id: true, nome: true, email: true, phone: true, institution: true, city: true } }, pickupPoint: true },
        orderBy: [{ dayOfWeek: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!route) return null;
  const confirmedCount = route.reservations.filter((item) => item.status === "confirmed").length;
  const pendingCount = route.reservations.filter((item) => item.status === "pending").length;
  const capacity = route.vehicle?.capacity ?? null;
  return { routeId: route.id, reservationId, route, cityId: route.cityId, driverId: route.driverId, scheduleId: route.scheduleId, scheduleType: route.schedule?.type, scheduleTime: route.schedule?.time, shift: shiftFromTime(route.schedule?.time), capacity, currentCount: confirmedCount, pendingCount, overcapacity: Boolean(capacity && confirmedCount > capacity), reservations: route.reservations };
}

async function emitRouteLiveUpdate(routeId: number, reservationId?: number, eventName = "driver:route-updated") {
  const payload = await buildRouteLivePayload(routeId, reservationId);
  if (!payload) return;
  emitToRoute(routeId, eventName, payload);
  emitToCity(payload.cityId, eventName, payload);
  if (payload.driverId) emitToUser(payload.driverId, eventName, payload);
  return payload;
}

async function emitOccupancy(routeId, reservationId, scheduleId, dayOfWeek, status = "pending") {
  const payload = await emitRouteLiveUpdate(routeId, reservationId, "driver:route-updated");
  if (!payload) return;
  const occupancyPayload = { reservationId, routeId, cityId: payload.cityId, scheduleId, dayOfWeek, status, capacity: payload.capacity, currentCount: payload.currentCount, pendingCount: payload.pendingCount, overcapacity: payload.overcapacity };
  emitToRoute(routeId, "route:occupancy-updated", occupancyPayload);
  emitToCity(payload.cityId, "route:occupancy-updated", occupancyPayload);
  if (payload.driverId) emitToUser(payload.driverId, "route:occupancy-updated", occupancyPayload);
}

async function notifyDriverAttendanceChange(reservation, action: "confirmed" | "canceled") {
  const route = reservation.route;
  const driverId = route?.driverId;
  if (!driverId) return;

  const isConfirmed = action === "confirmed";
  const student = reservation.user;
  const schedule = reservation.schedule;
  const pickupPoint = reservation.pickupPoint?.name ?? "ponto não informado";
  const routeName = route?.name ?? "rota não informada";
  const universityName = schedule?.university?.name ?? "universidade não informada";
  const studentName = student?.nome ?? "Aluno";
  const studentPhone = student?.phone ? ` · Tel: ${student.phone}` : "";
  const studentInstitution = student?.institution ? ` · ${student.institution}` : "";
  const actionText = isConfirmed ? "CONFIRMOU presença" : "marcou NÃO VOU";

  const message = `${studentName}${studentInstitution}${studentPhone} ${actionText} na ${tripLabel(schedule?.type)} de ${reservation.dayOfWeek ?? "dia não informado"} às ${schedule?.time ?? "--:--"}. Rota: ${routeName}. Ponto: ${pickupPoint}. Universidade: ${universityName}.`;

  await notifyUser(
    driverId,
    isConfirmed ? "Aluno confirmou presença" : "Aluno marcou não vou",
    message,
    isConfirmed ? NotificationType.success : NotificationType.warning,
    {
      source: "student_attendance_driver",
      senderRole: "student",
      senderId: reservation.userId,
      reservationId: reservation.id,
      routeId: reservation.routeId,
      studentId: reservation.userId,
      studentName,
      studentPhone: student?.phone ?? null,
      studentInstitution: student?.institution ?? null,
      pickupPoint,
      routeName,
      universityName,
      status: action,
      actionText,
      dayOfWeek: reservation.dayOfWeek,
      scheduleTime: schedule?.time,
      tripType: schedule?.type,
    },
  );

  emitToUser(driverId, "driver:attendance-changed", { reservationId: reservation.id, routeId: reservation.routeId, studentId: reservation.userId, studentName, status: action, actionText, pickupPoint, routeName, dayOfWeek: reservation.dayOfWeek, scheduleTime: schedule?.time, tripType: schedule?.type });
}

async function notifyStudentAttendanceChange(reservation, action: "confirmed" | "canceled") {
  const isConfirmed = action === "confirmed";
  const schedule = reservation.schedule;
  await notifyUser(reservation.userId, isConfirmed ? "Presença confirmada" : "Ausência registrada", isConfirmed ? `${reservation.dayOfWeek ?? "Dia selecionado"}: sua ${tripLabel(schedule?.type)} às ${schedule?.time ?? "--:--"} foi confirmada.` : `${reservation.dayOfWeek ?? "Dia selecionado"}: sua ${tripLabel(schedule?.type)} às ${schedule?.time ?? "--:--"} foi marcada como não vou.`, isConfirmed ? NotificationType.success : NotificationType.warning, { source: "student_attendance_self", reservationId: reservation.id, routeId: reservation.routeId, scheduleId: reservation.scheduleId, dayOfWeek: reservation.dayOfWeek, scheduleTime: schedule?.time, tripType: schedule?.type, status: action });
}

async function notifyRouteOvercapacity({ route, schedule, reservation, dayOfWeek, currentCount, capacity }) {
  const admins = await prisma.user.findMany({ where: { role: "admin", cityId: route.cityId, status: "active" }, select: { id: true } });
  const existingPassengers = await prisma.reservation.findMany({ where: { routeId: route.id, status: "confirmed" }, select: { userId: true } });
  const recipients = [reservation.userId, route.driverId, ...admins.map((admin) => admin.id), ...existingPassengers.map((passenger) => passenger.userId)];
  const payload = { reservationId: reservation.id, scheduleId: schedule.id, routeId: route.id, cityId: route.cityId, dayOfWeek, capacity, currentCount, overcapacity: currentCount > capacity, scheduleTime: schedule.time, tripType: schedule.type };
  await notifyUsers(recipients, "Ônibus superlotado", `${dayOfWeek ?? "Dia selecionado"}: a ${tripLabel(schedule.type)} às ${schedule.time} ultrapassou a capacidade do ônibus (${currentCount}/${capacity}).`, NotificationType.warning, payload);
  emitToRoute(route.id, "route:capacity-alert", payload);
  emitToCity(route.cityId, "route:capacity-alert", payload);
  emitToAdmins("admin:capacity-alert", payload);
}

async function validateReservationInput(tx, user, input, expectedType) {
  const schedule = await tx.schedule.findUnique({ where: { id: input.scheduleId }, include: { university: true } });
  if (!schedule || !schedule.active) throw new Error("Horário não encontrado ou inativo");
  if (schedule.type !== expectedType) throw new Error(expectedType === "ida" ? "Selecione uma rota de ida válida" : "Selecione uma rota de volta válida");
  const route = await tx.transportRoute.findUnique({ where: { id: input.routeId }, include: { vehicle: true, points: { include: { pickupPoint: true } }, reservations: { where: { status: "confirmed" } } } });
  if (!route) throw new Error("Rota não encontrada");
  if (!route.active) throw new Error("Rota inativa");
  if (route.scheduleId !== schedule.id) throw new Error("A rota não pertence ao horário informado");
  if (route.cityId !== user.cityId) throw new Error("A rota não pertence à sua cidade");
  const activePoints = route.points.filter((item) => item.pickupPoint?.active !== false);
  const matchingPoints = activePoints.filter((item) => item.pickupPoint?.type === expectedType);
  if (input.pickupPointId) {
    const routePoint = matchingPoints.find((item) => item.pickupPointId === input.pickupPointId);
    if (!routePoint) throw new Error(expectedType === "ida" ? "Ponto de ida não pertence à rota" : "Ponto de volta não pertence à rota");
    const point = routePoint.pickupPoint;
    if (point.cityId !== user.cityId) throw new Error("Ponto não pertence à sua cidade");
    if (point.type !== schedule.type) throw new Error("Ponto incompatível com o tipo do horário");
    if (point.type === "volta" && schedule.universityId && point.universityId !== schedule.universityId) throw new Error("Ponto de volta não pertence à universidade selecionada");
  } else if (matchingPoints.length > 1) throw new Error(expectedType === "ida" ? "Selecione um ponto de ida" : "Selecione um ponto de volta");
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
  if (route && route.cityId !== user.cityId) return res.status(403).json({ error: "A rota não pertence à sua cidade" });
  if (pickupPointId) {
    const point = await prisma.pickupPoint.findUnique({ where: { id: pickupPointId } });
    if (!point || !point.active) return res.status(404).json({ error: "Ponto não encontrado ou inativo" });
    if (point.cityId !== user.cityId) return res.status(403).json({ error: "Ponto não pertence à sua cidade" });
    if (point.type !== schedule.type) return res.status(400).json({ error: "Ponto incompatível com o tipo do horário" });
    if (point.type === "volta" && schedule.universityId && point.universityId !== schedule.universityId) return res.status(400).json({ error: "Ponto de volta não pertence à universidade selecionada" });
    if (routeId) { const routePoint = route?.points.find((item) => item.pickupPointId === pickupPointId); if (!routePoint) return res.status(400).json({ error: "Ponto não pertence à rota" }); }
  } else if ((route?.points.length ?? 0) > 1) return res.status(400).json({ error: "Selecione um ponto para esta rota" });
  const activeExisting = await prisma.reservation.findFirst({ where: { userId: user.id, scheduleId, dayOfWeek: dayOfWeek ?? null, status: { in: ["pending", "confirmed"] } } });
  if (activeExisting) return res.status(409).json({ error: "Você já possui horário salvo para este período" });
  const inactiveExisting = await prisma.reservation.findFirst({ where: { userId: user.id, scheduleId, dayOfWeek: dayOfWeek ?? null, status: { in: ["canceled", "absent"] } }, orderBy: { updatedAt: "desc" } });
  if (inactiveExisting) {
    const restored = await prisma.reservation.update({ where: { id: inactiveExisting.id }, data: { status: "pending", routeId, pickupPointId }, include: { user: true, schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true } });
    if (restored.routeId) { emitToUser(user.id, "reservation:created", restored); await emitOccupancy(restored.routeId, restored.id, restored.scheduleId, restored.dayOfWeek, "pending"); }
    return res.status(200).json(restored);
  }
  const reservation = await prisma.reservation.create({ data: { userId: user.id, scheduleId, routeId, pickupPointId, dayOfWeek, status: "pending" }, include: { user: true, schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true } });
  await notifyUser(user.id, "Confirmação pendente", `${dayOfWeek ?? "Dia selecionado"}: sua ${tripLabel(reservation.schedule.type)} às ${reservation.schedule.time} foi salva. Confirme se você vai ou marque que não vai até o horário da viagem.`, NotificationType.warning, { source: "reservation_pending", reservationId: reservation.id, scheduleId, routeId, pickupPointId, dayOfWeek, status: "pending" });
  if (route) { emitToUser(user.id, "reservation:created", reservation); await emitOccupancy(route.id, reservation.id, scheduleId, dayOfWeek, "pending"); }
  await createAuditLog({ userId: user.id, cityId: user.cityId, action: "create", entity: "Reservation", entityId: reservation.id, description: "Aluno criou horário pendente de confirmação", metadata: { scheduleId, routeId, pickupPointId, status: "pending" }, ...getRequestAuditData(req, res) });
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
      const activeExistingForDay = await tx.reservation.findFirst({ where: { userId: user.id, dayOfWeek, status: { in: ["pending", "confirmed"] } }, include: { schedule: true } });
      if (activeExistingForDay) throw new Error("Você já possui horário salvo para este dia. Remova o horário atual antes de cadastrar outro.");
      const goingData = await validateReservationInput(tx, user, going, "ida");
      const returningData = await validateReservationInput(tx, user, returning, "volta");
      if (goingData.schedule.universityId && returningData.schedule.universityId && goingData.schedule.universityId !== returningData.schedule.universityId) throw new Error("A ida e a volta precisam ser da mesma universidade");
      if (shiftFromTime(goingData.schedule.time) !== shift || shiftFromTime(returningData.schedule.time) !== shift) throw new Error("Os horários selecionados não pertencem ao turno escolhido");
      const goingReservation = await tx.reservation.create({ data: { userId: user.id, scheduleId: going.scheduleId, routeId: going.routeId, pickupPointId: goingData.pickupPointId, dayOfWeek, status: "pending" }, include: { schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true } });
      const returnReservation = await tx.reservation.create({ data: { userId: user.id, scheduleId: returning.scheduleId, routeId: returning.routeId, pickupPointId: returningData.pickupPointId, dayOfWeek, status: "pending" }, include: { schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true } });
      return { going: goingReservation, returning: returnReservation };
    });
    await notifyUser(user.id, "Confirmação pendente", `${dayOfWeek}: sua ida e volta foram salvas. Confirme presença em cada viagem antes do horário.`, NotificationType.warning, { source: "roundtrip_pending", dayOfWeek, shift, goingReservationId: result.going.id, returningReservationId: result.returning.id, status: "pending" });
    if (result.going.routeId) await emitOccupancy(result.going.routeId, result.going.id, result.going.scheduleId, dayOfWeek, "pending");
    if (result.returning.routeId) await emitOccupancy(result.returning.routeId, result.returning.id, result.returning.scheduleId, dayOfWeek, "pending");
    await createAuditLog({ userId: user.id, cityId: user.cityId, action: "create", entity: "Reservation", entityId: `${result.going.id},${result.returning.id}`, description: "Aluno criou ida e volta pendentes de confirmação", metadata: { dayOfWeek, shift, going, returning, status: "pending" }, ...getRequestAuditData(req, res) });
    return res.status(201).json(result);
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Erro ao salvar horário completo" }); }
}

export async function getMyReservations(req, res) {
  const reservations = await prisma.reservation.findMany({ where: { userId: req.user.id }, include: { schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true, reservations: { where: { status: "confirmed" }, select: { id: true } } } }, pickupPoint: true }, orderBy: { createdAt: "desc" } });
  return res.json(reservations);
}

export async function confirmReservation(req, res) {
  const user = req.user;
  const parsed = cancelReservationSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
  const { id } = parsed.data;
  const reservation = await prisma.reservation.findUnique({ where: { id }, include: { user: true, schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true, reservations: { where: { status: "confirmed" } } } }, pickupPoint: true } });
  if (!reservation) return res.status(404).json({ error: "Reserva não encontrada" });
  if (reservation.userId !== user.id && user.role !== "admin") return res.status(403).json({ error: "Você não tem permissão para confirmar esta reserva" });
  if (reservation.status === "confirmed") return res.json(reservation);
  const activeExisting = await prisma.reservation.findFirst({ where: { id: { not: id }, userId: reservation.userId, scheduleId: reservation.scheduleId, dayOfWeek: reservation.dayOfWeek, status: "confirmed" } });
  if (activeExisting) return res.status(409).json({ error: "Já existe uma reserva confirmada para este horário" });
  const updated = await prisma.reservation.update({ where: { id }, data: { status: "confirmed" }, include: { user: true, schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true } });
  await notifyStudentAttendanceChange(updated, "confirmed");
  if (updated.routeId) { await notifyDriverAttendanceChange(updated, "confirmed"); emitToUser(reservation.userId, "reservation:created", updated); await emitOccupancy(updated.routeId, updated.id, updated.scheduleId, updated.dayOfWeek, "confirmed"); }
  await createAuditLog({ userId: user.id, cityId: user.cityId, action: "update", entity: "Reservation", entityId: updated.id, description: "Reserva confirmada", ...getRequestAuditData(req, res) });
  return res.json(updated);
}

export async function cancelReservation(req, res) {
  const user = req.user;
  const parsed = cancelReservationSchema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
  const { id } = parsed.data;
  const reservation = await prisma.reservation.findUnique({ where: { id }, include: { user: true, schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true } });
  if (!reservation) return res.status(404).json({ error: "Reserva não encontrada" });
  if (reservation.userId !== user.id && user.role !== "admin") return res.status(403).json({ error: "Você não tem permissão para cancelar esta reserva" });
  if (reservation.status === "canceled") return res.json(reservation);
  const updated = await prisma.reservation.update({ where: { id }, data: { status: "canceled" }, include: { user: true, schedule: { include: { university: true } }, route: { include: { city: true, vehicle: true, driver: true } }, pickupPoint: true } });
  await notifyStudentAttendanceChange(updated, "canceled");
  if (updated.routeId) { await notifyDriverAttendanceChange(updated, "canceled"); emitToUser(reservation.userId, "reservation:canceled", updated); await emitOccupancy(updated.routeId, updated.id, updated.scheduleId, updated.dayOfWeek, "canceled"); }
  await createAuditLog({ userId: user.id, cityId: user.cityId, action: "cancel", entity: "Reservation", entityId: updated.id, description: "Reserva marcada como não vou", ...getRequestAuditData(req, res) });
  return res.json(updated);
}
