import { prisma } from "../lib/prisma";

type NotificationType = "info" | "success" | "warning" | "error";

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
  type = "info",
  link,
  metadata,
}: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link,
      metadata,
    },
  });
}

export async function notifyUsers(userIds: number[], input: Omit<CreateNotificationInput, "userId">) {
  if (!userIds.length) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "info",
      link: input.link,
      metadata: input.metadata,
    })),
  });
}
