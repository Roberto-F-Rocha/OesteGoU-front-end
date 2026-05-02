import { prisma } from "../lib/prisma";

export async function getAvailableRoutes(req, res) {
  const user = req.user;

  if (!user?.cityId) {
    return res.status(403).json({ error: "Usuário sem cidade definida" });
  }

  const activeAgreements = await prisma.cityAgreement.findMany({
    where: {
      status: "active",
      OR: [
        { requesterCityId: user.cityId },
        { partnerCityId: user.cityId },
      ],
    },
    select: {
      requesterCityId: true,
      partnerCityId: true,
    },
  });

  const allowedCityIds = Array.from(
    new Set([
      user.cityId,
      ...activeAgreements.flatMap((agreement) => [agreement.requesterCityId, agreement.partnerCityId]),
    ]),
  );

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
      points: { include: { pickupPoint: true }, orderBy: { order: "asc" } },
      reservations: { where: { status: "confirmed" } },
    },
    orderBy: [
      { schedule: { time: "asc" } },
      { name: "asc" },
    ],
  });

  return res.json(routes);
}
