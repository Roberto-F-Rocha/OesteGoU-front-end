import { prisma } from "../lib/prisma";

export async function getDriverRoutes(req, res) {
  const user = req.user;
  const allowedCities = req.allowedCities ?? (user?.cityId ? [user.cityId] : []);

  if (!user?.cityId) {
    return res.status(403).json({ error: "Usuário sem cidade definida" });
  }

  if (user.role !== "driver" && user.role !== "admin") {
    return res.status(403).json({ error: "Acesso permitido apenas para motoristas e administradores" });
  }

  const routes = await prisma.transportRoute.findMany({
    where: {
      cityId: { in: allowedCities },
      ...(user.role === "driver" ? { driverId: user.id } : {}),
    },
    include: {
      city: true,
      schedule: {
        include: {
          university: true,
        },
      },
      vehicle: true,
      driver: {
        select: {
          id: true,
          nome: true,
          email: true,
          phone: true,
        },
      },
      points: {
        include: {
          pickupPoint: true,
        },
        orderBy: {
          order: "asc",
        },
      },
      reservations: {
        where: {
          status: "confirmed",
        },
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              email: true,
              institution: true,
              city: true,
            },
          },
          pickupPoint: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.json(routes);
}
