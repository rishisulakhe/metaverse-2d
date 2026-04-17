export interface IPlayer {
  id: string
  userId?: string
  name: string
  x: number
  y: number
  anim: string
  peerId?: string
  videoConnected: boolean
}

export interface IChatMessage {
  author: string
  createdAt: number
  content: string
}
