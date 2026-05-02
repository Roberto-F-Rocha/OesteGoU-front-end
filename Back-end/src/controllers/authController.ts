import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  signAccessToken,
  signRefreshToken,
} from "../services/tokenService";

function getPhotoUrl(photo?: string | null) {
  if (!photo) return null;
  if (photo.startsWith("db:")) {
    const id = photo.replace("db:", "");
    return `/documents/${id}/view`;
  }
  return photo;
}

export async function login(req, res) {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase() },
  });

  if (!user || !(await bcrypt.compare(senha, user.senha))) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  if (user.status !== "active") {
    return res.status(403).json({
      error: "Usuário não autorizado",
      reason: user.status,
    });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip || req.socket?.remoteAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.nome,
      nome: user.nome,
      email: user.email,
      role: user.role,
      status: user.status,
      cityId: user.cityId,
      photo: getPhotoUrl(user.photo),
    },
  });
}

export async function me(req, res) {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      status: true,
      cityId: true,
      city: true,
      photo: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  return res.json({
    id: user.id,
    name: user.nome,
    nome: user.nome,
    email: user.email,
    role: user.role,
    status: user.status,
    cityId: user.cityId,
    city: user.city,
    photo: getPhotoUrl(user.photo),
  });
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Sem refresh token" });
  }

  try {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error("JWT_REFRESH_SECRET não definido");

    const payload = jwt.verify(refreshToken, secret) as any;

    const session = await prisma.session.findFirst({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: "Sessão inválida ou expirada" });
    }

    if (!session.user || session.user.status !== "active") {
      await prisma.session.deleteMany({ where: { userId: payload.id } });
      return res.status(403).json({ error: "Usuário não autorizado" });
    }

    const accessSecret = process.env.JWT_ACCESS_SECRET;
    if (!accessSecret) throw new Error("JWT_ACCESS_SECRET não definido");

    const newAccessToken = jwt.sign({ id: payload.id }, accessSecret, { expiresIn: "15m" });

    return res.json({ accessToken: newAccessToken });
  } catch {
    return res.status(401).json({ error: "Refresh inválido" });
  }
}

export async function logout(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token é obrigatório" });
  }

  await prisma.session.deleteMany({ where: { refreshToken } });

  return res.status(204).send();
}
