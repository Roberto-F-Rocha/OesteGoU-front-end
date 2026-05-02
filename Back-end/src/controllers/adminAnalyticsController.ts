import { prisma } from "../lib/prisma";

function getHour(time?: string | null) {
  const hour = Number(String(time ?? "").split(":")[0]);
  return Number.isFinite(hour) ? hour : -1;
}

function shiftFromTime(time?: string | null) {
  const hour = getHour(time);
  if (hour >= 18) return "noite";
  if (hour >= 12) return "tarde";
  return "manha";
}

function ensureNumberMapValue(map: Map<string, any>, key: string, initial: any) {
  if (!map.has(key)) map.set(key, initial);
  return map.get(key);
}

export async function getAnalyticsDashboard(req: any, res: any) {
  const authenticatedUser = req.user;

  if (!authenticatedUser?.cityId) {
    return res.status(403).json({ error: "Administrador sem cidade definida" });
  }

  const ownCityId = authenticatedUser.cityId;
  const ownCityFilter = { cityId: ownCityId };

  const agreements = await prisma.cityAgreement.findMany({
    where: {
      status: "active",
      OR: [{ requesterCityId: ownCityId }, { partnerCityId: ownCityId }],
    },
    include: {
      requesterCity: true,
      partnerCity: true,
    },
  });

  const partnerCityIds = agreements.map((agreement) =>
    agreement.requesterCityId === ownCityId ? agreement.partnerCityId : agreement.requesterCityId,
  );

  const networkCityIds = Array.from(new Set([ownCityId, ...partnerCityIds]));

  const [
    totalUsers,
    usersByRole,
    usersByStatus,
    reservations,
    totalRoutes,
    totalVehicles,
    totalPushSent,
    totalDocuments,
    studentsByCityRaw,
    driversByCityRaw,
    vehiclesByCityRaw,
    routesByCityRaw,
    reservationsFull,
  ] = await Promise.all([
    prisma.user.count({ where: ownCityFilter }),
    prisma.user.groupBy({ by: ["role"], where: ownCityFilter, _count: true }),
    prisma.user.groupBy({ by: ["status"], where: ownCityFilter, _count: true }),
    prisma.reservation.groupBy({ by: ["status"], where: { route: { cityId: ownCityId } }, _count: true }),
    prisma.transportRoute.count({ where: ownCityFilter }),
    prisma.vehicle.count({ where: ownCityFilter }),
    prisma.pushSendLog.count({ where: ownCityFilter }),
    prisma.userDocument.count({ where: { user: { cityId: ownCityId } } }),
    prisma.user.groupBy({ by: ["cityId"], where: { cityId: { in: networkCityIds }, role: "student" }, _count: true }),
    prisma.user.groupBy({ by: ["cityId"], where: { cityId: { in: networkCityIds }, role: "driver" }, _count: true }),
    prisma.vehicle.groupBy({ by: ["cityId"], where: { cityId: { in: networkCityIds } }, _count: true }),
    prisma.transportRoute.groupBy({ by: ["cityId"], where: { cityId: { in: networkCityIds } }, _count: true }),
    prisma.reservation.findMany({
      where: {
        status: "confirmed",
        route: { cityId: { in: networkCityIds } },
      },
      include: {
        user: { include: { city: true } },
        route: {
          include: {
            city: true,
            schedule: { include: { university: true } },
            vehicle: true,
          },
        },
        schedule: { include: { university: true } },
      },
    }),
  ]);

  const cities = await prisma.city.findMany({
    where: { id: { in: networkCityIds } },
    orderBy: [{ state: "asc" }, { name: "asc" }],
  });

  const cityById = new Map(cities.map((city) => [city.id, city]));

  const studentsByCity = studentsByCityRaw.map((item) => ({
    cityId: item.cityId,
    city: item.cityId ? cityById.get(item.cityId) : null,
    total: item._count,
    isOwnCity: item.cityId === ownCityId,
  }));

  const driversByCity = driversByCityRaw.map((item) => ({
    cityId: item.cityId,
    city: item.cityId ? cityById.get(item.cityId) : null,
    total: item._count,
    isOwnCity: item.cityId === ownCityId,
  }));

  const vehiclesByCity = vehiclesByCityRaw.map((item) => ({
    cityId: item.cityId,
    city: item.cityId ? cityById.get(item.cityId) : null,
    total: item._count,
    isOwnCity: item.cityId === ownCityId,
  }));

  const routesByCity = routesByCityRaw.map((item) => ({
    cityId: item.cityId,
    city: item.cityId ? cityById.get(item.cityId) : null,
    total: item._count,
    isOwnCity: item.cityId === ownCityId,
  }));

  const studentsByCityShiftMap = new Map<string, any>();
  const loadRankingMap = new Map<string, any>();

  for (const reservation of reservationsFull) {
    const studentCity = reservation.user?.city;
    const routeCity = reservation.route?.city;
    const schedule = reservation.route?.schedule ?? reservation.schedule;
    const shift = shiftFromTime(schedule?.time);
    const dayOfWeek = reservation.dayOfWeek ?? "Sem dia";
    const cityId = studentCity?.id ?? 0;
    const cityKey = `${cityId}-${dayOfWeek}-${shift}`;

    const cityShiftRow = ensureNumberMapValue(studentsByCityShiftMap, cityKey, {
      cityId,
      city: studentCity ?? null,
      dayOfWeek,
      shift,
      total: 0,
    });
    cityShiftRow.total += 1;

    const rankingKey = `${reservation.routeId}-${dayOfWeek}-${shift}`;
    const rankingRow = ensureNumberMapValue(loadRankingMap, rankingKey, {
      routeId: reservation.routeId,
      routeName: reservation.route?.name,
      routeCity,
      dayOfWeek,
      shift,
      scheduleTime: schedule?.time,
      university: schedule?.university?.name,
      vehicle: reservation.route?.vehicle,
      totalStudents: 0,
      studentsByCity: {},
    });

    rankingRow.totalStudents += 1;
    const studentCityName = studentCity ? `${studentCity.name}/${studentCity.state}` : "Cidade não informada";
    rankingRow.studentsByCity[studentCityName] = (rankingRow.studentsByCity[studentCityName] ?? 0) + 1;
  }

  const studentsByCityAndShift = Array.from(studentsByCityShiftMap.values()).sort((a, b) =>
    String(a.city?.name ?? "").localeCompare(String(b.city?.name ?? "")) ||
    String(a.dayOfWeek).localeCompare(String(b.dayOfWeek)) ||
    String(a.shift).localeCompare(String(b.shift)),
  );

  const loadRanking = Array.from(loadRankingMap.values())
    .sort((a, b) => b.totalStudents - a.totalStudents)
    .slice(0, 15);

  const latestPushes = await prisma.pushSendLog.findMany({
    where: { cityId: { in: networkCityIds } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      city: { select: { name: true, state: true } },
      sentBy: { select: { nome: true, email: true } },
    },
  });

  const recentNotifications = await prisma.notification.findMany({
    where: {
      user: { cityId: { in: networkCityIds } },
      OR: [
        { type: "warning" },
        { title: { contains: "superlot", mode: "insensitive" } },
        { message: { contains: "capacidade", mode: "insensitive" } },
      ],
    },
    include: {
      user: { select: { id: true, nome: true, email: true, role: true, city: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
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
    partnership: {
      ownCityId,
      partnerCityIds,
      networkCityIds,
      agreements,
      studentsTotalNetwork: studentsByCity.reduce((sum, item) => sum + item.total, 0),
      driversTotalNetwork: driversByCity.reduce((sum, item) => sum + item.total, 0),
      vehiclesTotalNetwork: vehiclesByCity.reduce((sum, item) => sum + item.total, 0),
      routesTotalNetwork: routesByCity.reduce((sum, item) => sum + item.total, 0),
      studentsByCity,
      studentsByCityAndShift,
      driversByCity,
      vehiclesByCity,
      routesByCity,
      loadRanking,
      recentNotifications,
    },
    latestPushes,
  });
}
