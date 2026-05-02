import { prisma } from "../lib/prisma";

export async function getMyNotifications(req, res) {
  const userId = req.user.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });

  return res.json({ notifications, unreadCount });
}

export async function markNotificationAsRead(req, res) {
  const userId = req.user.id;
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    return res.status(404).json({ error: "Notificação não encontrada" });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: notification.readAt ? null : new Date() },
  });

  return res.json(updated);
}

export async function markAllNotificationsAsRead(req, res) {
  const userId = req.user.id;

  await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return res.status(204).send();
}

export async function deleteNotification(req, res) {
  const userId = req.user.id;
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    return res.status(404).json({ error: "Notificação não encontrada" });
  }

  await prisma.notification.delete({ where: { id } });
  return res.status(204).send();
}

export async function clearMyNotifications(req, res) {
  const userId = req.user.id;
  await prisma.notification.deleteMany({ where: { userId } });
  return res.status(204).send();
}
