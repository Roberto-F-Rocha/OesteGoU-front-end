import { prisma } from "../lib/prisma";
import { emitToAdmins, emitToUser, emitToCity } from "../lib/socket";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

type TicketSeverity = "low" | "medium" | "high";
type TicketStatus = "open" | "in_progress" | "resolved" | "canceled";

const allowedSeverities: TicketSeverity[] = ["low", "medium", "high"];
const allowedStatuses: TicketStatus[] = ["open", "in_progress", "resolved", "canceled"];

function normalizeTicket(ticket: any) {
  return {
    ...ticket,
    busId: ticket.vehicleId,
    vehicle: ticket.vehicle,
    openedBy: ticket.openedBy,
    resolvedBy: ticket.resolvedBy,
  };
}

async function createNotification(userId: number, title: string, message: string, type: "info" | "success" | "warning" | "error", link?: string, metadata?: Record<string, unknown>) {
  const notification = await prisma.notification.create({
    data: { userId, title, message, type, link, metadata },
  });
  emitToUser(userId, "notification:new", notification);
  return notification;
}

async function notifyCityAdmins(cityId: number, payload: any) {
  const admins = await prisma.user.findMany({
    where: { role: "admin", cityId, status: "active" },
    select: { id: true },
  });

  await Promise.all(admins.map((admin) => createNotification(
    admin.id,
    "Novo chamado de manutenção",
    `${payload.openedBy?.nome ?? "Motorista"} abriu um chamado para o ônibus ${payload.vehicle?.plate ?? "informado"}.`,
    payload.severity === "high" ? "warning" : "info",
    "/admin/manutencao",
    { ticketId: payload.id, vehicleId: payload.vehicleId, severity: payload.severity, status: payload.status },
  )));
}

const include = {
  vehicle: true,
  city: true,
  openedBy: { select: { id: true, nome: true, email: true, role: true } },
  resolvedBy: { select: { id: true, nome: true, email: true, role: true } },
};

export async function createMaintenanceTicket(req, res) {
  const user = req.user;
  const { vehicleId, title, description, severity = "medium" } = req.body ?? {};

  if (user.role !== "driver") return res.status(403).json({ error: "Apenas motoristas podem abrir chamados" });
  if (!user.cityId) return res.status(403).json({ error: "Usuário sem cidade definida" });
  if (!vehicleId || !Number(vehicleId)) return res.status(400).json({ error: "Ônibus é obrigatório" });
  if (!title?.trim()) return res.status(400).json({ error: "Título é obrigatório" });
  if (!description?.trim()) return res.status(400).json({ error: "Descrição é obrigatória" });
  if (!allowedSeverities.includes(severity)) return res.status(400).json({ error: "Gravidade inválida" });

  const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } });
  if (!vehicle) return res.status(404).json({ error: "Ônibus não encontrado" });
  if (vehicle.cityId !== user.cityId) return res.status(403).json({ error: "Ônibus não pertence à sua cidade" });

  const ticket = await prisma.maintenanceTicket.create({
    data: {
      vehicleId: vehicle.id,
      cityId: vehicle.cityId,
      openedById: user.id,
      title: title.trim(),
      description: description.trim(),
      severity,
      status: "open",
    },
    include,
  });

  const payload = normalizeTicket(ticket);

  await notifyCityAdmins(ticket.cityId, payload);
  emitToAdmins("maintenance:ticket-created", payload);
  emitToCity(ticket.cityId, "maintenance:ticket-created", payload);
  emitToUser(user.id, "maintenance:ticket-created", payload);

  await createAuditLog({
    userId: user.id,
    cityId: user.cityId,
    action: "create",
    entity: "MaintenanceTicket",
    entityId: String(ticket.id),
    description: "Motorista abriu chamado de manutenção",
    metadata: { vehicleId: ticket.vehicleId, severity: ticket.severity },
    ...getRequestAuditData(req, res),
  });

  return res.status(201).json(payload);
}

export async function getMyMaintenanceTickets(req, res) {
  const user = req.user;
  if (user.role !== "driver") return res.status(403).json({ error: "Apenas motoristas podem acessar seus chamados" });

  const tickets = await prisma.maintenanceTicket.findMany({
    where: { openedById: user.id },
    include,
    orderBy: { createdAt: "desc" },
  });

  return res.json(tickets.map(normalizeTicket));
}

export async function listMaintenanceTickets(req, res) {
  const user = req.user;
  if (user.role !== "admin") return res.status(403).json({ error: "Apenas administradores podem listar chamados" });
  if (!user.cityId) return res.status(403).json({ error: "Usuário sem cidade definida" });

  const { status, severity } = req.query;
  const where: any = { cityId: user.cityId };
  if (status && allowedStatuses.includes(String(status) as TicketStatus)) where.status = status;
  if (severity && allowedSeverities.includes(String(severity) as TicketSeverity)) where.severity = severity;

  const tickets = await prisma.maintenanceTicket.findMany({
    where,
    include,
    orderBy: { createdAt: "desc" },
  });

  return res.json(tickets.map(normalizeTicket));
}

export async function updateMaintenanceTicket(req, res) {
  const user = req.user;
  const id = Number(req.params.id);
  const { status, resolution } = req.body ?? {};

  if (user.role !== "admin") return res.status(403).json({ error: "Apenas administradores podem atualizar chamados" });
  if (!id) return res.status(400).json({ error: "ID inválido" });
  if (status && !allowedStatuses.includes(status)) return res.status(400).json({ error: "Status inválido" });

  const current = await prisma.maintenanceTicket.findUnique({ where: { id }, include });
  if (!current) return res.status(404).json({ error: "Chamado não encontrado" });
  if (user.cityId && current.cityId !== user.cityId) return res.status(403).json({ error: "Chamado de outra cidade" });

  const nextStatus = status ?? current.status;
  const data: any = { status: nextStatus };
  if (typeof resolution === "string") data.resolution = resolution.trim() || null;
  if (nextStatus === "resolved") {
    data.resolvedById = user.id;
    data.resolvedAt = new Date();
  }
  if (nextStatus !== "resolved") {
    data.resolvedById = null;
    data.resolvedAt = null;
  }

  const ticket = await prisma.maintenanceTicket.update({
    where: { id },
    data,
    include,
  });

  const payload = normalizeTicket(ticket);

  await createNotification(
    ticket.openedById,
    "Chamado atualizado",
    `Seu chamado "${ticket.title}" foi atualizado para ${ticket.status}.`,
    ticket.status === "resolved" ? "success" : "info",
    "/motorista/frota",
    { ticketId: ticket.id, vehicleId: ticket.vehicleId, status: ticket.status },
  );

  emitToUser(ticket.openedById, "maintenance:ticket-updated", payload);
  emitToCity(ticket.cityId, "maintenance:ticket-updated", payload);
  emitToAdmins("maintenance:ticket-updated", payload);

  await createAuditLog({
    userId: user.id,
    cityId: user.cityId,
    action: "update",
    entity: "MaintenanceTicket",
    entityId: String(ticket.id),
    description: "Administrador atualizou chamado de manutenção",
    metadata: { status: ticket.status, vehicleId: ticket.vehicleId },
    ...getRequestAuditData(req, res),
  });

  return res.json(payload);
}
