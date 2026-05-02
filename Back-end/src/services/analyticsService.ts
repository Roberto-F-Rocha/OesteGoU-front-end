import { prisma } from "../lib/prisma";

export async function trackEvent(userId: number | null, event: string, metadata?: any) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        userId,
        event,
        metadata,
      },
    });
  } catch (error) {
    console.error("Erro ao registrar evento", error);
  }
}
