import { prisma } from "../lib/prisma";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

export async function createReservation(req, res) {
  const user = req.user;
  const { scheduleId, routeId, pickupPointId } = req.body;

  if (!user?.cityId) {
    return res.status(403).json({ error: "Usuário sem cidade definida" });
  }

  if (user.role !== "student") {
    return res.status(403).json({ error: "Apenas alunos podem criar reservas" });
  }

  if (!scheduleId) {
    return res.status(400).json({ error: "Horário é obrigatório" });
  }

  const route = routeId
    ? await prisma.transportRoute.findUnique({ where: { id: Number(routeId) } })
    : null;

  if (routeId && !route) {
    return res.status(404).json({ error: "Rota não encontrada" });
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
      scheduleId: Number(scheduleId),
      status: "confirmed",
    },
  });

  if (existing) {
    return res.status(409).json({ error: "Você já possui reserva confirmada para este horário" });
  }

  const reservation = await prisma.reservation.create({
    data: {
      userId: user.id,
      scheduleId: Number(scheduleId),
      routeId: routeId ? Number(routeId) : undefined,
      pickupPointId: pickupPointId ? Number(pickupPointId) : undefined,
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
  const { id } = req.params;

  const reservation = await prisma.reservation.findUnique({ where: { id: Number(id) } });

  if (!reservation) {
    return res.status(404).json({ error: "Reserva não encontrada" });
  }

  if (reservation.userId !== user.id && user.role !== "admin") {
    return res.status(403).json({ error: "Você não tem permissão para cancelar esta reserva" });
  }

  const updated = await prisma.reservation.update({
    where: { id: Number(id) },
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
