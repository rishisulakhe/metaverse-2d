export enum ClientMessageType {
  JOIN = 'join',
  MOVE = 'move',
  UPDATE_NAME = 'update-name',
  CHAT = 'chat',
  VIDEO_READY = 'video-ready',
  DISCONNECT_STREAM = 'disconnect-stream',
  CONNECT_TO_ITEM = 'connect-to-item',
  DISCONNECT_FROM_ITEM = 'disconnect-from-item',
  STOP_SCREEN_SHARE = 'stop-screen-share',
}

export enum ServerMessageType {
  SPACE_JOINED = 'space-joined',
  USER_JOINED = 'user-joined',
  USER_LEFT = 'user-left',
  MOVEMENT = 'movement',
  MOVEMENT_REJECTED = 'movement-rejected',
  USER_UPDATED = 'user-updated',
  CHAT = 'chat',
  VIDEO_READY = 'video-ready',
  DISCONNECT_STREAM = 'disconnect-stream',
  ITEM_USER_ADDED = 'item-user-added',
  ITEM_USER_REMOVED = 'item-user-removed',
  STOP_SCREEN_SHARE = 'stop-screen-share',
  WHITEBOARD_ROOM = 'whiteboard-room',
  JOIN_REJECTED = 'join-rejected',
}

export interface JoinPayload {
  spaceId: string
  token: string
  name?: string
  anim?: string
  password?: string
}

export interface MovePayload {
  x: number
  y: number
  anim?: string
}

export interface UpdateNamePayload {
  name: string
}

export interface ChatPayload {
  content: string
}

export interface VideoReadyPayload {
  peerId: string
}

export interface DisconnectStreamPayload {
  clientId: string
}

export interface ItemPayload {
  itemId: string
  itemType: number
}

export interface StopScreenSharePayload {
  itemId: string
}

export interface SpaceJoinedPayload {
  selfId: string
  spawn: { x: number; y: number }
  users: Array<{
    id: string
    userId?: string
    x: number
    y: number
    name: string
    anim: string
    peerId?: string
  }>
  whiteboardRooms: Record<string, string>
}

export interface UserJoinedPayload {
  id: string
  userId?: string
  x: number
  y: number
  name: string
  anim: string
  peerId?: string
}

export interface UserLeftPayload {
  id: string
  userId?: string
}

export interface MovementPayload {
  id: string
  x: number
  y: number
  anim?: string
}

export interface UserUpdatedPayload {
  id: string
  field: 'name' | 'anim' | 'peerId' | 'videoConnected'
  value: string | boolean
}

export interface ChatBroadcastPayload {
  id: string
  author: string
  content: string
  createdAt: number
}

export interface ItemUserPayload {
  itemId: string
  itemType: number
  userId: string
}

export interface WhiteboardRoomPayload {
  itemId: string
  roomId: string
}

export interface JoinRejectedPayload {
  reason: string
}

export type OutgoingMessage =
  | { type: ServerMessageType.SPACE_JOINED; payload: SpaceJoinedPayload }
  | { type: ServerMessageType.USER_JOINED; payload: UserJoinedPayload }
  | { type: ServerMessageType.USER_LEFT; payload: UserLeftPayload }
  | { type: ServerMessageType.MOVEMENT; payload: MovementPayload }
  | { type: ServerMessageType.MOVEMENT_REJECTED; payload: { x: number; y: number } }
  | { type: ServerMessageType.USER_UPDATED; payload: UserUpdatedPayload }
  | { type: ServerMessageType.CHAT; payload: ChatBroadcastPayload }
  | { type: ServerMessageType.VIDEO_READY; payload: { id: string; peerId: string } }
  | { type: ServerMessageType.DISCONNECT_STREAM; payload: { clientId: string } }
  | { type: ServerMessageType.ITEM_USER_ADDED; payload: ItemUserPayload }
  | { type: ServerMessageType.ITEM_USER_REMOVED; payload: ItemUserPayload }
  | { type: ServerMessageType.STOP_SCREEN_SHARE; payload: { clientId: string; itemId: string } }
  | { type: ServerMessageType.WHITEBOARD_ROOM; payload: WhiteboardRoomPayload }
  | { type: ServerMessageType.JOIN_REJECTED; payload: JoinRejectedPayload }

export type IncomingMessage =
  | { type: ClientMessageType.JOIN; payload: JoinPayload }
  | { type: ClientMessageType.MOVE; payload: MovePayload }
  | { type: ClientMessageType.UPDATE_NAME; payload: UpdateNamePayload }
  | { type: ClientMessageType.CHAT; payload: ChatPayload }
  | { type: ClientMessageType.VIDEO_READY; payload: VideoReadyPayload }
  | { type: ClientMessageType.DISCONNECT_STREAM; payload: DisconnectStreamPayload }
  | { type: ClientMessageType.CONNECT_TO_ITEM; payload: ItemPayload }
  | { type: ClientMessageType.DISCONNECT_FROM_ITEM; payload: ItemPayload }
  | { type: ClientMessageType.STOP_SCREEN_SHARE; payload: StopScreenSharePayload }
