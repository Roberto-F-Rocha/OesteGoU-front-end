import { prisma } from "../lib/prisma";
import { sendPushToUser } from "../services/pushService";

type PushTarget = "all" | "student" | "driver" | "admin";

export async function sendPush(req: any, res: any) {
  const { title, message, url = "/", target = "all", cityId } = req.body as {
    title?: string;
    message?: string;
    url?: string;
    target?: PushTarget;
    cityId?: number;
  };

  if (!title || !message) {
    return res.status(400).json({ error: "Título e mensagem são obrigatórios" });
  }

  const authenticatedUser = req.user;
  const where: any = { status: "active" };

  if (target !== "all") {
    where.role = target;
  }

  if (cityId) {
    where.cityId = Number(cityId);
  } else if (authenticatedUser?.cityId) {
    where.cityId = authenticatedUser.cityId;
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  });

  let sent = 0;
  await Promise.all(
    users.map(async (user) => {
      try {
        await sendPushToUser(user.id, { title, body: message, url });
        sent += 1;
      } catch {
        // mantém envio para os demais usuários mesmo se um dispositivo falhar
      }
    })
  );

  const log = await prisma.pushSendLog.create({
    data: {
      title,
      message,
      url,
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

  if (authenticatedUser?.cityId) {
    where.cityId = authenticatedUser.cityId;
  }

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
