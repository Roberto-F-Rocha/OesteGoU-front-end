import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { sendPushToUser } from "../services/pushService";

export function startPushJobs() {
  cron.schedule("0 18 * * *", async () => {
    try {
      const reservations = await prisma.reservation.findMany({
        where: { status: "confirmed" },
      });

      for (const r of reservations) {
        await sendPushToUser(r.userId, {
          title: "Sua viagem é amanhã",
          body: "Não esqueça do seu transporte!",
          url: "/student/trip",
        });
      }

      console.log("Push automático enviado");
    } catch (err) {
      console.error("Erro no cron de push", err);
    }
  });
}
