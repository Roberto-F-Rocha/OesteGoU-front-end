import { prisma } from "../lib/prisma";

export async function getBIDashboard(req: any, res: any) {
  const user = req.user;
  const cityFilter = user?.cityId ? { cityId: user.cityId } : {};

  const [routesRankingRaw, usersByRole, reservationsByStatus, documentsByStatus, pushByTarget] = await Promise.all([
    prisma.reservation.groupBy({
      by: ["routeId"],
      where: { routeId: { not: null } },
      _count: true,
      orderBy: { _count: { routeId: "desc" } },
      take: 10,
    }),
    prisma.user.groupBy({ by: ["role"], where: cityFilter, _count: true }),
    prisma.reservation.groupBy({ by: ["status"], _count: true }),
    prisma.userDocument.groupBy({ by: ["status"], _count: true }),
    prisma.pushSendLog.groupBy({ by: ["target"], where: cityFilter, _count: true }),
  ]);

  const routeIds = routesRankingRaw.map((item) => item.routeId).filter(Boolean) as number[];
  const routes = await prisma.transportRoute.findMany({
    where: { id: { in: routeIds } },
    select: { id: true, name: true },
  });

  const routesRanking = routesRankingRaw.map((item) => {
    const route = routes.find((r) => r.id === item.routeId);
    return {
      routeId: item.routeId,
      name: route?.name ?? "Rota não identificada",
      total: item._count,
    };
  });

  return res.json({
    routesRanking,
    usersByRole: usersByRole.map((item) => ({ name: item.role, total: item._count })),
    reservationsByStatus: reservationsByStatus.map((item) => ({ name: item.status, total: item._count })),
    documentsByStatus: documentsByStatus.map((item) => ({ name: item.status, total: item._count })),
    pushByTarget: pushByTarget.map((item) => ({ name: item.target, total: item._count })),
  });
}
