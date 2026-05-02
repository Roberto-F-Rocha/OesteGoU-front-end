import webpush from "web-push";
import { prisma } from "../lib/prisma";

webpush.setVapidDetails(
  "mailto:seuemail@exemplo.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToUser(userId: number, payload: any) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        );
      } catch (err) {
        console.error("Erro push", err);
      }
    })
  );
}
