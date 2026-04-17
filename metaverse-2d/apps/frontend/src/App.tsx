import React from 'react'
import { useAppSelector } from './hooks'
import LoginDialog from './components/LoginDialog'
import RoomSelectionDialog from './components/RoomSelectionDialog'
import Chat from './components/Chat'

export default function App() {
  const loggedIn = useAppSelector((s) => s.user.loggedIn)
  const roomJoined = useAppSelector((s) => s.room.roomJoined)

  return (
    <>
      {!loggedIn && <LoginDialog />}
      {loggedIn && !roomJoined && <RoomSelectionDialog />}
      {loggedIn && roomJoined && <Chat />}
    </>
  )
}
