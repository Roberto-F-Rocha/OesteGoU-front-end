import { NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createNotification } from "../services/notificationService";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

async function notifyCityAdmins(
  cityId: number,
  title: string,
  message: string,
  metadata: Record<string, unknown> = {},
) {
  const admins = await prisma.user.findMany({
    where: {
      cityId,
      role: "admin",
      status: "active",
    },
    select: {
      id: true,
    },
  });

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        title,
        message,
        type: NotificationType.info,
        link: "/admin/parcerias",
        metadata,
      }),
    ),
  );

  return admins.length;
}

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
    return res.status(403).json({
      error: "Apenas administradores podem solicitar vínculos entre cidades",
    });
  }

  if (!partnerCityId) {
    return res.status(400).json({ error: "Cidade parceira é obrigatória" });
  }

  const requesterCityId = Number(user.cityId);
  const targetCityId = Number(partnerCityId);

  if (!Number.isFinite(targetCityId)) {
    return res.status(400).json({ error: "Cidade parceira inválida" });
  }

  if (targetCityId === requesterCityId) {
    return res.status(400).json({
      error: "Não é possível vincular a cidade com ela mesma",
    });
  }

  const [requesterCity, partnerCity] = await Promise.all([
    prisma.city.findUnique({ where: { id: requesterCityId } }),
    prisma.city.findUnique({ where: { id: targetCityId } }),
  ]);

  if (!requesterCity) {
    return res.status(404).json({ error: "Cidade solicitante não encontrada" });
  }

  if (!partnerCity) {
    return res.status(404).json({ error: "Cidade parceira não encontrada" });
  }

  const existingAgreement = await prisma.cityAgreement.findFirst({
    where: {
      OR: [
        {
          requesterCityId,
          partnerCityId: targetCityId,
          status: { in: ["pending", "active"] },
        },
        {
          requesterCityId: targetCityId,
          partnerCityId: requesterCityId,
          status: { in: ["pending", "active"] },
        },
      ],
    },
  });

  if (existingAgreement) {
    return res.status(409).json({
      error:
        existingAgreement.status === "active"
          ? "Já existe um vínculo ativo com essa cidade"
          : "Já existe uma solicitação pendente com essa cidade",
    });
  }

  const agreement = await prisma.cityAgreement.create({
    data: {
      requesterCityId,
      partnerCityId: targetCityId,
      status: "pending",
      title: title || "Vínculo de transporte universitário",
      description,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      endsAt: endsAt ? new Date(endsAt) : undefined,
      requestedById: user.id,
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
  });

  await notifyCityAdmins(
    targetCityId,
    "Novo convite de parceria",
    `${requesterCity.name}/${requesterCity.state} enviou um convite para parceria de transporte universitário.`,
    {
      source: "city_agreement_invite",
      agreementId: agreement.id,
      requesterCityId,
      partnerCityId: targetCityId,
    },
  );

  await createAuditLog({
    userId: user.id,
    cityId: requesterCityId,
    action: "create",
    entity: "CityAgreement",
    entityId: agreement.id,
    description: `Solicitou vínculo com ${partnerCity.name}/${partnerCity.state}`,
    metadata: {
      partnerCityId: targetCityId,
      agreementId: agreement.id,
    },
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
    return res.status(403).json({
      error: "Apenas administradores podem alterar vínculos entre cidades",
    });
  }

  const validStatuses = ["active", "rejected", "inactive", "canceled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }

  const agreement = await prisma.cityAgreement.findUnique({
    where: { id: Number(id) },
    include: {
      requesterCity: true,
      partnerCity: true,
    },
  });

  if (!agreement) {
    return res.status(404).json({ error: "Vínculo não encontrado" });
  }

  const userCityId = Number(user.cityId);
  const isRequester = agreement.requesterCityId === userCityId;
  const isPartner = agreement.partnerCityId === userCityId;

  if (!isRequester && !isPartner) {
    return res.status(403).json({
      error: "Você não tem permissão para alterar esse vínculo",
    });
  }

  if (agreement.status === "pending" && ["active", "rejected"].includes(status)) {
    if (!isPartner) {
      return res.status(403).json({
        error: "Apenas a cidade convidada pode aceitar ou rejeitar o convite",
      });
    }
  }

  if (agreement.status === "pending" && status === "canceled") {
    if (!isRequester) {
      return res.status(403).json({
        error: "Apenas a cidade solicitante pode cancelar o convite",
      });
    }
  }

  if (status === "inactive" && agreement.status !== "active") {
    return res.status(400).json({
      error: "Apenas vínculos ativos podem ser inativados",
    });
  }

  if (["active", "rejected"].includes(status) && agreement.status !== "pending") {
    return res.status(400).json({
      error: "Apenas convites pendentes podem ser aceitos ou rejeitados",
    });
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
      requestedBy: {
        select: { id: true, nome: true, email: true },
      },
      approvedBy: {
        select: { id: true, nome: true, email: true },
      },
    },
  });

  if (status === "active") {
    await notifyCityAdmins(
      agreement.requesterCityId,
      "Parceria aceita",
      `${agreement.partnerCity.name}/${agreement.partnerCity.state} aceitou seu convite de parceria.`,
      {
        source: "city_agreement_accepted",
        agreementId: agreement.id,
      },
    );
  }

  if (status === "rejected") {
    await notifyCityAdmins(
      agreement.requesterCityId,
      "Parceria rejeitada",
      `${agreement.partnerCity.name}/${agreement.partnerCity.state} rejeitou seu convite de parceria.`,
      {
        source: "city_agreement_rejected",
        agreementId: agreement.id,
      },
    );
  }

  if (status === "inactive") {
    const otherCityId = isRequester
      ? agreement.partnerCityId
      : agreement.requesterCityId;

    await notifyCityAdmins(
      otherCityId,
      "Parceria inativada",
      `O vínculo entre ${agreement.requesterCity.name}/${agreement.requesterCity.state} e ${agreement.partnerCity.name}/${agreement.partnerCity.state} foi inativado.`,
      {
        source: "city_agreement_inactivated",
        agreementId: agreement.id,
      },
    );
  }

  await createAuditLog({
    userId: user.id,
    cityId: userCityId,
    action:
      status === "active"
        ? "approve"
        : status === "rejected"
          ? "reject"
          : status === "canceled"
            ? "cancel"
            : "update",
    entity: "CityAgreement",
    entityId: updated.id,
    description: `Alterou vínculo entre cidades para ${status}`,
    metadata: {
      status,
      agreementId: updated.id,
      requesterCityId: updated.requesterCityId,
      partnerCityId: updated.partnerCityId,
    },
    ...getRequestAuditData(req, res),
  });

  return res.json(updated);
}

export async function listCities(req, res) {
  const user = req.user;

  const cities = await prisma.city.findMany({
    where: user?.cityId
      ? {
          id: {
            not: Number(user.cityId),
          },
        }
      : undefined,
    orderBy: [{ state: "asc" }, { name: "asc" }],
  });

  return res.json(cities);
}