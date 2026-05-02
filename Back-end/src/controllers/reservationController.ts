import { prisma } from "../lib/prisma";
import { createAuditLog, getRequestAuditData } from "../utils/audit";
import {
  createReservationSchema,
  cancelReservationSchema,
} from "../validators/reservationSchemas";

export async function createReservation(req, res) {
  const user = req.user;
  const parsed = createReservationSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: parsed.error.flatten(),
    });
  }

  const { scheduleId, routeId, pickupPointId, dayOfWeek } = parsed.data;

  if (!user?.cityId) {
    return res.status(403).json({ error: "Usuário sem cidade definida" });
  }

  if (user.role !== "student") {
    return res.status(403).json({ error: "Apenas alunos podem criar reservas" });
  }

  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || !schedule.active) {
    return res.status(404).json({ error: "Horário não encontrado ou inativo" });
  }

  const route = routeId
    ? await prisma.transportRoute.findUnique({ where: { id: routeId } })
    : null;

  if (routeId && !route) {
    return res.status(404).json({ error: "Rota não encontrada" });
  }

  if (route && !route.active) {
    return res.status(400).json({ error: "Rota inativa" });
  }

  if (route && route.scheduleId !== scheduleId) {
    return res.status(400).json({ error: "A rota não pertence ao horário informado" });
  }

  if (pickupPointId) {
    const point = await prisma.pickupPoint.findUnique({ where: { id: pickupPointId } });
    if (!point) {
      return res.status(404).json({ error: "Ponto de embarque não encontrado" });
    }

    if (routeId) {
      const routePoint = await prisma.routePoint.findFirst({
        where: { routeId, pickupPointId },
      });

      if (!routePoint) {
        return res.status(400).json({ error: "Ponto de embarque não pertence à rota" });
      }
    }
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

    if (!agreement) {
      return res.status(403).json({ error: "Sua cidade não possui vínculo ativo com a cidade desta rota" });
    }
  }

  const existing = await prisma.reservation.findFirst({
    where: {
      userId: user.id,
      scheduleId,
      dayOfWeek: dayOfWeek ?? null,
      status: "confirmed",
    },
  });

  if (existing) {
    return res.status(409).json({ error: "Você já possui reserva confirmada para este horário" });
  }

  const reservation = await prisma.reservation.create({
    data: {
      userId: user.id,
      scheduleId,
      routeId,
      pickupPointId,
      dayOfWeek,
      status: "confirmed",
    },
    include: {
      schedule: { include: { university: true } },
      route: { include: { city: true, vehicle: true, driver: true } },
      pickupPoint: true,
    },
  });

  await createAuditLog({
    userId: user.id,
    cityId: user.cityId,
    action: "create",
    entity: "Reservation",
    entityId: reservation.id,
    description: "Aluno criou uma reserva de transporte",
    metadata: { scheduleId, routeId, pickupPointId },
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

  if (!parsed.success) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: parsed.error.flatten(),
    });
  }

  const { id } = parsed.data;

  const reservation = await prisma.reservation.findUnique({ where: { id } });

  if (!reservation) {
    return res.status(404).json({ error: "Reserva não encontrada" });
  }

  if (reservation.userId !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "Você não tem permissão para cancelar esta reserva" });
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: "canceled" },
  });

  await createAuditLog({
    userId: user.id,
    cityId: user.cityId,
    action: "cancel",
    entity: "Reservation",
    entityId: updated.id,
    description: "Reserva cancelada",
    ...getRequestAuditData(req, res),
  });

  return res.json(updated);
}
