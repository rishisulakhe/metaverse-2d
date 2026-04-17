import React from 'react'
import { useAppSelector } from './hooks'
import LoginDialog from './components/LoginDialog'
import RoomSelectionDialog from './components/RoomSelectionDialog'
import Chat from './components/Chat'
import WhiteboardDialog from './components/WhiteboardDialog'
import ComputerDialog from './components/ComputerDialog'

export default function App() {
  const loggedIn = useAppSelector((s) => s.user.loggedIn)
  const roomJoined = useAppSelector((s) => s.room.roomJoined)
  const whiteboardOpen = useAppSelector((s) => s.whiteboard.whiteboardDialogOpen)
  const computerOpen = useAppSelector((s) => s.computer.computerDialogOpen)

  return (
    <>
      {!loggedIn && <LoginDialog />}
      {loggedIn && !roomJoined && <RoomSelectionDialog />}
      {loggedIn && roomJoined && <Chat />}
      {whiteboardOpen && <WhiteboardDialog />}
      {computerOpen && <ComputerDialog />}
    </>
  )
}
