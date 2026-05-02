import { prisma } from "../lib/prisma";
import { emitToAdmins, emitToUser, emitToCity } from "../lib/socket";
import { createAuditLog, getRequestAuditData } from "../utils/audit";

const MIN_TITLE = 3;
const MAX_TITLE = 120;
const MIN_DESCRIPTION = 5;
const MAX_DESCRIPTION = 500;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const ALLOWED_SEVERITIES = ["low", "medium", "high"] as const;
const ALLOWED_STATUSES = ["open", "in_progress", "resolved", "canceled"] as const;

type MaintenanceSeverity = (typeof ALLOWED_SEVERITIES)[number];
type MaintenanceStatus = (typeof ALLOWED_STATUSES)[number];

const includeTicketRelations = {
  vehicle: true,
  city: true,
  openedBy: { select: { id: true, nome: true, email: true, role: true } },
  resolvedBy: { select: { id: true, nome: true, email: true, role: true } },
};

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function validateText(value: string, min: number, max: number) {
  return value.length >= min && value.length <= max;
}

function isSeverity(value: unknown): value is MaintenanceSeverity {
  return typeof value === "string" && ALLOWED_SEVERITIES.includes(value as MaintenanceSeverity);
}

function isStatus(value: unknown): value is MaintenanceStatus {
  return typeof value === "string" && ALLOWED_STATUSES.includes(value as MaintenanceStatus);
}

function getPagination(query: any) {
  const page = Math.max(Number(query.page || 1), 1);
  const requestedTake = Number(query.take || DEFAULT_PAGE_SIZE);
  const take = Math.min(Math.max(requestedTake || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  return { page, take, skip: (page - 1) * take };
}

function normalizeTicket(ticket: any) {
  return { ...ticket, busId: ticket.vehicleId };
}

async function notifyUser(userId: number, title: string, message: string, type: "info" | "success" | "warning" | "error", link?: string, metadata?: Record<string, unknown>) {
  const notification = await prisma.notification.create({ data: { userId, title, message, type, link, metadata } });
  emitToUser(userId, "notification:new", notification);
  return notification;
}

async function notifyCityAdmins(cityId: number, payload: any) {
  const admins = await prisma.user.findMany({ where: { cityId, role: "admin", status: "active" }, select: { id: true } });
  await Promise.all(admins.map((admin) => notifyUser(
    admin.id,
    "Novo chamado de manutenção",
    `${payload.openedBy?.nome ?? "Motorista"} abriu um chamado para o ônibus ${payload.vehicle?.plate ?? "informado"}.`,
    payload.severity === "high" ? "warning" : "info",
    "/admin/manutencao",
    { ticketId: payload.id, vehicleId: payload.vehicleId, severity: payload.severity, status: payload.status },
  )));
}

export async function createMaintenanceTicket(req, res) {
  try {
    const user = req.user;
    const vehicleId = Number(req.body?.vehicleId);
    const title = sanitizeText(req.body?.title);
    const description = sanitizeText(req.body?.description);
    const severity = req.body?.severity ?? "medium";

    if (user.role !== "driver") return res.status(403).json({ error: "Apenas motoristas podem abrir chamados" });
    if (!user.cityId) return res.status(403).json({ error: "Usuário sem cidade definida" });
    if (!vehicleId || Number.isNaN(vehicleId)) return res.status(400).json({ error: "Ônibus é obrigatório" });
    if (!isSeverity(severity)) return res.status(400).json({ error: "Gravidade inválida" });
    if (!validateText(title, MIN_TITLE, MAX_TITLE)) return res.status(400).json({ error: `Título deve ter entre ${MIN_TITLE} e ${MAX_TITLE} caracteres` });
    if (!validateText(description, MIN_DESCRIPTION, MAX_DESCRIPTION)) return res.status(400).json({ error: `Descrição deve ter entre ${MIN_DESCRIPTION} e ${MAX_DESCRIPTION} caracteres` });

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: "Ônibus não encontrado" });
    if (vehicle.cityId !== user.cityId) return res.status(403).json({ error: "Ônibus não pertence à sua cidade" });

    const ticket = await prisma.maintenanceTicket.create({
      data: { vehicleId: vehicle.id, cityId: vehicle.cityId, openedById: user.id, title, description, severity },
      include: includeTicketRelations,
    });
    const payload = normalizeTicket(ticket);

    await notifyUser(user.id, "Chamado criado", `Seu chamado para o ônibus ${ticket.vehicle.plate} foi aberto.`, "success", "/motorista/frota", { ticketId: ticket.id, vehicleId: ticket.vehicleId });
    await notifyCityAdmins(ticket.cityId, payload);

    emitToAdmins("maintenance:ticket-created", payload);
    emitToCity(ticket.cityId, "maintenance:ticket-created", payload);
    emitToUser(user.id, "maintenance:ticket-created", payload);

    await createAuditLog({ userId: user.id, cityId: user.cityId, action: "create", entity: "MaintenanceTicket", entityId: String(ticket.id), description: "Motorista abriu chamado de manutenção", metadata: { vehicleId: ticket.vehicleId, severity: ticket.severity }, ...getRequestAuditData(req, res) });

    return res.status(201).json(payload);
  } catch (error) {
    console.error("[maintenanceTicket:create]", error);
    return res.status(500).json({ error: "Erro interno ao criar chamado" });
  }
}

