import { prisma } from "../lib/prisma";

export async function cityAccess(req, res, next) {
  const user = req.user;

  if (!user || !user.cityId) {
    return res.status(403).json({ error: "Usuário sem cidade definida" });
  }

  // buscar acordos ativos
  const agreements = await prisma.cityAgreement.findMany({
    where: {
      status: "active",
      OR: [
        { requesterCityId: user.cityId },
        { partnerCityId: user.cityId },
      ],
    },
  });

  const allowedCities = new Set<number>();
  allowedCities.add(user.cityId);

  agreements.forEach((a) => {
    if (a.requesterCityId === user.cityId) {
      allowedCities.add(a.partnerCityId);
    } else {
      allowedCities.add(a.requesterCityId);
    }
  });

  req.allowedCities = Array.from(allowedCities);

  return next();
}
