import {
  ClientMessageType,
  ServerMessageType,
  type OutgoingMessage,
  type SpaceJoinedPayload,
  type UserJoinedPayload,
  type MovementPayload,
  type UserUpdatedPayload,
  type ChatBroadcastPayload,
  type ItemUserPayload,
  type WhiteboardRoomPayload,
} from "@repo/types/Messages";
import { ItemType } from "@repo/types/Items";
import WebRTC from "../web/WebRTC";
import { phaserEvents, Event } from "../events/EventCenter";
import store from "../stores";
import {
  setSessionId,
  setPlayerNameMap,
  removePlayerNameMap,
  setLoggedIn,
  setAuth,
} from "../stores/UserStore";
import { setJoinedRoomData, setRoomJoined } from "../stores/RoomStore"; // setRoomJoined used in handleSpaceJoined
import {
  pushChatMessage,
  pushPlayerJoinedMessage,
  pushPlayerLeftMessage,
} from "../stores/ChatStore";
import { setWhiteboardUrls } from "../stores/WhiteboardStore";
import type { IPlayer } from "@repo/types/OfficeState";

export default class Network {
  private ws?: WebSocket;
  webRTC?: WebRTC;
  mySessionId = "";
  public spawnPosition: { x: number; y: number } | null = null;
  // Players already in the room when we joined — replayed by Game.create()
  public initialPlayers: IPlayer[] = [];

  private spaceId = "";
  private token = "";
  private playerName = "";
  private playerAnim = "adam_idle_down";
  private password?: string;

  // One-shot callbacks waiting for the first space-joined message
  private spaceJoinedCallbacks: Array<() => void> = [];

  constructor() {
    phaserEvents.on(Event.MY_PLAYER_NAME_CHANGE, this.updatePlayerName, this);
    phaserEvents.on(Event.MY_PLAYER_TEXTURE_CHANGE, this.updatePlayer, this);
    phaserEvents.on(
      Event.PLAYER_DISCONNECTED,
      this.playerStreamDisconnect,
      this,
    );
  }

