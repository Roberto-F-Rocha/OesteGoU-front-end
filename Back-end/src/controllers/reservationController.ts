// ADD THIS NEW FUNCTION
export async function createRoundTripReservation(req, res) {
  const user = req.user;
  const parsed = require("../validators/reservationSchemas").createRoundTripReservationSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
  }

  const { going, returning, dayOfWeek } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // impedir duplicação no mesmo dia
      const existing = await tx.reservation.findFirst({
        where: {
          userId: user.id,
          dayOfWeek,
          status: "confirmed",
          schedule: { type: "ida" },
        },
      });

      if (existing) {
        throw new Error("Você já possui um horário para esse dia");
      }

      const goingSchedule = await tx.schedule.findUnique({ where: { id: going.scheduleId } });
      const returnSchedule = await tx.schedule.findUnique({ where: { id: returning.scheduleId } });

      if (!goingSchedule || !returnSchedule) {
        throw new Error("Horários inválidos");
      }

      if (goingSchedule.type !== "ida" || returnSchedule.type !== "volta") {
        throw new Error("Tipo de rota inválido");
      }

      // criar ida
      const resGoing = await tx.reservation.create({
        data: {
          userId: user.id,
          scheduleId: going.scheduleId,
          routeId: going.routeId,
          pickupPointId: going.pickupPointId,
          dayOfWeek,
          status: "confirmed",
        },
      });

      // criar volta
      const resReturn = await tx.reservation.create({
        data: {
          userId: user.id,
          scheduleId: returning.scheduleId,
          routeId: returning.routeId,
          pickupPointId: returning.pickupPointId,
          dayOfWeek,
          status: "confirmed",
        },
      });

      return { going: resGoing, returning: resReturn };
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Erro ao salvar horário completo" });
  }
}
