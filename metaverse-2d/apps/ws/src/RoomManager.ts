import type { User } from "./User";
import type { OutgoingMessage } from "./types";

export interface ItemState {
  connectedUsers: Set<string>
}

export interface WhiteboardState extends ItemState {
  roomId: string
}

export interface RoomState {
  users: User[]
  computers: Map<string, ItemState>
  whiteboards: Map<string, WhiteboardState>
}

function randomString(length: number) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export class RoomManager {
  public rooms: Map<string, User[]> = new Map();
  private state: Map<string, RoomState> = new Map();
  static instance: RoomManager;

  private constructor() { }

  static getInstance() {
    if (!this.instance) {
      this.instance = new RoomManager();
    }
    return this.instance;
  }

  private ensureRoom(spaceId: string): RoomState {
    let room = this.state.get(spaceId);
    if (!room) {
      room = { users: [], computers: new Map(), whiteboards: new Map() };
      this.state.set(spaceId, room);
    }
    return room;
  }

  public getRoomState(spaceId: string): RoomState | undefined {
    return this.state.get(spaceId);
  }

  public addUser(spaceId: string, user: User) {
    const room = this.ensureRoom(spaceId);
    room.users.push(user);
    this.rooms.set(spaceId, room.users);
  }

  public removeUser(user: User, spaceId: string) {
    const room = this.state.get(spaceId);
    if (!room) return;
    room.users = room.users.filter((u) => u.id !== user.id);
    room.computers.forEach((c) => c.connectedUsers.delete(user.id));
    room.whiteboards.forEach((w) => w.connectedUsers.delete(user.id));
    if (room.users.length === 0) {
      this.state.delete(spaceId);
      this.rooms.delete(spaceId);
    } else {
      this.rooms.set(spaceId, room.users);
    }
  }

  public broadcast(message: OutgoingMessage, sender: User | null, spaceId: string) {
    const room = this.state.get(spaceId);
    if (!room) return;
    room.users.forEach((u) => {
      if (!sender || u.id !== sender.id) {
        u.send(message);
      }
    });
  }

  public sendTo(spaceId: string, targetUserId: string, message: OutgoingMessage) {
    const room = this.state.get(spaceId);
    if (!room) return;
    const target = room.users.find((u) => u.id === targetUserId);
    target?.send(message);
  }

  public getOrCreateWhiteboardRoomId(spaceId: string, itemId: string): string {
    const room = this.ensureRoom(spaceId);
    let wb = room.whiteboards.get(itemId);
    if (!wb) {
      wb = { roomId: randomString(12), connectedUsers: new Set() };
      room.whiteboards.set(itemId, wb);
    }
    return wb.roomId;
  }

  public getWhiteboardRoomIds(spaceId: string): Record<string, string> {
    const room = this.state.get(spaceId);
    const out: Record<string, string> = {};
    if (!room) return out;
    room.whiteboards.forEach((wb, id) => (out[id] = wb.roomId));
    return out;
  }

  public addUserToItem(spaceId: string, itemId: string, itemType: number, userId: string) {
    const room = this.ensureRoom(spaceId);
    if (itemType === 1 /* COMPUTER */) {
      let comp = room.computers.get(itemId);
      if (!comp) {
        comp = { connectedUsers: new Set() };
        room.computers.set(itemId, comp);
      }
      comp.connectedUsers.add(userId);
    } else if (itemType === 2 /* WHITEBOARD */) {
      let wb = room.whiteboards.get(itemId);
      if (!wb) {
        wb = { roomId: randomString(12), connectedUsers: new Set() };
        room.whiteboards.set(itemId, wb);
      }
      wb.connectedUsers.add(userId);
    }
  }

  public removeUserFromItem(spaceId: string, itemId: string, itemType: number, userId: string) {
    const room = this.state.get(spaceId);
    if (!room) return;
    if (itemType === 1) {
      room.computers.get(itemId)?.connectedUsers.delete(userId);
    } else if (itemType === 2) {
      room.whiteboards.get(itemId)?.connectedUsers.delete(userId);
    }
  }

  public getItemUsers(spaceId: string, itemId: string, itemType: number): string[] {
    const room = this.state.get(spaceId);
    if (!room) return [];
    if (itemType === 1) {
      return Array.from(room.computers.get(itemId)?.connectedUsers ?? []);
    }
    if (itemType === 2) {
      return Array.from(room.whiteboards.get(itemId)?.connectedUsers ?? []);
    }
    return [];
  }
}
