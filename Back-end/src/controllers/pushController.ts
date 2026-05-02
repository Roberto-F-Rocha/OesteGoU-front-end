import { prisma } from "../lib/prisma";

export async function subscribePush(req, res) {
  const userId = req.user.id;
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Subscription inválida" });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    create: {
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return res.status(201).json({ message: "Dispositivo registrado para push" });
}

export async function unsubscribePush(req, res) {
  const userId = req.user.id;
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: "Endpoint obrigatório" });
  }

  await prisma.pushSubscription.deleteMany({
    where: {
      userId,
      endpoint,
    },
  });

  return res.status(204).send();
}
