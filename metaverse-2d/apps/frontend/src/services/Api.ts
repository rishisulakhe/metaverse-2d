import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface SignupBody { username: string; password: string; type: 'user' | 'admin' }
export interface SigninBody { username: string; password: string }

export async function signup(body: SignupBody) {
  const res = await api.post<{ userId: string }>('/user/signup', body)
  return res.data
}

export async function signin(body: SigninBody) {
  const res = await api.post<{ token: string }>('/user/signin', body)
  return res.data
}

export interface SpaceInfo {
  id: string
  name: string
  dimensions: string
  thumbnail: string | null
  hasPassword: boolean
}

export async function getPublicSpaces() {
  const res = await api.get<{ spaces: SpaceInfo[] }>('/space/public')
  return res.data.spaces
}

export async function getMySpaces() {
  const res = await api.get<{ spaces: SpaceInfo[] }>('/space/all')
  return res.data.spaces
}

export interface CreateSpaceBody {
  name: string
  dimensions: string
  mapId?: string
  password?: string
}

export async function createSpace(body: CreateSpaceBody) {
  const res = await api.post<{ spaceId: string }>('/space', body)
  return res.data
}

export async function getAvatars() {
  const res = await api.get<{ avatars: Array<{ id: string; imageUrl: string | null; name: string | null }> }>('/user/metadata/bulk?ids=')
  return res.data.avatars
}

export default api
