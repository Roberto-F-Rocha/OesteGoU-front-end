import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io: Server | null = null;

export function initSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) return next();

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      socket.data.user = decoded;
      return next();
    } catch {
      return next(new Error("Token inválido"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as any;

    if (user?.id) {
      socket.join(`user_${user.id}`);
    }

    if (user?.role) {
      socket.join(`role_${user.role}`);
    }

    if (user?.cityId) {
      socket.join(`city_${user.cityId}`);
    }

    socket.on("join_user", (userId) => socket.join(`user_${userId}`));
    socket.on("join_city", (cityId) => socket.join(`city_${cityId}`));
    socket.on("join_route", (routeId) => socket.join(`route_${routeId}`));
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitToUser(userId: number, event: string, payload: unknown) {
  io?.to(`user_${userId}`).emit(event, payload);
}

export function emitToCity(cityId: number, event: string, payload: unknown) {
  io?.to(`city_${cityId}`).emit(event, payload);
}

export function emitToRoute(routeId: number, event: string, payload: unknown) {
  io?.to(`route_${routeId}`).emit(event, payload);
}

export function emitToAdmins(event: string, payload: unknown) {
  io?.to("role_admin").emit(event, payload);
}
