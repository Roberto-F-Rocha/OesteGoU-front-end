import { NotificationType, Prisma } from "@prisma/client";
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
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link,
      metadata: metadata as Prisma.InputJsonObject,
    },
  });
}

export async function notifyUsers(
  userIds: number[],
  input: Omit<CreateNotificationInput, "userId">,
) {
  if (!userIds.length) return;

  const metadata = input.metadata ?? {};

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title: input.title,
      message: input.message,
      type: input.type ?? NotificationType.info,
      link: input.link,
      metadata: metadata as Prisma.InputJsonObject,
    })),
  });
}