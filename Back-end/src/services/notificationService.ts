import { NotificationType, Prisma } from "@prisma/client";
import { emitToUser } from "../lib/socket";
import { prisma } from "../lib/prisma";

interface CreateNotificationInput {
  userId: number;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification({
  userId,
  title,
  message,
  type = NotificationType.info,
  link,
  metadata = {},
}: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link,
      metadata: metadata as Prisma.InputJsonObject,
    },
  });

  emitToUser(userId, "notification:new", notification);

  return notification;
}

export async function notifyUsers(
  userIds: number[],
  input: Omit<CreateNotificationInput, "userId">,
) {
  if (!userIds.length) return 0;

  const uniqueUserIds = Array.from(new Set(userIds));
  const metadata = input.metadata ?? {};

  await prisma.notification.createMany({
    data: uniqueUserIds.map((userId) => ({
      userId,
      title: input.title,
      message: input.message,
      type: input.type ?? NotificationType.info,
      link: input.link,
      metadata: metadata as Prisma.InputJsonObject,
    })),
  });

  uniqueUserIds.forEach((userId) => {
    emitToUser(userId, "notification:new", {
      title: input.title,
      message: input.message,
      type: input.type ?? NotificationType.info,
      link: input.link,
      metadata,
      createdAt: new Date().toISOString(),
    });
  });

  return uniqueUserIds.length;
}