import React, { useRef, useState, useEffect } from 'react'
import styled from 'styled-components'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import CloseIcon from '@mui/icons-material/Close'
import phaserGame from '../PhaserGame'
import type Game from '../scenes/Game'
import { getColorByString } from '../util'
import { useAppDispatch, useAppSelector } from '../hooks'
import { MessageType, setFocused, setShowChat } from '../stores/ChatStore'
import type { IChatMessage } from '@repo/types/OfficeState'

const Backdrop = styled.div`
  position: fixed;
  bottom: 60px;
  left: 0;
  height: 400px;
  width: 500px;
  max-height: 50%;
  max-width: 100%;
  z-index: 150;
`

const Wrapper = styled.div`
  position: relative;
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
`

const FabWrapper = styled.div`
  margin-top: auto;
`

const ChatHeader = styled.div`
  position: relative;
  height: 35px;
  background: #000000a7;
  border-radius: 10px 10px 0 0;
  h3 { color: #fff; margin: 7px; font-size: 17px; text-align: center; }
  .close { position: absolute; top: 0; right: 0; }
`

const ChatBox = styled(Box)`
  height: 100%;
  overflow: auto;
  background: #2c2c2c;
  border: 1px solid #00000029;
`

const MessageWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding: 0 2px;
  p {
    margin: 3px;
    font-size: 15px;
    font-weight: bold;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  span { color: white; font-weight: normal; }
  .notification { color: grey; font-weight: normal; }
  :hover { background: #3a3a3a; }
`

const InputWrapper = styled.form`
  border: 1px solid #42eacb;
  border-radius: 0 0 10px 10px;
  display: flex;
  background: linear-gradient(180deg, #000000c1, #242424c0);
`

const dateFormatter = new Intl.DateTimeFormat('en', { timeStyle: 'short', dateStyle: 'short' })

function Message({
  chatMessage,
  messageType,
}: {
  chatMessage: IChatMessage
  messageType: MessageType
}) {
  const [tip, setTip] = useState(false)
  return (
    <MessageWrapper onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
      <Tooltip open={tip} title={dateFormatter.format(chatMessage.createdAt)} placement="right" arrow>
        {messageType === MessageType.REGULAR_MESSAGE ? (
          <p style={{ color: getColorByString(chatMessage.author) }}>
            {chatMessage.author}: <span>{chatMessage.content}</span>
          </p>
        ) : (
          <p className="notification">
            {chatMessage.author} {chatMessage.content}
          </p>
        )}
      </Tooltip>
    </MessageWrapper>
  )
}

export default function Chat() {
  const [inputValue, setInputValue] = useState('')
  const [readyToSubmit, setReadyToSubmit] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatMessages = useAppSelector((s) => s.chat.chatMessages)
  const focused = useAppSelector((s) => s.chat.focused)
  const showChat = useAppSelector((s) => s.chat.showChat)
  const dispatch = useAppDispatch()

  const getGame = () => phaserGame.scene.keys.game as Game

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!readyToSubmit) { setReadyToSubmit(true); return }
    inputRef.current?.blur()
    const val = inputValue.trim()
    setInputValue('')
    if (val) {
      const game = getGame()
      game?.network?.addChatMessage(val)
      game?.myPlayer?.updateDialogBubble(val)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur()
      dispatch(setShowChat(false))
    }
  }

  useEffect(() => {
    if (focused) inputRef.current?.focus()
  }, [focused])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, showChat])

  return (
    <Backdrop>
      <Wrapper>
        {showChat ? (
          <>
            <ChatHeader>
              <h3>Chat</h3>
              <IconButton className="close" onClick={() => dispatch(setShowChat(false))} size="small">
                <CloseIcon />
              </IconButton>
            </ChatHeader>
            <ChatBox>
              {chatMessages.map(({ messageType, chatMessage }, i) => (
                <Message key={i} chatMessage={chatMessage} messageType={messageType} />
              ))}
              <div ref={messagesEndRef} />
            </ChatBox>
            <InputWrapper onSubmit={handleSubmit}>
              <InputBase
                inputRef={inputRef}
                fullWidth
                placeholder="Press Enter to chat"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (!focused) { dispatch(setFocused(true)); setReadyToSubmit(true) } }}
                onBlur={() => { dispatch(setFocused(false)); setReadyToSubmit(false) }}
                sx={{ input: { padding: '5px', color: '#fff' } }}
              />
            </InputWrapper>
          </>
        ) : (
          <FabWrapper>
            <Fab
              color="secondary"
              onClick={() => { dispatch(setShowChat(true)); dispatch(setFocused(true)) }}
            >
              <ChatBubbleOutlineIcon />
            </Fab>
          </FabWrapper>
        )}
      </Wrapper>
    </Backdrop>
  )
}
