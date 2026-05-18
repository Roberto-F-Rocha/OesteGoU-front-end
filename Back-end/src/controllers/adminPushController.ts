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

export async function sendPush(req: any, res: any) {
  const { title, message, target = "all", cityId } = req.body as { title?: string; message?: string; target?: PushTarget; cityId?: number };

  if (!title?.trim() || !message?.trim()) return res.status(400).json({ error: "Título e mensagem são obrigatórios" });
  if (!["all", "student", "driver", "admin"].includes(target)) return res.status(400).json({ error: "Público-alvo inválido" });

  const authenticatedUser = req.user;
  const where: any = { status: "active" };

  if (target !== "all") where.role = target;
  if (cityId) where.cityId = Number(cityId);
  else if (authenticatedUser?.cityId) where.cityId = authenticatedUser.cityId;

  const users = await prisma.user.findMany({ where, select: { id: true, role: true } });
  let sent = 0;

  await Promise.all(users.map(async (user) => {
    try {
      const link = getDefaultLinkByRole(user.role);
      await createNotification({
        userId: user.id,
        title: title.trim(),
        message: message.trim(),
        type: NotificationType.info,
        link,
        metadata: {
          source: "admin_push",
          senderRole: "admin",
          senderId: authenticatedUser?.id ?? null,
          target,
          recipientRole: user.role,
          cityId: cityId ? Number(cityId) : authenticatedUser?.cityId ?? null,
        },
      });
      await sendPushToUser(user.id, { title: title.trim(), body: message.trim(), url: link });
      sent += 1;
    } catch (error) {
      console.error("Erro ao enviar notificação", error);
    }
  }));

  const log = await prisma.pushSendLog.create({
    data: {
      title: title.trim(),
      message: message.trim(),
      url: target === "all" ? "/" : getDefaultLinkByRole(target),
      target,
      targetRole: target === "all" ? null : target,
      cityId: cityId ? Number(cityId) : authenticatedUser?.cityId ?? null,
      sentById: authenticatedUser?.id ?? null,
      recipients: sent,
    },
  });

  return res.json({ success: true, sent, log });
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
