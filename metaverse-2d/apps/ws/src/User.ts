import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import type { OutgoingMessage } from "./types";
import client from "@repo/db/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";
import bcrypt from "bcrypt";

function getRandomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Public lobby — virtual space, no DB record required.
const LOBBY_SPACE_ID = "lobby";

// Spawn range for lobby (and regular spaces without an explicit width/height)
// — typical Phaser tilemap pixel coordinates.
const LOBBY_SPAWN_MIN = 500;
const LOBBY_SPAWN_MAX = 900;

// Maximum pixel displacement allowed per move message.
// Prevents teleportation while allowing smooth arcade-physics movement at ~200 px/s.
const MAX_MOVE_DISTANCE = 300;

export class User {
  public id: string;
  public userId?: string;
  public spaceId?: string;
  public x: number;
  public y: number;
  public name: string;
  public anim: string;
  public peerId?: string;
  public videoConnected: boolean;
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.id = getRandomString(10);
    this.x = 0;
    this.y = 0;
    this.name = "";
    this.anim = "adam_idle_down";
    this.videoConnected = false;
    this.ws = ws;
    this.initHandlers();
  }

  initHandlers() {
    this.ws.on("message", async (data) => {
      let parsed: any;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        return;
      }

      switch (parsed.type) {
        case "join":
          await this.handleJoin(parsed.payload);
          break;
        case "move":
          this.handleMove(parsed.payload);
          break;
        case "update-name":
          this.handleUpdateName(parsed.payload);
          break;
        case "chat":
          this.handleChat(parsed.payload);
          break;
        case "video-ready":
          this.handleVideoReady(parsed.payload);
          break;
        case "disconnect-stream":
          this.handleDisconnectStream(parsed.payload);
          break;
        case "connect-to-item":
          this.handleConnectToItem(parsed.payload);
          break;
        case "disconnect-from-item":
          this.handleDisconnectFromItem(parsed.payload);
          break;
        case "stop-screen-share":
          this.handleStopScreenShare(parsed.payload);
          break;
      }
    });
  }

  private async handleJoin(payload: any) {
    const spaceId = payload?.spaceId;
    const token = payload?.token;
    const password = payload?.password;
    const name = payload?.name;
    const anim = payload?.anim;

    // --- JWT verification (always required, even for the lobby) ---
    try {
      const decoded = jwt.verify(token, JWT_PASSWORD) as JwtPayload;
      if (!decoded?.userId) {
        this.ws.close();
        return;
      }
      this.userId = decoded.userId as string;
    } catch {
      this.ws.close();
      return;
    }

    // --- Public lobby: virtual space — skip DB lookup entirely ---
    if (spaceId === LOBBY_SPACE_ID) {
      this.spaceId = LOBBY_SPACE_ID;
      if (typeof name === "string" && name.length > 0) this.name = name;
      if (typeof anim === "string" && anim.length > 0) this.anim = anim;

      this.x = Math.floor(
        Math.random() * (LOBBY_SPAWN_MAX - LOBBY_SPAWN_MIN) + LOBBY_SPAWN_MIN,
      );
      this.y = Math.floor(
        Math.random() * (LOBBY_SPAWN_MAX - LOBBY_SPAWN_MIN) + LOBBY_SPAWN_MIN,
      );

      // Snapshot existing users *before* adding ourselves so we don't
      // include the new user in their own "users already here" list.
      const existing =
        RoomManager.getInstance().getRoomState(LOBBY_SPACE_ID)?.users ?? [];
      RoomManager.getInstance().addUser(LOBBY_SPACE_ID, this);
      const whiteboardRooms =
        RoomManager.getInstance().getWhiteboardRoomIds(LOBBY_SPACE_ID);

      this.send({
        type: "space-joined",
        payload: {
          selfId: this.id,
          spawn: { x: this.x, y: this.y },
          users: existing.map((u) => ({
            id: u.id,
            userId: u.userId,
            x: u.x,
            y: u.y,
            name: u.name,
            anim: u.anim,
            peerId: u.peerId,
          })),
          whiteboardRooms,
        },
      } as any);

      RoomManager.getInstance().broadcast(
        {
          type: "user-joined",
          payload: {
            id: this.id,
            userId: this.userId,
            x: this.x,
            y: this.y,
            name: this.name,
            anim: this.anim,
            peerId: this.peerId,
          },
        } as any,
        this,
        LOBBY_SPACE_ID,
      );
      return;
    }

    // --- Regular space: DB lookup ---
    const space = await client.space.findFirst({ where: { id: spaceId } });
    if (!space) {
      this.ws.close();
      return;
    }

    // Password-protected space check.
    const storedPassword = (space as any).password as string | null | undefined;
    if (storedPassword) {
      if (!password) {
        this.send({
          type: "join-rejected" as any,
          payload: { reason: "Password required" },
        } as OutgoingMessage);
        this.ws.close();
        return;
      }
      const ok = await bcrypt.compare(password, storedPassword);
      if (!ok) {
        this.send({
          type: "join-rejected" as any,
          payload: { reason: "Incorrect password" },
        } as OutgoingMessage);
        this.ws.close();
        return;
      }
    }

    this.spaceId = spaceId;
    if (typeof name === "string" && name.length > 0) this.name = name;
    if (typeof anim === "string" && anim.length > 0) this.anim = anim;

    // Use space dimensions when available; fall back to the lobby spawn range
    // so pixel coordinates are always meaningful regardless of schema version.
    const spawnMaxX =
      typeof space.width === "number" && space.width > 0
        ? space.width
        : LOBBY_SPAWN_MAX;
    const spawnMaxY =
      typeof space.height === "number" && space.height > 0
        ? space.height
        : LOBBY_SPAWN_MAX;

    this.x = Math.floor(Math.random() * spawnMaxX);
    this.y = Math.floor(Math.random() * spawnMaxY);

    const existing =
      RoomManager.getInstance().getRoomState(spaceId)?.users ?? [];
    RoomManager.getInstance().addUser(spaceId, this);
    const whiteboardRooms =
      RoomManager.getInstance().getWhiteboardRoomIds(spaceId);

    this.send({
      type: "space-joined",
      payload: {
        selfId: this.id,
        spawn: { x: this.x, y: this.y },
        users: existing.map((u) => ({
          id: u.id,
          userId: u.userId,
          x: u.x,
          y: u.y,
          name: u.name,
          anim: u.anim,
          peerId: u.peerId,
        })),
        whiteboardRooms,
      },
    } as any);

    RoomManager.getInstance().broadcast(
      {
        type: "user-joined",
        payload: {
          id: this.id,
          userId: this.userId,
          x: this.x,
          y: this.y,
          name: this.name,
          anim: this.anim,
          peerId: this.peerId,
        },
      } as any,
      this,
      this.spaceId!,
    );
  }

  private handleMove(payload: any) {
    if (!this.spaceId) return;

    const moveX = payload?.x;
    const moveY = payload?.y;
    const anim = payload?.anim;

    // Discard non-numeric coordinates
    if (typeof moveX !== "number" || typeof moveY !== "number") return;

    // Allow smooth physics-based movement; only reject blatant teleportation.
    const xDisplacement = Math.abs(this.x - moveX);
    const yDisplacement = Math.abs(this.y - moveY);

    if (
      xDisplacement <= MAX_MOVE_DISTANCE &&
      yDisplacement <= MAX_MOVE_DISTANCE
    ) {
      this.x = moveX;
      this.y = moveY;
      if (typeof anim === "string") this.anim = anim;
      RoomManager.getInstance().broadcast(
        {
          type: "movement",
          payload: { id: this.id, x: this.x, y: this.y, anim: this.anim },
        } as any,
        this,
        this.spaceId!,
      );
      return;
    }

    // Reject large jumps — send the authoritative position back to the client
    this.send({
      type: "movement-rejected",
      payload: { x: this.x, y: this.y },
    } as any);
  }

  private handleUpdateName(payload: any) {
    if (!this.spaceId) return;
    const name = payload?.name;
    if (typeof name !== "string") return;
    this.name = name;
    RoomManager.getInstance().broadcast(
      {
        type: "user-updated",
        payload: { id: this.id, field: "name", value: name },
      } as any,
      this,
      this.spaceId,
    );
  }

  private handleChat(payload: any) {
    if (!this.spaceId) return;
    const content = payload?.content;
    if (typeof content !== "string" || content.length === 0) return;
    RoomManager.getInstance().broadcast(
      {
        type: "chat",
        payload: {
          id: this.id,
          author: this.name || this.id,
          content,
          createdAt: Date.now(),
        },
      } as any,
      null,
      this.spaceId,
    );
  }

  private handleVideoReady(payload: any) {
    if (!this.spaceId) return;
    const peerId = payload?.peerId;
    if (typeof peerId !== "string") return;
    this.peerId = peerId;
    this.videoConnected = true;
    RoomManager.getInstance().broadcast(
      {
        type: "video-ready",
        payload: { id: this.id, peerId },
      } as any,
      this,
      this.spaceId,
    );
  }

  private handleDisconnectStream(payload: any) {
    if (!this.spaceId) return;
    const clientId = payload?.clientId;
    if (typeof clientId !== "string") return;
    RoomManager.getInstance().sendTo(this.spaceId, clientId, {
      type: "disconnect-stream",
      payload: { clientId: this.id },
    } as any);
  }

  private handleConnectToItem(payload: any) {
    if (!this.spaceId) return;
    const itemId = payload?.itemId;
    const itemType = payload?.itemType;
    if (typeof itemId !== "string" || typeof itemType !== "number") return;
    RoomManager.getInstance().addUserToItem(
      this.spaceId,
      itemId,
      itemType,
      this.id,
    );
    if (itemType === 2) {
      const roomId = RoomManager.getInstance().getOrCreateWhiteboardRoomId(
        this.spaceId,
        itemId,
      );
      this.send({
        type: "whiteboard-room",
        payload: { itemId, roomId },
      } as any);
    }
    RoomManager.getInstance().broadcast(
      {
        type: "item-user-added",
        payload: { itemId, itemType, userId: this.id },
      } as any,
      null,
      this.spaceId,
    );
  }

  private handleDisconnectFromItem(payload: any) {
    if (!this.spaceId) return;
    const itemId = payload?.itemId;
    const itemType = payload?.itemType;
    if (typeof itemId !== "string" || typeof itemType !== "number") return;
    RoomManager.getInstance().removeUserFromItem(
      this.spaceId,
      itemId,
      itemType,
      this.id,
    );
    RoomManager.getInstance().broadcast(
      {
        type: "item-user-removed",
        payload: { itemId, itemType, userId: this.id },
      } as any,
      null,
      this.spaceId,
    );
  }

  private handleStopScreenShare(payload: any) {
    if (!this.spaceId) return;
    const itemId = payload?.itemId;
    if (typeof itemId !== "string") return;
    const userIds = RoomManager.getInstance().getItemUsers(
      this.spaceId,
      itemId,
      1,
    );
    userIds.forEach((uid) => {
      if (uid === this.id) return;
      RoomManager.getInstance().sendTo(this.spaceId!, uid, {
        type: "stop-screen-share",
        payload: { clientId: this.id, itemId },
      } as any);
    });
  }

  destroy() {
    if (this.spaceId) {
      RoomManager.getInstance().broadcast(
        {
          type: "user-left",
          payload: { id: this.id, userId: this.userId },
        } as any,
        this,
        this.spaceId,
      );
      RoomManager.getInstance().removeUser(this, this.spaceId);
    }
  }

  send(payload: OutgoingMessage) {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }
}