  connect(
    spaceId: string,
    token: string,
    name: string,
    anim: string,
    password?: string,
  ) {
    this.spaceId = spaceId;
    this.token = token;
    this.playerName = name;
    this.playerAnim = anim;
    this.password = password;
    this.spawnPosition = null;
    this.spaceJoinedCallbacks = [];
    this.initialPlayers = [];

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host =
      import.meta.env.VITE_WS_URL ??
      `${proto}://${window.location.hostname}:3001`;
    this.ws = new WebSocket(host);

    this.ws.onopen = () => {
      this.send(ClientMessageType.JOIN, {
        spaceId,
        token,
        name,
        anim,
        ...(password ? { password } : {}),
      });
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg: OutgoingMessage = JSON.parse(ev.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    this.ws.onerror = (e) => console.error("WS error", e);
    this.ws.onclose = (ev) => {
      console.warn("[WS] closed code=", ev.code, "clean=", ev.wasClean);
      // If the connection closed before we ever received space-joined,
      // the token is likely stale/invalid. Force logout so the user
      // signs in again and gets a fresh token.
      if (!this.mySessionId && this.spaceJoinedCallbacks.length > 0) {
        console.error(
          "[WS] closed before space-joined — clearing stale token and forcing re-login",
        );
        this.spaceJoinedCallbacks = [];
        localStorage.removeItem("token");
        store.dispatch(setLoggedIn(false));
        store.dispatch(setAuth({ token: "", username: "" }));
      }
    };
  }

  /**
   * Register a one-shot callback that fires as soon as the server confirms
   * we've joined the space (space-joined message received). Used by Bootstrap
   * to delay launching the Game scene until spawnPosition & mySessionId are set.
   */
  onceSpaceJoined(callback: () => void) {
    this.spaceJoinedCallbacks.push(callback);
  }

  private send(type: ClientMessageType, payload: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  private handleMessage(msg: OutgoingMessage) {
    switch (msg.type) {
      case ServerMessageType.SPACE_JOINED:
        this.handleSpaceJoined(msg.payload);
        break;
      case ServerMessageType.USER_JOINED:
        this.handleUserJoined(msg.payload);
        break;
      case ServerMessageType.USER_LEFT:
        this.handleUserLeft(msg.payload.id);
        break;
      case ServerMessageType.MOVEMENT:
        this.handleMovement(msg.payload);
        break;
      case ServerMessageType.USER_UPDATED:
        this.handleUserUpdated(msg.payload);
        break;
      case ServerMessageType.CHAT:
        this.handleChat(msg.payload);
        break;
      case ServerMessageType.VIDEO_READY:
        phaserEvents.emit(
          Event.PLAYER_UPDATED,
          "readyToConnect",
          true,
          msg.payload.id,
        );
        break;
      case ServerMessageType.DISCONNECT_STREAM:
        this.webRTC?.deleteOnCalledVideoStream(msg.payload.clientId);
        break;
      case ServerMessageType.ITEM_USER_ADDED:
        this.handleItemUserAdded(msg.payload);
        break;
      case ServerMessageType.ITEM_USER_REMOVED:
        this.handleItemUserRemoved(msg.payload);
        break;
      case ServerMessageType.STOP_SCREEN_SHARE:
        store
          .getState()
          .computer.shareScreenManager?.onUserLeft(msg.payload.clientId);
        break;
      case ServerMessageType.WHITEBOARD_ROOM:
        this.handleWhiteboardRoom(msg.payload);
        break;
      case ServerMessageType.JOIN_REJECTED:
        console.warn("Join rejected:", msg.payload.reason);
        break;
      case ServerMessageType.MOVEMENT_REJECTED:
        phaserEvents.emit(
          Event.MOVEMENT_REJECTED,
          msg.payload.x,
          msg.payload.y,
        );
        break;
    }
  }

  private handleSpaceJoined(payload: SpaceJoinedPayload) {
    // Store spawn and session info BEFORE firing callbacks so that
    // Game.create() can read them immediately when the scene launches.
    this.spawnPosition = payload.spawn;
    this.mySessionId = payload.selfId;

    store.dispatch(setSessionId(payload.selfId));
    store.dispatch(setJoinedRoomData({ id: this.spaceId, name: this.spaceId }));

    this.webRTC = new WebRTC(this.mySessionId, this);

    // Store existing players so Game.create() can replay them AFTER
    // registering its onPlayerJoined listener (scene.launch is async).
    this.initialPlayers = payload.users.map((user) => {
      store.dispatch(setPlayerNameMap({ id: user.id, name: user.name }));
      return {
        id: user.id,
        userId: user.userId,
        name: user.name,
        x: user.x,
        y: user.y,
        anim: user.anim,
        peerId: user.peerId,
        videoConnected: false,
      };
    });

    // Fire one-shot callbacks (Bootstrap uses this to launch the Game scene)
    const callbacks = this.spaceJoinedCallbacks.splice(0);
    callbacks.forEach((cb) => cb());

    // Dispatch roomJoined AFTER launching the scene so the RoomSelectionDialog
    // is replaced by the Chat overlay only once the game is actually running.
    store.dispatch(setRoomJoined(true));

    for (const [itemId, roomId] of Object.entries(payload.whiteboardRooms)) {
      store.dispatch(setWhiteboardUrls({ whiteboardId: itemId, roomId }));
    }

    phaserEvents.emit(Event.MY_PLAYER_READY);
  }

  private handleUserJoined(payload: UserJoinedPayload) {
    const player: IPlayer = {
      id: payload.id,
      userId: payload.userId,
      name: payload.name,
      x: payload.x,
      y: payload.y,
      anim: payload.anim,
      peerId: payload.peerId,
      videoConnected: false,
    };
    store.dispatch(setPlayerNameMap({ id: payload.id, name: payload.name }));
    store.dispatch(pushPlayerJoinedMessage(payload.name));
    phaserEvents.emit(Event.PLAYER_JOINED, player, payload.id);
  }

  private handleUserLeft(id: string) {
    const name = store.getState().user.playerNameMap.get(id) ?? id;
    phaserEvents.emit(Event.PLAYER_LEFT, id);
    this.webRTC?.deleteVideoStream(id);
    this.webRTC?.deleteOnCalledVideoStream(id);
    store.dispatch(pushPlayerLeftMessage(name));
    store.dispatch(removePlayerNameMap(id));
  }

  private handleMovement(payload: MovementPayload) {
    phaserEvents.emit(Event.PLAYER_UPDATED, "x", payload.x, payload.id);
    phaserEvents.emit(Event.PLAYER_UPDATED, "y", payload.y, payload.id);
    if (payload.anim)
      phaserEvents.emit(Event.PLAYER_UPDATED, "anim", payload.anim, payload.id);
  }

  private handleUserUpdated(payload: UserUpdatedPayload) {
    phaserEvents.emit(
      Event.PLAYER_UPDATED,
      payload.field,
      payload.value,
      payload.id,
    );
  }

  private handleChat(payload: ChatBroadcastPayload) {
    store.dispatch(
      pushChatMessage({
        author: payload.author,
        content: payload.content,
        createdAt: payload.createdAt,
      }),
    );
    phaserEvents.emit(Event.UPDATE_DIALOG_BUBBLE, payload.id, payload.content);
  }

  private handleItemUserAdded(payload: ItemUserPayload) {
    phaserEvents.emit(
      Event.ITEM_USER_ADDED,
      payload.userId,
      payload.itemId,
      payload.itemType,
    );
  }

  private handleItemUserRemoved(payload: ItemUserPayload) {
    phaserEvents.emit(
      Event.ITEM_USER_REMOVED,
      payload.userId,
      payload.itemId,
      payload.itemType,
    );
  }

  private handleWhiteboardRoom(payload: WhiteboardRoomPayload) {
    store.dispatch(
      setWhiteboardUrls({
        whiteboardId: payload.itemId,
        roomId: payload.roomId,
      }),
    );
  }

  onPlayerJoined(
    callback: (player: IPlayer, id: string) => void,
    context?: unknown,
  ) {
    phaserEvents.on(Event.PLAYER_JOINED, callback, context);
  }

  onPlayerLeft(callback: (id: string) => void, context?: unknown) {
    phaserEvents.on(Event.PLAYER_LEFT, callback, context);
  }

  onMyPlayerReady(callback: () => void, context?: unknown) {
    phaserEvents.on(Event.MY_PLAYER_READY, callback, context);
  }

  onMyPlayerVideoConnected(callback: () => void, context?: unknown) {
    phaserEvents.on(Event.MY_PLAYER_VIDEO_CONNECTED, callback, context);
  }

  onPlayerUpdated(
    callback: (
      field: string,
      value: number | string | boolean,
      id: string,
    ) => void,
    context?: unknown,
  ) {
    phaserEvents.on(Event.PLAYER_UPDATED, callback, context);
  }

  onItemUserAdded(
    callback: (userId: string, itemId: string, itemType: ItemType) => void,
    context?: unknown,
  ) {
    phaserEvents.on(Event.ITEM_USER_ADDED, callback, context);
  }

  onItemUserRemoved(
    callback: (userId: string, itemId: string, itemType: ItemType) => void,
    context?: unknown,
  ) {
    phaserEvents.on(Event.ITEM_USER_REMOVED, callback, context);
  }

  onChatMessageAdded(
    callback: (playerId: string, content: string) => void,
    context?: unknown,
  ) {
    phaserEvents.on(Event.UPDATE_DIALOG_BUBBLE, callback, context);
  }

  updatePlayer(x: number, y: number, anim: string) {
    this.send(ClientMessageType.MOVE, { x, y, anim });
  }

  updatePlayerName(name: string) {
    this.send(ClientMessageType.UPDATE_NAME, { name });
  }

  readyToConnect() {
    this.send(ClientMessageType.VIDEO_READY, { peerId: this.mySessionId });
    phaserEvents.emit(Event.MY_PLAYER_READY);
  }

  videoConnected() {
    this.send(ClientMessageType.VIDEO_READY, { peerId: this.mySessionId });
    phaserEvents.emit(Event.MY_PLAYER_VIDEO_CONNECTED);
  }

  playerStreamDisconnect(id: string) {
    this.send(ClientMessageType.DISCONNECT_STREAM, { clientId: id });
    this.webRTC?.deleteVideoStream(id);
  }

  connectToComputer(id: string) {
    this.send(ClientMessageType.CONNECT_TO_ITEM, {
      itemId: id,
      itemType: ItemType.COMPUTER,
    });
  }

  disconnectFromComputer(id: string) {
    this.send(ClientMessageType.DISCONNECT_FROM_ITEM, {
      itemId: id,
      itemType: ItemType.COMPUTER,
    });
  }

  connectToWhiteboard(id: string) {
    this.send(ClientMessageType.CONNECT_TO_ITEM, {
      itemId: id,
      itemType: ItemType.WHITEBOARD,
    });
  }

  disconnectFromWhiteboard(id: string) {
    this.send(ClientMessageType.DISCONNECT_FROM_ITEM, {
      itemId: id,
      itemType: ItemType.WHITEBOARD,
    });
  }

  onStopScreenShare(id: string) {
    this.send(ClientMessageType.STOP_SCREEN_SHARE, { itemId: id });
  }

  addChatMessage(content: string) {
    this.send(ClientMessageType.CHAT, { content });
  }

  disconnect() {
    this.ws?.close();
  }
}
