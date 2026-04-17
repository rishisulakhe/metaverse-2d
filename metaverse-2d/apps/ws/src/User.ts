import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import type { OutgoingMessage } from "./types";
import client from "@repo/db/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";
import bcrypt from "bcrypt";

function getRandomString(length: number) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

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

        const space = await client.space.findFirst({
            where: { id: spaceId },
        });
        if (!space) {
            this.ws.close();
            return;
        }

        // Password-protected space check.
        // `password` field is added via Prisma migration; safely check dynamically.
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

        this.x = Math.floor(Math.random() * space.width);
        this.y = Math.floor(Math.random() * space.height);

        const existing = RoomManager.getInstance().getRoomState(spaceId)?.users ?? [];
        RoomManager.getInstance().addUser(spaceId, this);

        const whiteboardRooms = RoomManager.getInstance().getWhiteboardRoomIds(spaceId);

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
            this.spaceId!
        );
    }

    private handleMove(payload: any) {
        if (!this.spaceId) return;
        const moveX = payload?.x;
        const moveY = payload?.y;
        const anim = payload?.anim;
        const xDisplacement = Math.abs(this.x - moveX);
        const yDisplacement = Math.abs(this.y - moveY);

        if (
            (xDisplacement === 1 && yDisplacement === 0) ||
            (xDisplacement === 0 && yDisplacement === 1)
        ) {
            this.x = moveX;
            this.y = moveY;
            if (typeof anim === "string") this.anim = anim;
            RoomManager.getInstance().broadcast(
                {
                    type: "movement",
                    payload: {
                        id: this.id,
                        x: this.x,
                        y: this.y,
                        anim: this.anim,
                    },
                } as any,
                this,
                this.spaceId!
            );
            return;
        }

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
            this.spaceId
        );
    }

    private handleChat(payload: any) {
        if (!this.spaceId) return;
        const content = payload?.content;
        if (typeof content !== "string" || content.length === 0) return;
        const message = {
            type: "chat",
            payload: {
                id: this.id,
                author: this.name || this.id,
                content,
                createdAt: Date.now(),
            },
        } as any;
        RoomManager.getInstance().broadcast(message, null, this.spaceId);
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
            this.spaceId
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
        RoomManager.getInstance().addUserToItem(this.spaceId, itemId, itemType, this.id);
        // Ensure whiteboard room id is created and broadcast
        if (itemType === 2) {
            const roomId = RoomManager.getInstance().getOrCreateWhiteboardRoomId(
                this.spaceId,
                itemId
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
            this.spaceId
        );
    }

    private handleDisconnectFromItem(payload: any) {
        if (!this.spaceId) return;
        const itemId = payload?.itemId;
        const itemType = payload?.itemType;
        if (typeof itemId !== "string" || typeof itemType !== "number") return;
        RoomManager.getInstance().removeUserFromItem(this.spaceId, itemId, itemType, this.id);
        RoomManager.getInstance().broadcast(
            {
                type: "item-user-removed",
                payload: { itemId, itemType, userId: this.id },
            } as any,
            null,
            this.spaceId
        );
    }

    private handleStopScreenShare(payload: any) {
        if (!this.spaceId) return;
        const itemId = payload?.itemId;
        if (typeof itemId !== "string") return;
        const userIds = RoomManager.getInstance().getItemUsers(this.spaceId, itemId, 1);
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
                this.spaceId
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
