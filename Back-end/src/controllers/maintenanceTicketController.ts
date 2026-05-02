import { prisma } from "../lib/prisma";
import { emitToAdmins, emitToUser, emitToCity } from "../lib/socket";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

const MAX_TITLE = 120;
const MIN_TITLE = 3;
const MAX_DESC = 500;

function validateText(field: string, min: number, max: number) {
  if (!field || typeof field !== "string") return false;
  const trimmed = field.trim();
  return trimmed.length >= min && trimmed.length <= max;
}

function normalizeTicket(ticket: any) {
  return {
    ...ticket,
    busId: ticket.vehicleId,
  };
}

async function createNotification(userId: number, title: string, message: string, type: any, link?: string, metadata?: any) {
  const notification = await prisma.notification.create({
    data: { userId, title, message, type, link, metadata },
  });
  emitToUser(userId, "notification:new", notification);
}

export async function createMaintenanceTicket(req, res) {
  try {
    const user = req.user;
    const { vehicleId, title, description, severity = "medium" } = req.body ?? {};

    if (user.role !== "driver") return res.status(403).json({ error: "Apenas motoristas" });
    if (!validateText(title, MIN_TITLE, MAX_TITLE)) return res.status(400).json({ error: "Título inválido" });
    if (!validateText(description, 5, MAX_DESC)) return res.status(400).json({ error: "Descrição inválida" });

    const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } });
    if (!vehicle) return res.status(404).json({ error: "Ônibus não encontrado" });

    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceTicket.create({
        data: {
          vehicleId: vehicle.id,
          cityId: vehicle.cityId,
          openedById: user.id,
          title: title.trim(),
          description: description.trim(),
          severity,
        },
      });

      await createNotification(user.id, "Chamado criado", "Seu chamado foi aberto", "info");

      return created;
    });

    const payload = normalizeTicket(ticket);

    emitToAdmins("maintenance:ticket-created", payload);
    emitToCity(ticket.cityId, "maintenance:ticket-created", payload);

    return res.status(201).json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  }
}

export async function getMyMaintenanceTickets(req, res) {
  const user = req.user;
  const page = Number(req.query.page || 1);
  const take = 10;

  const tickets = await prisma.maintenanceTicket.findMany({
    where: { openedById: user.id },
    take,
    skip: (page - 1) * take,
    orderBy: { createdAt: "desc" },
  });

  return res.json(tickets.map(normalizeTicket));
}

export async function listMaintenanceTickets(req, res) {
  const user = req.user;
  const page = Number(req.query.page || 1);
  const take = 10;

  const tickets = await prisma.maintenanceTicket.findMany({
    where: { cityId: user.cityId },
    take,
    skip: (page - 1) * take,
    orderBy: { createdAt: "desc" },
  });

  return res.json(tickets.map(normalizeTicket));
}

export async function updateMaintenanceTicket(req, res) {
  try {
    const id = Number(req.params.id);
    const { status, resolution } = req.body;

    const ticket = await prisma.maintenanceTicket.update({
      where: { id },
      data: {
        status,
        resolution,
      },
    });

    const payload = normalizeTicket(ticket);

    emitToUser(ticket.openedById, "maintenance:ticket-updated", payload);
    emitToAdmins("maintenance:ticket-updated", payload);

    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao atualizar" });
  }
}
