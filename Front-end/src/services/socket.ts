import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: localStorage.getItem("oestegou:accessToken"),
  },
});

export function connectSocket() {
  socket.auth = { token: localStorage.getItem("oestegou:accessToken") };
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}

export function refreshSocketToken() {
  socket.auth = { token: localStorage.getItem("oestegou:accessToken") };
  if (socket.connected) {
    socket.disconnect();
    socket.connect();
  }
}
