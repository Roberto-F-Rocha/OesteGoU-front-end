import { prisma } from "../lib/prisma";

export async function getAvailableRoutes(req, res) {
  const user = req.user;

  if (user.role !== "student") {
    return res.status(403).json({ error: "Apenas alunos podem consultar rotas disponíveis" });
  }

  if (!user.cityId) {
    return res.status(403).json({ error: "Usuário sem cidade definida" });
  }

  const routes = await prisma.transportRoute.findMany({
    where: {
      active: true,
      cityId: user.cityId,
      schedule: { active: true },
    },
    include: {
      city: true,
      schedule: { include: { university: true } },
      vehicle: true,
      driver: { select: { id: true, nome: true, email: true } },
      points: {
        where: {
          pickupPoint: {
            is: {
              active: true,
              cityId: user.cityId,
            },
          },
        },
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
  const user = req.user;
  const allowedCities = req.allowedCities ?? (user?.cityId ? [user.cityId] : []);

  const route = await prisma.transportRoute.findUnique({ where: { id: Number(routeId) } });
  if (!route || !allowedCities.includes(route.cityId)) {
    return res.status(404).json({ error: "Rota não encontrada para sua cidade" });
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      routeId: Number(routeId),
      status: "confirmed",
    },
    include: { user: { include: { city: true } }, pickupPoint: true },
  });

  const grouped = {};
  reservations.forEach((r) => {
    const city = r.user.city?.name ?? "Cidade não informada";
    if (!grouped[city]) grouped[city] = [];
    grouped[city].push({
      id: r.user.id,
      nome: r.user.nome,
      institution: r.user.institution,
      cidade: r.user.city,
      ponto: r.pickupPoint?.name,
    });
  });

  return res.json(grouped);
}

export async function getMyTripPassengers(req, res) {
  const user = req.user;

  if (!user?.cityId) return res.status(403).json({ error: "Usuário sem cidade definida" });

  const reservation = await prisma.reservation.findFirst({
    where: {
      userId: user.id,
      status: "confirmed",
      route: { cityId: user.cityId },
    },
  });

  if (!reservation) return res.json([]);

  const passengers = await prisma.reservation.findMany({
    where: {
      routeId: reservation.routeId,
      status: "confirmed",
    },
    include: { user: { include: { city: true } }, pickupPoint: true },
  });

  return res.json(passengers.map((p) => ({
    nome: p.user.nome,
    instituicao: p.user.institution,
    cidade: p.user.city?.name,
    uf: p.user.city?.state,
    ponto: p.pickupPoint?.name,
  })));
}
