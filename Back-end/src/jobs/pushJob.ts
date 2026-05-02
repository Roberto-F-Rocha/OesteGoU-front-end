import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { sendPushToUser } from "../services/pushService";
import { emitToUser } from "../lib/socket";

export function startPushJobs() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const reservations = await prisma.reservation.findMany({
        where: { status: "confirmed" },
        include: { schedule: true },
      });

      const now = new Date();

      for (const r of reservations) {
        if (!r.schedule?.time) continue;

        const [hour, minute] = r.schedule.time.split(":");

        const tripTime = new Date();
        tripTime.setHours(Number(hour), Number(minute), 0);

        const diff = tripTime.getTime() - now.getTime();

        if (diff > 0 && diff <= 60 * 60 * 1000) {
          await sendPushToUser(r.userId, {
            title: "Sua viagem está próxima",
            body: "Seu ônibus sai em breve!",
            url: "/student/trip",
          });

          emitToUser(r.userId, "trip:reminder", {
            message: "Seu ônibus sai em breve!",
            scheduleId: r.scheduleId,
          });
        }
      }

      console.log("Verificação de lembretes executada");
    } catch (err) {
      console.error("Erro no cron de lembrete", err);
    }
  });
}
