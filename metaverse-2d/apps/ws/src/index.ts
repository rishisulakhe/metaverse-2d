import { WebSocket, WebSocketServer } from "ws";
import { User } from "./User";

const PORT = parseInt(process.env.WS_PORT ?? "3001");
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server listening on ws://localhost:${PORT}`);

// Track aliveness for keepalive ping
interface AliveWS extends WebSocket {
  isAlive: boolean;
}

wss.on("connection", function connection(ws: WebSocket, req) {
  const socket = ws as AliveWS;
  socket.isAlive = true;

  console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);

  const user = new User(ws);

  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("error", (err) => {
    console.error(`[WS] Socket error for ${user.id}:`, err.message);
  });

  socket.on("close", (code, reason) => {
    console.log(
      `[WS] Client disconnected: ${user.id} (code=${code}${reason.length ? " reason=" + reason.toString() : ""})`,
    );
    user.destroy();
  });
});

// Keepalive: ping every 30 s; terminate connections that never ponged back.
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const socket = ws as AliveWS;
    if (!socket.isAlive) {
      socket.terminate();
      return;
    }
    socket.isAlive = false;
    socket.ping();
  });
}, 30_000);

wss.on("close", () => clearInterval(pingInterval));
