import { NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sendPushToUser } from "../services/pushService";
import { createNotification } from "../services/notificationService";

type PushTarget = "all" | "student" | "driver" | "admin";

function getDefaultLinkByRole(role: string) {
  if (role === "student") return "/aluno/notificacoes";
  if (role === "driver") return "/motorista/notificacoes";
  if (role === "admin") return "/admin/push";
  return "/";
}

function normalizeTarget(target: unknown): PushTarget {
  if (target === "student" || target === "driver" || target === "admin" || target === "all") return target;
  return "all";
}

export async function sendPush(req: any, res: any) {
  const title = String(req.body?.title ?? "").trim();
  const message = String(req.body?.message ?? "").trim();
  const target = normalizeTarget(req.body?.target);
  const requestedCityId = req.body?.cityId ? Number(req.body.cityId) : null;
  const authenticatedUser = req.user;

  if (!title || !message) return res.status(400).json({ error: "Título e mensagem são obrigatórios" });

  const where: any = { status: "active" };
  if (target !== "all") where.role = target;
  if (requestedCityId) where.cityId = requestedCityId;

  const users = await prisma.user.findMany({
    where,
    select: { id: true, role: true, email: true, nome: true, cityId: true, status: true },
  });

  if (!users.length) {
    const log = await prisma.pushSendLog.create({
      data: {
        title,
        message,
        url: target === "all" ? "/" : getDefaultLinkByRole(target),
        target,
        targetRole: target === "all" ? null : target,
        cityId: requestedCityId ?? authenticatedUser?.cityId ?? null,
        sentById: authenticatedUser?.id ?? null,
        recipients: 0,
      },
    });

    return res.json({ success: true, sent: 0, log, recipients: [], warning: "Nenhum usuário ativo encontrado para o público selecionado." });
  }

  let sent = 0;
  const recipients: Array<{ id: number; role: string; email: string | null }> = [];

  await Promise.all(users.map(async (user) => {
    const link = getDefaultLinkByRole(user.role);
    try {
      const notification = await createNotification({
        userId: user.id,
        title,
        message,
        type: NotificationType.info,
        link,
        metadata: {
          source: "admin_push",
          senderRole: "admin",
          senderId: authenticatedUser?.id ?? null,
          senderEmail: authenticatedUser?.email ?? null,
          target,
          recipientRole: user.role,
          recipientEmail: user.email,
          cityId: user.cityId ?? null,
        },
      });

      try {
        await sendPushToUser(user.id, { title, body: message, url: link });
      } catch (pushError) {
        console.error("Erro ao enviar push web, notificação interna criada", pushError);
      }

      sent += 1;
      recipients.push({ id: user.id, role: user.role, email: user.email });
      return notification;
    } catch (error) {
      console.error("Erro ao criar notificação interna", error);
      return null;
    }
  }));

  const log = await prisma.pushSendLog.create({
    data: {
      title,
      message,
      url: target === "all" ? "/" : getDefaultLinkByRole(target),
      target,
      targetRole: target === "all" ? null : target,
      cityId: requestedCityId ?? authenticatedUser?.cityId ?? null,
      sentById: authenticatedUser?.id ?? null,
      recipients: sent,
    },
  });

  return res.json({ success: true, sent, log, recipients });
}

export async function getPushHistory(req: any, res: any) {
  const authenticatedUser = req.user;
  const where: any = {};
  if (authenticatedUser?.cityId) where.cityId = authenticatedUser.cityId;

  const history = await prisma.pushSendLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      city: { select: { name: true, state: true } },
      sentBy: { select: { id: true, nome: true, email: true } },
    },
  });

  return res.json(history);
}
