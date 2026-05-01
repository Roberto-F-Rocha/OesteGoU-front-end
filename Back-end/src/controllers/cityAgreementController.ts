import { prisma } from "../lib/prisma";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

export async function listCityAgreements(req, res) {
  const user = req.user;

  if (!user?.cityId) {
    return res.status(403).json({ error: "Usuário sem cidade definida" });
  }

  const agreements = await prisma.cityAgreement.findMany({
    where: {
      OR: [
        { requesterCityId: user.cityId },
        { partnerCityId: user.cityId },
      ],
    },
    include: {
      requesterCity: true,
      partnerCity: true,
      requestedBy: {
        select: { id: true, nome: true, email: true },
      },
      approvedBy: {
        select: { id: true, nome: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(agreements);
}

export async function createCityAgreement(req, res) {
  const user = req.user;
  const { partnerCityId, title, description, startsAt, endsAt } = req.body;

  if (!user?.cityId) {
    return res.status(403).json({ error: "Usuário sem cidade definida" });
  }

  if (user.role !== "admin") {
    return res.status(403).json({ error: "Apenas administradores podem solicitar vínculos entre cidades" });
  }

  if (!partnerCityId) {
    return res.status(400).json({ error: "Cidade parceira é obrigatória" });
  }

  if (Number(partnerCityId) === Number(user.cityId)) {
    return res.status(400).json({ error: "Não é possível vincular a cidade com ela mesma" });
  }

  const partnerCity = await prisma.city.findUnique({
    where: { id: Number(partnerCityId) },
  });

  if (!partnerCity) {
    return res.status(404).json({ error: "Cidade parceira não encontrada" });
  }

  const agreement = await prisma.cityAgreement.create({
    data: {
      requesterCityId: user.cityId,
      partnerCityId: Number(partnerCityId),
      status: "pending",
      title,
      description,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      endsAt: endsAt ? new Date(endsAt) : undefined,
      requestedById: user.id,
    },
    include: {
      requesterCity: true,
      partnerCity: true,
    },
  });

  await createAuditLog({
    userId: user.id,
    cityId: user.cityId,
    action: "create",
    entity: "CityAgreement",
    entityId: agreement.id,
    description: `Solicitou vínculo com ${partnerCity.name}/${partnerCity.state}`,
    metadata: { partnerCityId },
    ...getRequestAuditData(req, res),
  });

  return res.status(201).json(agreement);
}

export async function updateCityAgreementStatus(req, res) {
  const user = req.user;
  const { id } = req.params;
  const { status } = req.body;

  if (!user?.cityId) {
    return res.status(403).json({ error: "Usuário sem cidade definida" });
  }

  if (user.role !== "admin") {
    return res.status(403).json({ error: "Apenas administradores podem alterar vínculos entre cidades" });
  }

  const validStatuses = ["pending", "active", "rejected", "inactive", "canceled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }

  const agreement = await prisma.cityAgreement.findUnique({
    where: { id: Number(id) },
  });

  if (!agreement) {
    return res.status(404).json({ error: "Vínculo não encontrado" });
  }

  const belongsToUserCity =
    agreement.requesterCityId === user.cityId || agreement.partnerCityId === user.cityId;

  if (!belongsToUserCity) {
    return res.status(403).json({ error: "Você não tem permissão para alterar esse vínculo" });
  }

  const updated = await prisma.cityAgreement.update({
    where: { id: Number(id) },
    data: {
      status,
      approvedById: status === "active" ? user.id : agreement.approvedById,
    },
    include: {
      requesterCity: true,
      partnerCity: true,
    },
  });

  await createAuditLog({
    userId: user.id,
    cityId: user.cityId,
    action: status === "active" ? "approve" : status === "rejected" ? "reject" : "update",
    entity: "CityAgreement",
    entityId: updated.id,
    description: `Alterou vínculo entre cidades para ${status}`,
    metadata: { status },
    ...getRequestAuditData(req, res),
  });

  return res.json(updated);
}

export async function listCities(req, res) {
  const cities = await prisma.city.findMany({
    orderBy: [{ state: "asc" }, { name: "asc" }],
  });

  return res.json(cities);
}
