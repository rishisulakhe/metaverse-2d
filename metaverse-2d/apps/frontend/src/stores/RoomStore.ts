import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AvailableRoom {
  id: string
  name: string
  dimensions: string
  thumbnail?: string | null
  hasPassword: boolean
}

export const roomSlice = createSlice({
  name: 'room',
  initialState: {
    lobbyJoined: true,
    roomJoined: false,
    roomId: '',
    roomName: '',
    roomDescription: '',
    availableRooms: new Array<AvailableRoom>(),
  },
  reducers: {
    setLobbyJoined: (state, action: PayloadAction<boolean>) => {
      state.lobbyJoined = action.payload
    },
    setRoomJoined: (state, action: PayloadAction<boolean>) => {
      state.roomJoined = action.payload
    },
    setJoinedRoomData: (
      state,
      action: PayloadAction<{ id: string; name: string; description?: string }>
    ) => {
      state.roomId = action.payload.id
      state.roomName = action.payload.name
      state.roomDescription = action.payload.description ?? ''
    },
    setAvailableRooms: (state, action: PayloadAction<AvailableRoom[]>) => {
      state.availableRooms = action.payload
    },
  },
})

export const { setLobbyJoined, setRoomJoined, setJoinedRoomData, setAvailableRooms } =
  roomSlice.actions

export default roomSlice.reducer
