import { prisma } from "../lib/prisma";

export async function getStudentsByRoute(req, res) {
  const { routeId } = req.params;

  const allowedCities = req.allowedCities;

  const reservations = await prisma.reservation.findMany({
    where: {
      routeId: Number(routeId),
      status: "confirmed",
      user: {
        cityId: {
          in: allowedCities,
        },
      },
    },
    include: {
      user: true,
      pickupPoint: true,
    },
  });

  const grouped = {};

  reservations.forEach((r) => {
    const city = r.user.cityId;

    if (!grouped[city]) grouped[city] = [];

    grouped[city].push({
      id: r.user.id,
      nome: r.user.nome,
      institution: r.user.institution,
      ponto: r.pickupPoint?.name,
    });
  });

  return res.json(grouped);
}
