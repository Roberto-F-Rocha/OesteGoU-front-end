import { prisma } from "../lib/prisma";

export async function getAnalyticsDashboard(req: any, res: any) {
  const authenticatedUser = req.user;
  const cityFilter = authenticatedUser?.cityId ? { cityId: authenticatedUser.cityId } : {};

  const [
    totalUsers,
    usersByRole,
    usersByStatus,
    reservations,
    totalRoutes,
    totalVehicles,
    totalPushSent,
    totalDocuments,
  ] = await Promise.all([
    prisma.user.count({ where: cityFilter }),
    prisma.user.groupBy({ by: ["role"], where: cityFilter, _count: true }),
    prisma.user.groupBy({ by: ["status"], where: cityFilter, _count: true }),
    prisma.reservation.groupBy({ by: ["status"], _count: true }),
    prisma.transportRoute.count({ where: cityFilter }),
    prisma.vehicle.count({ where: cityFilter }),
    prisma.pushSendLog.count({ where: cityFilter }),
    prisma.userDocument.count(),
  ]);

  const latestPushes = await prisma.pushSendLog.findMany({
    where: cityFilter,
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      city: { select: { name: true, state: true } },
      sentBy: { select: { nome: true, email: true } },
    },
  });

  return res.json({
    totalUsers,
    usersByRole,
    usersByStatus,
    reservations,
    totalRoutes,
    totalVehicles,
    totalPushSent,
    totalDocuments,
    latestPushes,
  });
}