export async function getMyMaintenanceTickets(req, res) {
  try {
    const user = req.user;
    if (user.role !== "driver") return res.status(403).json({ error: "Apenas motoristas podem acessar seus chamados" });
    const { page, take, skip } = getPagination(req.query);

    const [tickets, total] = await Promise.all([
      prisma.maintenanceTicket.findMany({ where: { openedById: user.id }, include: includeTicketRelations, take, skip, orderBy: { createdAt: "desc" } }),
      prisma.maintenanceTicket.count({ where: { openedById: user.id } }),
    ]);

    return res.json({ data: tickets.map(normalizeTicket), pagination: { page, take, total, totalPages: Math.ceil(total / take) } });
  } catch (error) {
    console.error("[maintenanceTicket:my]", error);
    return res.status(500).json({ error: "Erro interno ao listar chamados" });
  }
}

export async function listMaintenanceTickets(req, res) {
  try {
    const user = req.user;
    if (user.role !== "admin") return res.status(403).json({ error: "Apenas administradores podem listar chamados" });
    if (!user.cityId) return res.status(403).json({ error: "Usuário sem cidade definida" });
    const { page, take, skip } = getPagination(req.query);
    const where: any = { cityId: user.cityId };

    if (req.query.status) {
      if (!isStatus(req.query.status)) return res.status(400).json({ error: "Status inválido" });
      where.status = req.query.status;
    }
    if (req.query.severity) {
      if (!isSeverity(req.query.severity)) return res.status(400).json({ error: "Gravidade inválida" });
      where.severity = req.query.severity;
    }

    const [tickets, total] = await Promise.all([
      prisma.maintenanceTicket.findMany({ where, include: includeTicketRelations, take, skip, orderBy: { createdAt: "desc" } }),
      prisma.maintenanceTicket.count({ where }),
    ]);

    return res.json({ data: tickets.map(normalizeTicket), pagination: { page, take, total, totalPages: Math.ceil(total / take) } });
  } catch (error) {
    console.error("[maintenanceTicket:list]", error);
    return res.status(500).json({ error: "Erro interno ao listar chamados" });
  }
}

export async function updateMaintenanceTicket(req, res) {
  try {
    const user = req.user;
    const id = Number(req.params.id);
    const status = req.body?.status;
    const resolution = typeof req.body?.resolution === "string" ? sanitizeText(req.body.resolution) : undefined;

    if (user.role !== "admin") return res.status(403).json({ error: "Apenas administradores podem atualizar chamados" });
    if (!user.cityId) return res.status(403).json({ error: "Usuário sem cidade definida" });
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    if (status && !isStatus(status)) return res.status(400).json({ error: "Status inválido" });
    if (resolution !== undefined && resolution.length > MAX_DESCRIPTION) return res.status(400).json({ error: `Resposta deve ter no máximo ${MAX_DESCRIPTION} caracteres` });

    const current = await prisma.maintenanceTicket.findUnique({ where: { id }, include: includeTicketRelations });
    if (!current) return res.status(404).json({ error: "Chamado não encontrado" });
    if (current.cityId !== user.cityId) return res.status(403).json({ error: "Chamado pertence a outra cidade" });

    const nextStatus = status ?? current.status;
    const data: any = { status: nextStatus };
    if (resolution !== undefined) data.resolution = resolution || null;
    if (nextStatus === "resolved") { data.resolvedById = user.id; data.resolvedAt = new Date(); }
    if (nextStatus !== "resolved") { data.resolvedById = null; data.resolvedAt = null; }

    const ticket = await prisma.maintenanceTicket.update({ where: { id }, data, include: includeTicketRelations });
    const payload = normalizeTicket(ticket);

    await notifyUser(ticket.openedById, "Chamado atualizado", `Seu chamado "${ticket.title}" foi atualizado para ${ticket.status}.`, ticket.status === "resolved" ? "success" : "info", "/motorista/frota", { ticketId: ticket.id, vehicleId: ticket.vehicleId, status: ticket.status });

    emitToUser(ticket.openedById, "maintenance:ticket-updated", payload);
    emitToCity(ticket.cityId, "maintenance:ticket-updated", payload);
    emitToAdmins("maintenance:ticket-updated", payload);

    await createAuditLog({ userId: user.id, cityId: user.cityId, action: "update", entity: "MaintenanceTicket", entityId: String(ticket.id), description: "Administrador atualizou chamado de manutenção", metadata: { status: ticket.status, vehicleId: ticket.vehicleId }, ...getRequestAuditData(req, res) });

    return res.json(payload);
  } catch (error) {
    console.error("[maintenanceTicket:update]", error);
    return res.status(500).json({ error: "Erro interno ao atualizar chamado" });
  }
}
