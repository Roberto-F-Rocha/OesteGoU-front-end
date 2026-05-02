import { prisma } from "../lib/prisma";

export async function getAvailableRoutes(req, res) {
  const user = req.user;

  if (user.role !== "student") {
    return res.status(403).json({ error: "Apenas alunos podem consultar rotas disponíveis" });
  }

  if (!user.cityId) {
    return res.status(403).json({ error: "Usuário sem cidade definida" });
  }

  const agreements = await prisma.cityAgreement.findMany({
    where: {
      status: "active",
      OR: [{ requesterCityId: user.cityId }, { partnerCityId: user.cityId }],
    },
    select: { requesterCityId: true, partnerCityId: true },
  });

  const allowedCityIds = Array.from(new Set([
    user.cityId,
    ...agreements.flatMap((agreement) => [agreement.requesterCityId, agreement.partnerCityId]),
  ]));

  const routes = await prisma.transportRoute.findMany({
    where: {
      active: true,
      cityId: { in: allowedCityIds },
      schedule: { active: true },
    },
    include: {
      city: true,
      schedule: { include: { university: true } },
      vehicle: true,
      driver: { select: { id: true, nome: true, email: true } },
      points: {
        where: { pickupPoint: { is: { active: true } } },
        include: { pickupPoint: { include: { university: true, city: true } } },
        orderBy: { order: "asc" },
      },
      reservations: { where: { status: "confirmed" }, select: { id: true } },
    },
    orderBy: [{ schedule: { time: "asc" } }, { name: "asc" }],
  });

  return res.json(routes);
}

export async function getStudentsByRoute(req, res) {
  const { routeId } = req.params;
  const allowedCities = req.allowedCities;

  const reservations = await prisma.reservation.findMany({
    where: {
      routeId: Number(routeId),
      status: "confirmed",
      user: { cityId: { in: allowedCities } },
    },
    include: { user: true, pickupPoint: true },
  });

  const grouped = {};
  reservations.forEach((r) => {
    const city = r.user.cityId;
    if (!grouped[city]) grouped[city] = [];
    grouped[city].push({ id: r.user.id, nome: r.user.nome, institution: r.user.institution, ponto: r.pickupPoint?.name });
  });

  return res.json(grouped);
}

export async function getMyTripPassengers(req, res) {
  const user = req.user;

  const reservation = await prisma.reservation.findFirst({ where: { userId: user.id, status: "confirmed" } });
  if (!reservation) return res.json([]);

  const passengers = await prisma.reservation.findMany({
    where: { routeId: reservation.routeId, status: "confirmed" },
    include: { user: true, pickupPoint: true },
  });

  return res.json(passengers.map((p) => ({ nome: p.user.nome, instituicao: p.user.institution, ponto: p.pickupPoint?.name })));
}
