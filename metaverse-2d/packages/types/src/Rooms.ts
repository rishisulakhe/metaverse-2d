export interface IRoomData {
  name: string
  description?: string
  password?: string | null
}

export interface ISpaceListItem {
  id: string
  name: string
  thumbnail?: string | null
  dimensions: string
  hasPassword?: boolean
}
